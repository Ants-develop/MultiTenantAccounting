import { XMLParser } from "fast-xml-parser";

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const WAYBILL_SERVICE_URL = "https://services.rs.ge/WayBillService/WayBillService.asmx";
const INVOICE_SERVICE_URL = "https://www.revenue.mof.ge/ntosservice/ntosservice.asmx";

interface SoapCallOptions {
  url: string;
  body: string;
  action?: string;
  contentType?: string;
  timeoutMs?: number;
}

const callSoap = async (options: SoapCallOptions): Promise<string> => {
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

const cleanXmlResponse = (xml: string): string => {
  // Remove BOM characters
  let cleaned = xml.replace(/\xEF\xBB\xBF/g, "");
  
  // Remove null bytes
  cleaned = cleaned.replace(/\x00/g, "");
  
  // Fix empty xmlns attributes
  cleaned = cleaned.replace(/xmlns=""/g, "");
  
  // Fix "null" strings
  cleaned = cleaned.replace(/>null</g, "><");
  
  // Remove problematic prefixes that can cause parsing issues
  cleaned = cleaned.replace(/soap:/g, "").replace(/diffgr:/g, "").replace(/msdata:/g, "");
  
  return cleaned;
};

const parseXmlResponse = (xml: string): any => {
  const cleaned = cleanXmlResponse(xml);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseAttributeValue: true,
    trimValues: true,
    parseTrueNumberOnly: false,
    arrayMode: false,
  });
  
  try {
    return parser.parse(cleaned);
  } catch (error) {
    console.error("[RS API] XML parsing error:", error);
    throw new Error(`Failed to parse XML response: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export interface WaybillCredentials {
  sUser: string;
  sPassword: string;
}

export interface InvoiceCredentials extends WaybillCredentials {
  userId?: string;
  unId?: string;
}

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/**
 * Build SOAP request for waybills
 */
const buildWaybillSoapRequest = (
  type: "seller" | "buyer",
  credentials: WaybillCredentials,
  dateRange: DateRange
): string => {
  const { sUser, sPassword } = credentials;
  const { startDate, endDate } = dateRange;
  
  // Format dates as YYYY-MM-DDTHH:mm:ss
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate + "T23:59:59");
  const dateFormat = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };
  
  const create_date_s = dateFormat(startDateObj);
  const create_date_e = dateFormat(endDateObj);
  
  const soapFunction = type === "buyer" ? "get_buyer_waybills_ex" : "get_waybills_ex";
  
  if (type === "buyer") {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<${soapFunction} xmlns="http://tempuri.org/">
    <su>${escapeXml(sUser)}</su>
    <sp>${escapeXml(sPassword)}</sp>
    <seller_tin xsi:nil="true"/>
    <statuses xsi:nil="true"/>
    <car_number xsi:nil="true"/>
    <begin_date_s xsi:nil="true"/>
    <begin_date_e xsi:nil="true"/>
    <create_date_s>${create_date_s}</create_date_s>
    <create_date_e>${create_date_e}</create_date_e>
    <driver_tin xsi:nil="true"/>
    <delivery_date_s xsi:nil="true"/>
    <delivery_date_e xsi:nil="true"/>
    <full_amount xsi:nil="true"/>
    <is_confirmed xsi:nil="true"/>
</${soapFunction}>
</soap:Body>
</soap:Envelope>`;
  } else {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<${soapFunction} xmlns="http://tempuri.org/">
    <su>${escapeXml(sUser)}</su>
    <sp>${escapeXml(sPassword)}</sp>
    <itypes xsi:nil="true"/>
    <buyer_tin xsi:nil="true"/>
    <statuses xsi:nil="true"/>
    <car_number xsi:nil="true"/>
    <begin_date_s>${create_date_s}</begin_date_s>
    <begin_date_e>${create_date_e}</begin_date_e>
    <create_date_s xsi:nil="true"/>
    <create_date_e xsi:nil="true"/>
    <driver_tin xsi:nil="true"/>
    <delivery_date_s xsi:nil="true"/>
    <delivery_date_e xsi:nil="true"/>
    <full_amount xsi:nil="true"/>
    <is_confirmed xsi:nil="true"/>
</${soapFunction}>
</soap:Body>
</soap:Envelope>`;
  }
};

/**
 * Fetch waybills from RS API
 */
export const fetchWaybills = async (
  type: "seller" | "buyer",
  credentials: WaybillCredentials,
  dateRange: DateRange,
  maxRetries: number = 3
): Promise<any[]> => {
  const soapRequest = buildWaybillSoapRequest(type, credentials, dateRange);
  const soapFunction = type === "buyer" ? "get_buyer_waybills_ex" : "get_waybills_ex";
  const responseNode = type === "buyer" ? "get_buyer_waybills_exResponse" : "get_waybills_exResponse";
  const resultNode = type === "buyer" ? "get_buyer_waybills_exResult" : "get_waybills_exResult";
  
  const timeoutMs = type === "buyer" ? 300000 : 120000; // Buyer endpoints are slower
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[RS API] Fetching ${type} waybills (attempt ${attempt}/${maxRetries})...`);
      
      const response = await callSoap({
        url: WAYBILL_SERVICE_URL,
        body: soapRequest,
        action: `http://tempuri.org/${soapFunction}`,
        timeoutMs,
      });
      
      const parsed = parseXmlResponse(response);
      
      // Navigate through SOAP response structure
      const envelope = parsed.Envelope || parsed["soap:Envelope"] || parsed;
      const body = envelope.Body || envelope["soap:Body"] || envelope;
      const responseData = body[responseNode] || body;
      const result = responseData[resultNode] || responseData;
      
      // Extract waybill list
      const waybillList = result?.WAYBILL_LIST || result?.waybill_list || result;
      const waybills = waybillList?.WAYBILL || waybillList?.waybill || [];
      
      // Normalize to array
      const waybillArray = Array.isArray(waybills) ? waybills : (waybills ? [waybills] : []);
      
      console.log(`[RS API] Successfully fetched ${waybillArray.length} ${type} waybills`);
      return waybillArray.map((wb: any) => {
        const normalized: any = {};
        // Convert all keys to uppercase and normalize
        for (const [key, value] of Object.entries(wb)) {
          normalized[key.toUpperCase()] = value;
        }
        return normalized;
      });
    } catch (error: any) {
      lastError = error;
      console.error(`[RS API] Waybill fetch attempt ${attempt} failed:`, error.message);
      
      // Exponential backoff for timeouts
      if (attempt < maxRetries && error.message.includes("timeout")) {
        const sleepMs = Math.min(5000 * attempt, 15000);
        console.log(`[RS API] Waiting ${sleepMs}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
      }
    }
  }
  
  throw new Error(`Failed to fetch ${type} waybills after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}`);
};

/**
 * Build SOAP request for waybill goods
 */
const buildWaybillGoodsSoapRequest = (
  type: "seller" | "buyer",
  credentials: WaybillCredentials,
  dateRange: DateRange
): string => {
  const { sUser, sPassword } = credentials;
  const { startDate, endDate } = dateRange;
  
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate + "T23:59:59");
  const dateFormat = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };
  
  const begin_date_s = dateFormat(startDateObj);
  const begin_date_e = dateFormat(endDateObj);
  
  const soapFunction = type === "buyer" ? "get_buyer_waybilll_goods_list" : "get_waybill_goods_list";
  
  if (type === "buyer") {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<${soapFunction} xmlns="http://tempuri.org/">
    <su>${escapeXml(sUser)}</su>
    <sp>${escapeXml(sPassword)}</sp>
    <seller_tin xsi:nil="true"/>
    <statuses xsi:nil="true"/>
    <car_number xsi:nil="true"/>
    <begin_date_s>${begin_date_s}</begin_date_s>
    <begin_date_e>${begin_date_e}</begin_date_e>
    <create_date_s xsi:nil="true"/>
    <create_date_e xsi:nil="true"/>
    <driver_tin xsi:nil="true"/>
    <delivery_date_s xsi:nil="true"/>
    <delivery_date_e xsi:nil="true"/>
    <full_amount xsi:nil="true"/>
    <is_confirmed xsi:nil="true"/>
</${soapFunction}>
</soap:Body>
</soap:Envelope>`;
  } else {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<${soapFunction} xmlns="http://tempuri.org/">
    <su>${escapeXml(sUser)}</su>
    <sp>${escapeXml(sPassword)}</sp>
    <itypes xsi:nil="true"/>
    <buyer_tin xsi:nil="true"/>
    <statuses xsi:nil="true"/>
    <car_number xsi:nil="true"/>
    <begin_date_s>${begin_date_s}</begin_date_s>
    <begin_date_e>${begin_date_e}</begin_date_e>
    <create_date_s xsi:nil="true"/>
    <create_date_e xsi:nil="true"/>
    <driver_tin xsi:nil="true"/>
    <delivery_date_s xsi:nil="true"/>
    <delivery_date_e xsi:nil="true"/>
    <full_amount xsi:nil="true"/>
    <is_confirmed xsi:nil="true"/>
</${soapFunction}>
</soap:Body>
</soap:Envelope>`;
  }
};

/**
 * Fetch waybill goods from RS API
 */
export const fetchWaybillGoods = async (
  type: "seller" | "buyer",
  credentials: WaybillCredentials,
  dateRange: DateRange,
  maxRetries: number = 3
): Promise<any[]> => {
  const soapRequest = buildWaybillGoodsSoapRequest(type, credentials, dateRange);
  const soapFunction = type === "buyer" ? "get_buyer_waybilll_goods_list" : "get_waybill_goods_list";
  const responseNode = type === "buyer" ? "get_buyer_waybilll_goods_listResponse" : "get_waybill_goods_listResponse";
  const resultNode = type === "buyer" ? "get_buyer_waybilll_goods_listResult" : "get_waybill_goods_listResult";
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[RS API] Fetching ${type} waybill goods (attempt ${attempt}/${maxRetries})...`);
      
      const response = await callSoap({
        url: WAYBILL_SERVICE_URL,
        body: soapRequest,
        action: `http://tempuri.org/${soapFunction}`,
        timeoutMs: 120000,
      });
      
      const parsed = parseXmlResponse(response);
      
      const envelope = parsed.Envelope || parsed["soap:Envelope"] || parsed;
      const body = envelope.Body || envelope["soap:Body"] || envelope;
      const responseData = body[responseNode] || body;
      const result = responseData[resultNode] || responseData;
      
      const goodsList = result?.GOODS_LIST || result?.goods_list || result;
      const goods = goodsList?.GOODS || goodsList?.goods || [];
      
      const goodsArray = Array.isArray(goods) ? goods : (goods ? [goods] : []);
      
      console.log(`[RS API] Successfully fetched ${goodsArray.length} ${type} waybill goods`);
      return goodsArray.map((item: any) => {
        const normalized: any = {};
        for (const [key, value] of Object.entries(item)) {
          normalized[key.toUpperCase()] = value;
        }
        return normalized;
      });
    } catch (error: any) {
      lastError = error;
      console.error(`[RS API] Waybill goods fetch attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries && error.message.includes("timeout")) {
        const sleepMs = Math.min(5000 * attempt, 15000);
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
      }
    }
  }
  
  throw new Error(`Failed to fetch ${type} waybill goods after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}`);
};

/**
 * Build SOAP request for invoices
 */
const buildInvoiceSoapRequest = (
  type: "seller" | "buyer",
  credentials: InvoiceCredentials,
  dateRange: DateRange
): string => {
  const { sUser, sPassword, userId = "", unId = "" } = credentials;
  const { startDate, endDate } = dateRange;
  
  // Hardcoded date range for full history (as per PHP script)
  const s_dt_hardcoded = "2009-01-01T00:00:00";
  const e_dt_hardcoded = new Date().toISOString().replace("Z", "").split(".")[0];
  
  const dateFormat = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };
  
  const op_s_dt = dateFormat(startDate);
  const op_e_dt = dateFormat(endDate + "T23:59:59");
  
  const soapFunction = type === "buyer" ? "get_buyer_invoices" : "get_seller_invoices";
  
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<${soapFunction} xmlns="http://tempuri.org/">
    <user_id>${escapeXml(userId)}</user_id>
    <un_id>${escapeXml(unId)}</un_id>
    <s_dt>${s_dt_hardcoded}</s_dt>
    <e_dt>${e_dt_hardcoded}</e_dt>
    <op_s_dt>${op_s_dt}</op_s_dt>
    <op_e_dt>${op_e_dt}</op_e_dt>
    <su>${escapeXml(sUser)}</su>
    <sp>${escapeXml(sPassword)}</sp>
</${soapFunction}>
</soap:Body>
</soap:Envelope>`;
};

/**
 * Fetch invoices from RS API
 */
export const fetchInvoices = async (
  type: "seller" | "buyer",
  credentials: InvoiceCredentials,
  dateRange: DateRange,
  maxRetries: number = 3
): Promise<any[]> => {
  const soapRequest = buildInvoiceSoapRequest(type, credentials, dateRange);
  const soapFunction = type === "buyer" ? "get_buyer_invoices" : "get_seller_invoices";
  const responseNode = type === "buyer" ? "get_buyer_invoicesResponse" : "get_seller_invoicesResponse";
  const resultNode = type === "buyer" ? "get_buyer_invoicesResult" : "get_seller_invoicesResult";
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[RS API] Fetching ${type} invoices (attempt ${attempt}/${maxRetries})...`);
      
      const response = await callSoap({
        url: INVOICE_SERVICE_URL,
        body: soapRequest,
        action: `http://tempuri.org/${soapFunction}`,
        timeoutMs: 120000,
      });
      
      const parsed = parseXmlResponse(response);
      
      const envelope = parsed.Envelope || parsed["soap:Envelope"] || parsed;
      const body = envelope.Body || envelope["soap:Body"] || envelope;
      const responseData = body[responseNode] || body;
      const result = responseData[resultNode] || responseData;
      
      // Invoice response structure uses diffgram
      const diffgram = result?.diffgram || result?.Diffgram || result;
      const documentElement = diffgram?.DocumentElement || diffgram?.documentElement || diffgram;
      const invoices = documentElement?.invoices || documentElement?.Invoices || documentElement || [];
      
      const invoiceArray = Array.isArray(invoices) ? invoices : (invoices ? [invoices] : []);
      
      console.log(`[RS API] Successfully fetched ${invoiceArray.length} ${type} invoices`);
      return invoiceArray.map((inv: any) => {
        const normalized: any = {};
        for (const [key, value] of Object.entries(inv)) {
          normalized[key.toUpperCase()] = value;
        }
        return normalized;
      });
    } catch (error: any) {
      lastError = error;
      console.error(`[RS API] Invoice fetch attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries && error.message.includes("timeout")) {
        const sleepMs = Math.min(5000 * attempt, 15000);
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
      }
    }
  }
  
  throw new Error(`Failed to fetch ${type} invoices after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}`);
};

/**
 * Build SOAP request for invoice goods
 */
const buildInvoiceGoodsSoapRequest = (
  credentials: InvoiceCredentials,
  invoiceId: string
): string => {
  const { sUser, sPassword, userId = "", unId = "" } = credentials;
  
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
<get_invoice_goods xmlns="http://tempuri.org/">
    <user_id>${escapeXml(userId)}</user_id>
    <un_id>${escapeXml(unId)}</un_id>
    <invoice_id>${escapeXml(invoiceId)}</invoice_id>
    <su>${escapeXml(sUser)}</su>
    <sp>${escapeXml(sPassword)}</sp>
</get_invoice_goods>
</soap:Body>
</soap:Envelope>`;
};

/**
 * Fetch invoice goods for a specific invoice
 */
export const fetchInvoiceGoods = async (
  credentials: InvoiceCredentials,
  invoiceId: string,
  maxRetries: number = 3
): Promise<any[]> => {
  const soapRequest = buildInvoiceGoodsSoapRequest(credentials, invoiceId);
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await callSoap({
        url: INVOICE_SERVICE_URL,
        body: soapRequest,
        action: "http://tempuri.org/get_invoice_goods",
        timeoutMs: 60000,
      });
      
      const parsed = parseXmlResponse(response);
      
      const envelope = parsed.Envelope || parsed["soap:Envelope"] || parsed;
      const body = envelope.Body || envelope["soap:Body"] || envelope;
      const responseData = body.get_invoice_goodsResponse || body;
      const result = responseData.get_invoice_goodsResult || responseData;
      
      const goods = result?.goods || result?.Goods || result || [];
      const goodsArray = Array.isArray(goods) ? goods : (goods ? [goods] : []);
      
      return goodsArray.map((item: any) => {
        const normalized: any = {};
        for (const [key, value] of Object.entries(item)) {
          normalized[key.toUpperCase()] = value;
        }
        return normalized;
      });
    } catch (error: any) {
      lastError = error;
      console.error(`[RS API] Invoice goods fetch attempt ${attempt} failed for invoice ${invoiceId}:`, error.message);
      
      if (attempt < maxRetries && error.message.includes("timeout")) {
        const sleepMs = Math.min(5000 * attempt, 15000);
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
      }
    }
  }
  
  throw new Error(`Failed to fetch invoice goods for ${invoiceId} after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}`);
};

/**
 * Fetch invoice goods for multiple invoices (with concurrency control)
 */
export const fetchMultipleInvoiceGoods = async (
  credentials: InvoiceCredentials,
  invoiceIds: string[],
  concurrency: number = 15
): Promise<Map<string, any[]>> => {
  const results = new Map<string, any[]>();
  const errors = new Map<string, Error>();
  
  // Process in batches
  for (let i = 0; i < invoiceIds.length; i += concurrency) {
    const batch = invoiceIds.slice(i, i + concurrency);
    
    await Promise.all(
      batch.map(async (invoiceId) => {
        try {
          const goods = await fetchInvoiceGoods(credentials, invoiceId);
          results.set(invoiceId, goods);
        } catch (error) {
          errors.set(invoiceId, error instanceof Error ? error : new Error(String(error)));
        }
      })
    );
  }
  
  if (errors.size > 0) {
    console.warn(`[RS API] Failed to fetch goods for ${errors.size} invoices`);
  }
  
  return results;
};

