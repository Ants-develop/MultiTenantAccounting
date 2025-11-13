import express, { type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { db } from "../db";
import { rsUsers, companies, type RsUser } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from "../services/activity-logger";
import { DEFAULT_CLIENT_ID } from "../constants";

const router = express.Router();

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  trimValues: true,
});

const SOAP_ENDPOINTS = {
  mainUser: "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx",
  serviceUser: "https://services.rs.ge/WayBillService/WayBillService.asmx",
};

const mainCredentialsSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const serviceCredentialsSchema = z.object({
  serviceUser: z.string().min(1, "Service user is required"),
  servicePassword: z.string().min(1, "Service password is required"),
});

const credentialsBaseSchema = z.object({
  mainUser: z.string().min(1, "Main user is required"),
  serviceUser: z.string().min(1, "Service user is required"),
  companyTin: z.string().min(1, "Company TIN is required").max(20, "Company TIN is too long"),
  companyName: z.string().min(1, "Company name is required"),
  rsUserId: z.string().optional(),
  unId: z.string().optional(),
});

const createCredentialsSchema = credentialsBaseSchema.extend({
  mainPassword: z.string().min(6, "Main password must be at least 6 characters"),
  servicePassword: z.string().min(6, "Service password must be at least 6 characters"),
});

const updateCredentialsSchema = credentialsBaseSchema.extend({
  mainPassword: z.string().min(6).optional(),
  servicePassword: z.string().min(6).optional(),
});

type RsUserInsert = typeof rsUsers.$inferInsert;

type CredentialRow = RsUser & {
  companyCode?: string | null;
  companyDisplayName?: string | null;
};

const ensureArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
};

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const callSoap = async (options: {
  url: string;
  body: string;
  action?: string;
  contentType?: string;
  timeoutMs?: number;
}): Promise<string> => {
  const { url, body, action, contentType = "text/xml; charset=utf-8", timeoutMs = 30000 } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      body,
      headers: {
        "Content-Type": contentType,
        ...(action ? { SOAPAction: action } : {}),
      },
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`SOAP request failed (${response.status}): ${responseText.slice(0, 200)}`);
    }

    return responseText;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("SOAP request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const sanitizeCredential = (record: CredentialRow) => ({
  id: record.id,
  clientId: record.clientId,
  companyName: record.companyDisplayName ?? record.companyName ?? null,
  companyTin: record.companyTin ?? null,
  mainUser: record.mainUser ?? null,
  serviceUser: record.sUser ?? null,
  rsUserId: record.userId ?? null,
  unId: record.unId ?? null,
  createdAt: record.createdAt ?? null,
  updatedAt: record.updatedAt ?? null,
});

const parseSoapBody = (xml: string, operation: string) => {
  const parsed = parser.parse(xml);
  const body = parsed?.Envelope?.Body;

  if (!body) {
    throw new Error(`Invalid SOAP envelope for ${operation}`);
  }

  if (body.Fault) {
    const message = body.Fault.faultstring || body.Fault.faultcode || `SOAP fault during ${operation}`;
    throw new Error(message);
  }

  return body;
};

const validateMainUserCredentials = async (username: string, password: string) => {
  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                   xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <get_ser_users xmlns="http://tempuri.org/">
          <user_name>${escapeXml(username)}</user_name>
          <user_password>${escapeXml(password)}</user_password>
        </get_ser_users>
      </soap:Body>
    </soap:Envelope>`;

  const xml = await callSoap({
    url: SOAP_ENDPOINTS.mainUser,
    body: soapBody,
    action: "http://tempuri.org/get_ser_users",
  });

  const body = parseSoapBody(xml, "get_ser_users");
  const response = body.get_ser_usersResponse;

  if (!response) {
    throw new Error("Unexpected response from RS service when validating main user");
  }

  const rsUserId: string | null = response.user_id ?? response.userId ?? null;
  const diffgram = response.get_ser_usersResult?.diffgram;
  const documentElement = diffgram?.DocumentElement ?? diffgram?.NewDataSet;
  const users = ensureArray(documentElement?.users);

  const serviceUsers = users
    .map((item: any) => item?.USER_NAME ?? item?.user_name ?? item?.UserName ?? item?.userName)
    .filter((name: unknown): name is string => typeof name === "string" && name.trim().length > 0)
    .map((name) => name.trim());

  if (serviceUsers.length === 0) {
    throw new Error("No service users returned. Please verify main user credentials or ensure service users are configured in RS.ge");
  }

  return {
    serviceUsers,
    rsUserId,
  };
};

const validateServiceUserCredentials = async (serviceUser: string, servicePassword: string) => {
  const checkBody = `<?xml version="1.0" encoding="utf-8"?>
    <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                     xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                     xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
      <soap12:Body>
        <chek_service_user xmlns="http://tempuri.org/">
          <su>${escapeXml(serviceUser)}</su>
          <sp>${escapeXml(servicePassword)}</sp>
        </chek_service_user>
      </soap12:Body>
    </soap12:Envelope>`;

  const checkXml = await callSoap({
    url: SOAP_ENDPOINTS.serviceUser,
    body: checkBody,
    contentType: "application/soap+xml; charset=utf-8",
  });

  const checkResponseBody = parseSoapBody(checkXml, "chek_service_user");
  const checkResponse = checkResponseBody.chek_service_userResponse;

  if (!checkResponse) {
    throw new Error("Unexpected response while validating service credentials");
  }

  const resultValue = String(checkResponse.chek_service_userResult ?? "").toLowerCase();
  if (resultValue !== "true" && resultValue !== "1") {
    throw new Error("Service user credentials are invalid");
  }

  const unId = checkResponse.un_id ?? checkResponse.unId;
  const serviceUserId = checkResponse.s_user_id ?? checkResponse.sUserId ?? null;

  if (!unId) {
    throw new Error("Response did not include UN_ID for the service user");
  }

  const tinBody = `<?xml version="1.0" encoding="utf-8"?>
    <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                     xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                     xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
      <soap12:Body>
        <get_tin_from_un_id xmlns="http://tempuri.org/">
          <su>${escapeXml(serviceUser)}</su>
          <sp>${escapeXml(servicePassword)}</sp>
          <un_id>${escapeXml(String(unId))}</un_id>
        </get_tin_from_un_id>
      </soap12:Body>
    </soap12:Envelope>`;

  const tinXml = await callSoap({
    url: SOAP_ENDPOINTS.serviceUser,
    body: tinBody,
    contentType: "application/soap+xml; charset=utf-8",
  });

  const tinResponseBody = parseSoapBody(tinXml, "get_tin_from_un_id");
  const tinResponse = tinResponseBody.get_tin_from_un_idResponse;

  if (!tinResponse) {
    throw new Error("Could not resolve company TIN for the service user");
  }

  const companyTin = tinResponse.get_tin_from_un_idResult ?? tinResponse.tin ?? "";

  if (!companyTin) {
    throw new Error("The RS service did not return a company TIN for the service user");
  }

  const nameBody = `<?xml version="1.0" encoding="utf-8"?>
    <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                     xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                     xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
      <soap12:Body>
        <get_name_from_tin xmlns="http://tempuri.org/">
          <su>${escapeXml(serviceUser)}</su>
          <sp>${escapeXml(servicePassword)}</sp>
          <tin>${escapeXml(String(companyTin))}</tin>
        </get_name_from_tin>
      </soap12:Body>
    </soap12:Envelope>`;

  const nameXml = await callSoap({
    url: SOAP_ENDPOINTS.serviceUser,
    body: nameBody,
    contentType: "application/soap+xml; charset=utf-8",
  });

  const nameResponseBody = parseSoapBody(nameXml, "get_name_from_tin");
  const nameResponse = nameResponseBody.get_name_from_tinResponse;

  const companyName = nameResponse?.get_name_from_tinResult ?? nameResponse?.name ?? null;

  return {
    unId: String(unId),
    serviceUserId: serviceUserId ? String(serviceUserId) : null,
    companyTin: String(companyTin),
    companyName: companyName ? String(companyName) : null,
  };
};

const handleError = async (
  req: Request,
  error: unknown,
  action: string,
  resourceId?: number,
) => {
  console.error(`[RS Admin] ${action} failed:`, error);
  await activityLogger.logError(
    ACTIVITY_ACTIONS.SETTINGS_UPDATE_SECURITY,
    RESOURCE_TYPES.SETTINGS,
    {
      userId: req.session?.userId ?? 0,
      clientId: undefined,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || undefined,
    },
    error instanceof Error ? error : String(error),
    resourceId,
    { action }
  );
};

router.post("/main-user/validate", async (req: Request, res: Response) => {
  try {
    const { username, password } = mainCredentialsSchema.parse(req.body);
    const result = await validateMainUserCredentials(username.trim(), password);
    res.json(result);
  } catch (error) {
    await handleError(req, error, "validateMainUser");
    const message = error instanceof z.ZodError
      ? error.errors[0]?.message
      : error instanceof Error
        ? error.message
        : "Failed to validate main user credentials";
    res.status(error instanceof z.ZodError ? 400 : 500).json({ message });
  }
});

router.post("/service-user/validate", async (req: Request, res: Response) => {
  try {
    const { serviceUser, servicePassword } = serviceCredentialsSchema.parse(req.body);
    const result = await validateServiceUserCredentials(serviceUser.trim(), servicePassword);
    res.json(result);
  } catch (error) {
    await handleError(req, error, "validateServiceUser");
    const message = error instanceof z.ZodError
      ? error.errors[0]?.message
      : error instanceof Error
        ? error.message
        : "Failed to validate service user credentials";
    res.status(error instanceof z.ZodError ? 400 : 500).json({ message });
  }
});

router.get("/credentials", async (req: Request, res: Response) => {
  try {
    // RS Admin is global admin only, so return all credentials by default
    // The scope parameter is kept for backward compatibility but default behavior is to return all
    const scopeCompany = req.query.scope === "company";
    console.log(`[RS Admin] GET /credentials - scope: ${req.query.scope}, scopeCompany: ${scopeCompany}`);
    let records: CredentialRow[];

    if (scopeCompany) {
      // Legacy behavior: filter by DEFAULT_CLIENT_ID if explicitly requested
      const clientId = DEFAULT_CLIENT_ID as number;
      console.log(`[RS Admin] Filtering by clientId: ${clientId}`);
      records = await db
        .select({
          id: rsUsers.id,
          clientId: rsUsers.clientId,
          companyName: rsUsers.companyName,
          companyTin: rsUsers.companyTin,
          mainUser: rsUsers.mainUser,
          sUser: rsUsers.sUser,
          userId: rsUsers.userId,
          unId: rsUsers.unId,
          createdAt: rsUsers.createdAt,
          updatedAt: rsUsers.updatedAt,
          companyCode: companies.code,
          companyDisplayName: companies.name,
        })
        .from(rsUsers)
        .leftJoin(companies, eq(rsUsers.clientId, companies.id))
        .where(eq(rsUsers.clientId, clientId));
    } else {
      // Default: return all credentials (since RS Admin is global admin only)
      console.log(`[RS Admin] Fetching all credentials`);
      records = await db
        .select({
          id: rsUsers.id,
          clientId: rsUsers.clientId,
          companyName: rsUsers.companyName,
          companyTin: rsUsers.companyTin,
          mainUser: rsUsers.mainUser,
          sUser: rsUsers.sUser,
          userId: rsUsers.userId,
          unId: rsUsers.unId,
          createdAt: rsUsers.createdAt,
          updatedAt: rsUsers.updatedAt,
          companyCode: companies.code,
          companyDisplayName: companies.name,
        })
        .from(rsUsers)
        .leftJoin(companies, eq(rsUsers.clientId, companies.id));
    }

    console.log(`[RS Admin] Found ${records.length} credentials`);
    const sanitized = records.map(sanitizeCredential);
    console.log(`[RS Admin] Returning ${sanitized.length} sanitized credentials`);
    res.json({ data: sanitized });
  } catch (error) {
    console.error(`[RS Admin] Error fetching credentials:`, error);
    await handleError(req, error, "listCredentials");
    const message = error instanceof Error ? error.message : "Failed to load RS credentials";
    res.status(500).json({ message });
  }
});

router.post("/credentials", async (req: Request, res: Response) => {
  try {
    const payload = createCredentialsSchema.parse(req.body);
    const userId = req.session.userId as number;

    const trimmedTin = payload.companyTin.trim();
    const trimmedCompanyName = payload.companyName.trim();
    
    // Find client company by matching TIN (code) - save first, then verify and link
    const [matchingClient] = await db
      .select({ id: companies.id, code: companies.code, name: companies.name })
      .from(companies)
      .where(eq(companies.code, trimmedTin))
      .limit(1);
    
    // Check if credentials already exist for this TIN
    const [existing] = await db
      .select({ id: rsUsers.id, clientId: rsUsers.clientId })
      .from(rsUsers)
      .where(eq(rsUsers.companyTin, trimmedTin))
      .limit(1);

    if (existing) {
      return res.status(409).json({ 
        message: `RS credentials already exist for TIN "${trimmedTin}". Please update the existing record.` 
      });
    }

    const hashedMainPassword = await bcrypt.hash(payload.mainPassword, 12);
    const hashedServicePassword = await bcrypt.hash(payload.servicePassword, 12);

    // Save credentials first (with or without clientId)
    const [inserted] = await db
      .insert(rsUsers)
      .values({
        clientId: matchingClient?.id ?? null, // Link to client if found, otherwise null
        companyName: trimmedCompanyName,
        companyTin: trimmedTin,
        mainUser: payload.mainUser.trim(),
        mainPassword: payload.mainPassword,
        mainPasswordHash: hashedMainPassword,
        sUser: payload.serviceUser.trim(),
        sPassword: payload.servicePassword,
        sPasswordHash: hashedServicePassword,
        userId: payload.rsUserId ?? null,
        unId: payload.unId ?? null,
        createdByUserId: userId,
      })
      .returning();

    // If matching client found, update verification status to "verified"
    if (matchingClient) {
      await db
        .update(companies)
        .set({ 
          verificationStatus: "verified",
          updatedAt: new Date(),
        })
        .where(eq(companies.id, matchingClient.id));
      
      console.log(`[RS Admin] Updated client ${matchingClient.id} (${matchingClient.name}) verification status to "verified" for TIN ${trimmedTin}`);
    } else {
      console.log(`[RS Admin] No matching client found for TIN ${trimmedTin}. Credentials saved without client link.`);
    }

    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.SETTINGS_UPDATE_SECURITY,
      RESOURCE_TYPES.SETTINGS,
      {
        userId,
        clientId: matchingClient?.id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || undefined,
      },
      inserted.id,
      undefined,
      {
        companyTin: trimmedTin,
        companyName: trimmedCompanyName,
        mainUser: inserted.mainUser,
        serviceUser: inserted.sUser,
        clientId: matchingClient?.id ?? null,
        verificationStatus: matchingClient ? "verified" : "not_linked",
      }
    );

    res.status(201).json({ 
      credential: sanitizeCredential(inserted),
      clientMatched: matchingClient ? {
        id: matchingClient.id,
        name: matchingClient.name,
        code: matchingClient.code,
        verificationStatus: "verified",
      } : null,
    });
  } catch (error) {
    await handleError(req, error, "createCredentials");
    const message = error instanceof z.ZodError
      ? error.errors[0]?.message
      : error instanceof Error
        ? error.message
        : "Failed to save RS credentials";
    res.status(error instanceof z.ZodError ? 400 : 500).json({ message });
  }
});

router.put("/credentials/:id", async (req: Request, res: Response) => {
  const credentialId = Number(req.params.id);
  if (Number.isNaN(credentialId)) {
    return res.status(400).json({ message: "Invalid credential identifier" });
  }

  try {
    const payload = updateCredentialsSchema.parse(req.body);
    const userId = req.session.userId as number;

    // Check if credential exists (by ID only, not by clientId)
    const [existing] = await db
      .select()
      .from(rsUsers)
      .where(eq(rsUsers.id, credentialId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "RS credentials not found" });
    }
    
    const trimmedTin = payload.companyTin.trim();
    const trimmedCompanyName = payload.companyName.trim();
    
    // Find matching client by TIN (code) - save first, then verify and link
    const [matchingClient] = await db
      .select({ id: companies.id, code: companies.code, name: companies.name })
      .from(companies)
      .where(eq(companies.code, trimmedTin))
      .limit(1);

    const updatePayload: Partial<RsUserInsert> = {
      companyName: trimmedCompanyName,
      companyTin: trimmedTin,
      mainUser: payload.mainUser.trim(),
      sUser: payload.serviceUser.trim(),
      userId: payload.rsUserId ?? null,
      unId: payload.unId ?? null,
      updatedAt: new Date(),
      // Link to matching client if found, otherwise keep existing clientId or set to null
      clientId: matchingClient?.id ?? existing.clientId ?? null,
    };

    if (payload.mainPassword) {
      updatePayload.mainPassword = payload.mainPassword;
      updatePayload.mainPasswordHash = await bcrypt.hash(payload.mainPassword, 12);
    }

    if (payload.servicePassword) {
      updatePayload.sPassword = payload.servicePassword;
      updatePayload.sPasswordHash = await bcrypt.hash(payload.servicePassword, 12);
    }

    // Save update first
    const [updated] = await db
      .update(rsUsers)
      .set(updatePayload)
      .where(eq(rsUsers.id, credentialId))
      .returning();

    // If matching client found, update verification status to "verified"
    if (matchingClient) {
      await db
        .update(companies)
        .set({ 
          verificationStatus: "verified",
          updatedAt: new Date(),
        })
        .where(eq(companies.id, matchingClient.id));
      
      console.log(`[RS Admin] Updated client ${matchingClient.id} (${matchingClient.name}) verification status to "verified" for TIN ${trimmedTin}`);
    }

    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.SETTINGS_UPDATE_SECURITY,
      RESOURCE_TYPES.SETTINGS,
      {
        userId,
        clientId: matchingClient?.id ?? existing.clientId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || undefined,
      },
      credentialId,
      sanitizeCredential(existing),
      sanitizeCredential(updated)
    );

    res.json({ 
      credential: sanitizeCredential(updated),
      clientMatched: matchingClient ? {
        id: matchingClient.id,
        name: matchingClient.name,
        code: matchingClient.code,
        verificationStatus: "verified",
      } : null,
    });
  } catch (error) {
    await handleError(req, error, "updateCredentials", credentialId);
    const message = error instanceof z.ZodError
      ? error.errors[0]?.message
      : error instanceof Error
        ? error.message
        : "Failed to update RS credentials";
    res.status(error instanceof z.ZodError ? 400 : 500).json({ message });
  }
});

router.delete("/credentials/:id", async (req: Request, res: Response) => {
  const credentialId = Number(req.params.id);
  if (Number.isNaN(credentialId)) {
    return res.status(400).json({ message: "Invalid credential identifier" });
  }

  try {
    const userId = req.session.userId as number;

    // Check if credential exists (by ID only, not by clientId)
    const [existing] = await db
      .select()
      .from(rsUsers)
      .where(eq(rsUsers.id, credentialId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "RS credentials not found" });
    }

    await db.delete(rsUsers).where(eq(rsUsers.id, credentialId));

    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.SETTINGS_UPDATE_SECURITY,
      RESOURCE_TYPES.SETTINGS,
      {
        userId,
        clientId: existing.clientId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || undefined,
      },
      credentialId,
      sanitizeCredential(existing),
      undefined
    );

    res.status(204).send();
  } catch (error) {
    await handleError(req, error, "deleteCredentials", credentialId);
    const message = error instanceof Error ? error.message : "Failed to delete RS credentials";
    res.status(500).json({ message });
  }
});

// Validate a single credential by ID
router.post("/credentials/validate/:id", async (req: Request, res: Response) => {
  const credentialId = Number(req.params.id);
  if (Number.isNaN(credentialId)) {
    return res.status(400).json({ message: "Invalid credential identifier" });
  }

  try {
    const userId = req.session.userId as number;

    // Get credential from database
    const [credential] = await db
      .select()
      .from(rsUsers)
      .where(eq(rsUsers.id, credentialId))
      .limit(1);

    if (!credential) {
      return res.status(404).json({ message: "RS credentials not found" });
    }

    if (!credential.mainUser || !credential.mainPassword || !credential.sUser || !credential.sPassword) {
      return res.status(400).json({ message: "Credential is missing required fields for validation" });
    }

    let validationResult = {
      success: false,
      mainUserValid: false,
      serviceUserValid: false,
      error: null as string | null,
      clientUpdated: false,
    };

    try {
      // Validate main user credentials
      await validateMainUserCredentials(credential.mainUser, credential.mainPassword);
      validationResult.mainUserValid = true;

      // Validate service user credentials
      await validateServiceUserCredentials(credential.sUser, credential.sPassword);
      validationResult.serviceUserValid = true;
      validationResult.success = true;

      // If both valid and client is linked, update verification status
      if (credential.clientId) {
        await db
          .update(companies)
          .set({ 
            verificationStatus: "verified",
            updatedAt: new Date(),
          })
          .where(eq(companies.id, credential.clientId));
        validationResult.clientUpdated = true;
        console.log(`[RS Admin] Updated client ${credential.clientId} verification status to "verified" after validation`);
      }
    } catch (error) {
      validationResult.error = error instanceof Error ? error.message : String(error);
      console.error(`[RS Admin] Validation failed for credential ${credentialId}:`, validationResult.error);
    }

    res.json({
      credentialId,
      ...validationResult,
    });
  } catch (error) {
    await handleError(req, error, "validateCredential", credentialId);
    const message = error instanceof Error ? error.message : "Failed to validate RS credentials";
    res.status(500).json({ message });
  }
});

// Validate all stored credentials
router.post("/credentials/validate-all", async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId as number;

    // Get all credentials
    const allCredentials = await db
      .select()
      .from(rsUsers)
      .limit(1000); // Reasonable limit

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    // Validate each credential (sequentially to avoid overwhelming RS service)
    for (const credential of allCredentials) {
      if (!credential.mainUser || !credential.mainPassword || !credential.sUser || !credential.sPassword) {
        results.push({
          credentialId: credential.id,
          companyTin: credential.companyTin,
          companyName: credential.companyName,
          success: false,
          error: "Missing required fields",
        });
        failureCount++;
        continue;
      }

      try {
        // Validate main user credentials
        await validateMainUserCredentials(credential.mainUser, credential.mainPassword);

        // Validate service user credentials
        await validateServiceUserCredentials(credential.sUser, credential.sPassword);

        // Update client verification status if linked
        if (credential.clientId) {
          await db
            .update(companies)
            .set({ 
              verificationStatus: "verified",
              updatedAt: new Date(),
            })
            .where(eq(companies.id, credential.clientId));
        }

        results.push({
          credentialId: credential.id,
          companyTin: credential.companyTin,
          companyName: credential.companyName,
          success: true,
        });
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          credentialId: credential.id,
          companyTin: credential.companyTin,
          companyName: credential.companyName,
          success: false,
          error: errorMessage,
        });
        failureCount++;
      }
    }

    res.json({
      total: allCredentials.length,
      success: successCount,
      failed: failureCount,
      results,
    });
  } catch (error) {
    await handleError(req, error, "validateAllCredentials");
    const message = error instanceof Error ? error.message : "Failed to validate RS credentials";
    res.status(500).json({ message });
  }
});

export default router;

