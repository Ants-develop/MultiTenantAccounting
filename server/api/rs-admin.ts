import express, { type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { db } from "../db";
import { rsUsers, companies, type RsUser } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from "../services/activity-logger";

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
    const scopeAll = req.query.scope === "all";
    let records: CredentialRow[];

    if (scopeAll) {
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
    } else {
      const clientId = DEFAULT_CLIENT_ID as number;
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
    }

    res.json({ data: records.map(sanitizeCredential) });
  } catch (error) {
    await handleError(req, error, "listCredentials");
    const message = error instanceof Error ? error.message : "Failed to load RS credentials";
    res.status(500).json({ message });
  }
});

router.post("/credentials", async (req: Request, res: Response) => {
  try {
    const payload = createCredentialsSchema.parse(req.body);
    const clientId = DEFAULT_CLIENT_ID as number;
    const userId = req.session.userId as number;

    const [existing] = await db
      .select({ id: rsUsers.id })
      .from(rsUsers)
      .where(eq(rsUsers.clientId, clientId))
      .limit(1);

    if (existing) {
      return res.status(409).json({ message: "RS credentials already exist for this company. Please update the existing record." });
    }

    const trimmedTin = payload.companyTin.trim();
    const trimmedCompanyName = payload.companyName.trim();
    
    // Validate that TIN matches company code
    const [company] = await db
      .select({ code: companies.code })
      .from(companies)
      .where(eq(companies.id, clientId))
      .limit(1);
    
    if (company && company.code !== trimmedTin) {
      return res.status(400).json({ 
        message: `Company TIN mismatch: RS returned TIN "${trimmedTin}" but selected company code is "${company.code}". Please ensure you are using the correct RS credentials for this company.` 
      });
    }

    const hashedMainPassword = await bcrypt.hash(payload.mainPassword, 12);
    const hashedServicePassword = await bcrypt.hash(payload.servicePassword, 12);

    const [inserted] = await db
      .insert(rsUsers)
      .values({
        clientId,
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

    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.SETTINGS_UPDATE_SECURITY,
      RESOURCE_TYPES.SETTINGS,
      {
        userId,
        clientId,
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
      }
    );

    res.status(201).json({ credential: sanitizeCredential(inserted) });
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
    const clientId = DEFAULT_CLIENT_ID as number;
    const userId = req.session.userId as number;

    const [existing] = await db
      .select()
      .from(rsUsers)
      .where(and(eq(rsUsers.id, credentialId), eq(rsUsers.clientId, clientId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "RS credentials not found for this company" });
    }
    
    const trimmedTin = payload.companyTin.trim();
    
    // Validate that TIN matches company code
    const [company] = await db
      .select({ code: companies.code })
      .from(companies)
      .where(eq(companies.id, clientId))
      .limit(1);
    
    if (company && company.code !== trimmedTin) {
      return res.status(400).json({ 
        message: `Company TIN mismatch: RS returned TIN "${trimmedTin}" but selected company code is "${company.code}". Please ensure you are using the correct RS credentials for this company.` 
      });
    }

    const updatePayload: Partial<RsUserInsert> = {
      companyName: payload.companyName.trim(),
      companyTin: trimmedTin,
      mainUser: payload.mainUser.trim(),
      sUser: payload.serviceUser.trim(),
      userId: payload.rsUserId ?? null,
      unId: payload.unId ?? null,
      updatedAt: new Date(),
    };

    if (payload.mainPassword) {
      updatePayload.mainPassword = payload.mainPassword;
      updatePayload.mainPasswordHash = await bcrypt.hash(payload.mainPassword, 12);
    }

    if (payload.servicePassword) {
      updatePayload.sPassword = payload.servicePassword;
      updatePayload.sPasswordHash = await bcrypt.hash(payload.servicePassword, 12);
    }

    const [updated] = await db
      .update(rsUsers)
      .set(updatePayload)
      .where(eq(rsUsers.id, credentialId))
      .returning();

    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.SETTINGS_UPDATE_SECURITY,
      RESOURCE_TYPES.SETTINGS,
      {
        userId,
        clientId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || undefined,
      },
      credentialId,
      sanitizeCredential(existing),
      sanitizeCredential(updated)
    );

    res.json({ credential: sanitizeCredential(updated) });
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
    const clientId = DEFAULT_CLIENT_ID as number;
    const userId = req.session.userId as number;

    const [existing] = await db
      .select()
      .from(rsUsers)
      .where(and(eq(rsUsers.id, credentialId), eq(rsUsers.clientId, clientId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "RS credentials not found for this company" });
    }

    await db.delete(rsUsers).where(eq(rsUsers.id, credentialId));

    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.SETTINGS_UPDATE_SECURITY,
      RESOURCE_TYPES.SETTINGS,
      {
        userId,
        clientId,
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

export default router;

