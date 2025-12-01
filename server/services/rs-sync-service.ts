import { db, pool } from "../db";
import { rsUsers, companies } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import {
  fetchWaybills,
  fetchWaybillGoods,
  fetchInvoices,
  fetchInvoiceGoods,
  fetchMultipleInvoiceGoods,
  type WaybillCredentials,
  type InvoiceCredentials,
  type DateRange,
} from "./rs-api-service";

export interface SyncResult {
  company: string;
  type: string;
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
  error?: boolean;
  message?: string;
}

export interface SyncProgress {
  company: string;
  step: string;
  progress: number;
  message: string;
}

export type ProgressCallback = (progress: SyncProgress) => void;

/**
 * Normalize decimal value (remove commas, handle empty strings)
 */
const normalizeDecimal = (value: any): string | null => {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value).replace(/,/g, "").trim();
  if (str === "" || str === "null") return null;
  return str;
};

/**
 * Normalize date value
 */
const normalizeDate = (value: any): string | null => {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value).trim();
  if (str === "" || str === "null") return null;
  return str;
};

/**
 * Reset correction baseline before sync
 */
const resetCorrectionBaseline = async (
  companyTin: string
): Promise<void> => {
  try {
    console.log(`[RS Sync] Resetting correction baseline for TIN: ${companyTin}`);
    
    // Reset seller waybills
    await db.execute(
      sql`UPDATE rs.sellers_waybills SET "PREVIOUS_IS_CORRECTED" = "IS_CORRECTED" WHERE "COMPANY_TIN" = ${companyTin}`
    );
    
    // Reset buyer waybills
    await db.execute(
      sql`UPDATE rs.buyers_waybills SET "PREVIOUS_IS_CORRECTED" = "IS_CORRECTED" WHERE "COMPANY_TIN" = ${companyTin}`
    );
    
    console.log(`[RS Sync] Correction baseline reset completed`);
  } catch (error) {
    console.error(`[RS Sync] Failed to reset correction baseline:`, error);
    // Continue with sync even if baseline reset fails
  }
};

/**
 * Sync waybills for a company
 */
export const syncWaybillsForCompany = async (
  company: string,
  companyId: number | string,
  companyTin: string,
  dateRange: DateRange,
  type: "seller" | "buyer",
  onProgress?: ProgressCallback
): Promise<SyncResult> => {
  const syncType = type === "buyer" ? "buyer_waybills" : "seller_waybills";
  const table = type === "buyer" ? "rs.buyers_waybills" : "rs.sellers_waybills";
  
  onProgress?.({
    company,
    step: syncType,
    progress: 0,
    message: `Fetching ${type} waybills from RS API...`,
  });
  
  try {
    // Get credentials
    const [credential] = await db
      .select({
        sUser: rsUsers.sUser,
        sPassword: rsUsers.sPassword,
      })
      .from(rsUsers)
      .where(eq(rsUsers.companyName, company))
      .limit(1);
    
    if (!credential) {
      throw new Error("Credentials not found for the selected company.");
    }
    
    // Fetch waybills from API
    const waybills = await fetchWaybills(
      type,
      {
        sUser: credential.sUser,
        sPassword: credential.sPassword,
      },
      dateRange
    );
    
    onProgress?.({
      company,
      step: syncType,
      progress: 50,
      message: `Processing ${waybills.length} ${type} waybills...`,
    });
    
    if (waybills.length === 0) {
      return {
        company,
        type: syncType,
        inserted: 0,
        updated: 0,
        skipped: 0,
        total: 0,
        error: false,
        message: `No ${type} waybills found for the date range`,
      };
    }
    
    // Process waybills in batches
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const batchSize = 100;
    
    for (let i = 0; i < waybills.length; i += batchSize) {
      const batch = waybills.slice(i, i + batchSize);
      
      for (const wb of batch) {
        try {
          const externalId = wb.ID || wb.EXTERNAL_ID;
          if (!externalId) {
            skipped++;
            continue;
          }
          
          // Prepare waybill data
          const waybillData: any = {
            EXTERNAL_ID: externalId,
            TYPE: normalizeDate(wb.TYPE),
            CREATE_DATE: normalizeDate(wb.CREATE_DATE),
            SELLER_TIN: normalizeDate(wb.SELLER_TIN) || (type === "seller" ? companyTin : null),
            SELLER_NAME: wb.SELLER_NAME || (type === "seller" ? company : null),
            BUYER_TIN: normalizeDate(wb.BUYER_TIN) || (type === "buyer" ? companyTin : null),
            BUYER_NAME: wb.BUYER_NAME || (type === "buyer" ? company : null),
            START_ADDRESS: wb.START_ADDRESS || null,
            END_ADDRESS: wb.END_ADDRESS || null,
            DRIVER_TIN: normalizeDate(wb.DRIVER_TIN),
            DRIVER_NAME: wb.DRIVER_NAME || null,
            TRANSPORT_COAST: normalizeDecimal(wb.TRANSPORT_COAST),
            DELIVERY_DATE: normalizeDate(wb.DELIVERY_DATE),
            STATUS: normalizeDate(wb.STATUS),
            ACTIVATE_DATE: normalizeDate(wb.ACTIVATE_DATE),
            FULL_AMOUNT: normalizeDecimal(wb.FULL_AMOUNT),
            CAR_NUMBER: wb.CAR_NUMBER || null,
            WAYBILL_NUMBER: wb.WAYBILL_NUMBER || null,
            CLOSE_DATE: normalizeDate(wb.CLOSE_DATE),
            BEGIN_DATE: normalizeDate(wb.BEGIN_DATE),
            COMMENT: wb.COMMENT || null,
            IS_CONFIRMED: normalizeDate(wb.IS_CONFIRMED),
            IS_CORRECTED: normalizeDate(wb.IS_CORRECTED),
            IS_VAT_PAYER: normalizeDate(wb.IS_VAT_PAYER),
            COMPANY_ID: String(companyId),
            COMPANY_TIN: companyTin,
            COMPANY_NAME: company,
            UPDATED_AT: new Date(),
          };
          
          // Check if waybill exists
          const existingResult = await pool.query(
            `SELECT "EXTERNAL_ID" FROM ${table} WHERE "EXTERNAL_ID" = $1 LIMIT 1`,
            [externalId]
          );
          
          if (existingResult.rows && existingResult.rows.length > 0) {
            // Update existing
            const updateFields = Object.keys(waybillData)
              .filter((key) => key !== "EXTERNAL_ID")
              .map((key, idx) => `"${key}" = $${idx + 1}`)
              .join(", ");
            
            const updateValues = Object.values(waybillData).filter((_, idx) => {
              const key = Object.keys(waybillData)[idx];
              return key !== "EXTERNAL_ID";
            });
            updateValues.push(externalId);
            
            await pool.query(
              `UPDATE ${table} SET ${updateFields} WHERE "EXTERNAL_ID" = $${updateValues.length}`,
              updateValues
            );
            updated++;
          } else {
            // Insert new
            const fields = Object.keys(waybillData).map((key) => `"${key}"`).join(", ");
            const placeholders = Object.keys(waybillData)
              .map((_, idx) => `$${idx + 1}`)
              .join(", ");
            const insertValues = Object.values(waybillData);
            
            await pool.query(
              `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`,
              insertValues
            );
            inserted++;
          }
        } catch (error) {
          console.error(`[RS Sync] Error processing waybill:`, error);
          skipped++;
        }
      }
      
      onProgress?.({
        company,
        step: syncType,
        progress: 50 + Math.floor((i / waybills.length) * 50),
        message: `Processed ${Math.min(i + batchSize, waybills.length)}/${waybills.length} waybills...`,
      });
    }
    
    return {
      company,
      type: syncType,
      inserted,
      updated,
      skipped,
      total: waybills.length,
      error: false,
    };
  } catch (error: any) {
    console.error(`[RS Sync] Error syncing ${type} waybills:`, error);
    return {
      company,
      type: syncType,
      inserted: 0,
      updated: 0,
      skipped: 0,
      total: 0,
      error: true,
      message: error.message || "Unknown error",
    };
  }
};

/**
 * Sync waybill goods for a company
 */
export const syncWaybillGoodsForCompany = async (
  company: string,
  companyId: number | string,
  companyTin: string,
  dateRange: DateRange,
  type: "seller" | "buyer",
  onProgress?: ProgressCallback
): Promise<SyncResult> => {
  const syncType = type === "buyer" ? "buyer_waybill_goods" : "seller_waybill_goods";
  const table = type === "buyer" ? "rs.buyers_waybill_goods" : "rs.sellers_waybill_goods";
  
  onProgress?.({
    company,
    step: syncType,
    progress: 0,
    message: `Fetching ${type} waybill goods from RS API...`,
  });
  
  try {
    // Get credentials
    const [credential] = await db
      .select({
        sUser: rsUsers.sUser,
        sPassword: rsUsers.sPassword,
      })
      .from(rsUsers)
      .where(eq(rsUsers.companyName, company))
      .limit(1);
    
    if (!credential) {
      throw new Error("Credentials not found for the selected company.");
    }
    
    // Fetch waybill goods from API
    const goods = await fetchWaybillGoods(
      type,
      {
        sUser: credential.sUser,
        sPassword: credential.sPassword,
      },
      dateRange
    );
    
    onProgress?.({
      company,
      step: syncType,
      progress: 50,
      message: `Processing ${goods.length} ${type} waybill goods...`,
    });
    
    if (goods.length === 0) {
      return {
        company,
        type: syncType,
        inserted: 0,
        updated: 0,
        skipped: 0,
        total: 0,
        error: false,
        message: `No ${type} waybill goods found for the date range`,
      };
    }
    
    // Process goods in batches
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const batchSize = 100;
    
    for (let i = 0; i < goods.length; i += batchSize) {
      const batch = goods.slice(i, i + batchSize);
      
      for (const item of batch) {
        try {
          const waybillId = item.WAYBILL_ID || item.EXTERNAL_ID;
          const goodsId = item.ID_GOODS || item.ID;
          
          if (!waybillId || !goodsId) {
            skipped++;
            continue;
          }
          
          // Prepare goods data
          const goodsData: any = {
            WAYBILL_EXTERNAL_ID: waybillId,
            ID_GOODS: goodsId,
            GOODS_NAME: item.GOODS_NAME || null,
            QUANTITY: normalizeDecimal(item.QUANTITY),
            UNIT: item.UNIT || null,
            PRICE: normalizeDecimal(item.PRICE),
            AMOUNT: normalizeDecimal(item.AMOUNT),
            VAT_AMOUNT: normalizeDecimal(item.VAT_AMOUNT),
            EXCISE_AMOUNT: normalizeDecimal(item.EXCISE_AMOUNT),
            COMPANY_ID: String(companyId),
            COMPANY_TIN: companyTin,
            UPDATED_AT: new Date(),
          };
          
          // Check if goods exists
          const existingGoodsResult = await pool.query(
            `SELECT "WAYBILL_EXTERNAL_ID", "ID_GOODS" FROM ${table} WHERE "WAYBILL_EXTERNAL_ID" = $1 AND "ID_GOODS" = $2 LIMIT 1`,
            [waybillId, goodsId]
          );
          
          if (existingGoodsResult.rows && existingGoodsResult.rows.length > 0) {
            // Update existing
            const updateFields = Object.keys(goodsData)
              .filter((key) => key !== "WAYBILL_EXTERNAL_ID" && key !== "ID_GOODS")
              .map((key, idx) => `"${key}" = $${idx + 1}`)
              .join(", ");
            
            const updateGoodsValues = Object.values(goodsData).filter((_, idx) => {
              const key = Object.keys(goodsData)[idx];
              return key !== "WAYBILL_EXTERNAL_ID" && key !== "ID_GOODS";
            });
            updateGoodsValues.push(waybillId, goodsId);
            
            await pool.query(
              `UPDATE ${table} SET ${updateFields} WHERE "WAYBILL_EXTERNAL_ID" = $${updateGoodsValues.length - 1} AND "ID_GOODS" = $${updateGoodsValues.length}`,
              updateGoodsValues
            );
            updated++;
          } else {
            // Insert new
            const fields = Object.keys(goodsData).map((key) => `"${key}"`).join(", ");
            const placeholders = Object.keys(goodsData)
              .map((_, idx) => `$${idx + 1}`)
              .join(", ");
            const insertGoodsValues = Object.values(goodsData);
            const conflictUpdate = Object.keys(goodsData)
              .filter((key) => key !== "WAYBILL_EXTERNAL_ID" && key !== "ID_GOODS")
              .map((key, idx) => `"${key}" = EXCLUDED."${key}"`)
              .join(", ");
            
            await pool.query(
              `INSERT INTO ${table} (${fields}) VALUES (${placeholders}) ON CONFLICT ("WAYBILL_EXTERNAL_ID", "ID_GOODS") DO UPDATE SET ${conflictUpdate}`,
              insertGoodsValues
            );
            inserted++;
          }
        } catch (error) {
          console.error(`[RS Sync] Error processing waybill goods:`, error);
          skipped++;
        }
      }
      
      onProgress?.({
        company,
        step: syncType,
        progress: 50 + Math.floor((i / goods.length) * 50),
        message: `Processed ${Math.min(i + batchSize, goods.length)}/${goods.length} goods...`,
      });
    }
    
    return {
      company,
      type: syncType,
      inserted,
      updated,
      skipped,
      total: goods.length,
      error: false,
    };
  } catch (error: any) {
    console.error(`[RS Sync] Error syncing ${type} waybill goods:`, error);
    return {
      company,
      type: syncType,
      inserted: 0,
      updated: 0,
      skipped: 0,
      total: 0,
      error: true,
      message: error.message || "Unknown error",
    };
  }
};

/**
 * Sync invoices for a company
 */
export const syncInvoicesForCompany = async (
  company: string,
  companyId: number | string,
  companyTin: string,
  dateRange: DateRange,
  type: "seller" | "buyer",
  onProgress?: ProgressCallback
): Promise<SyncResult> => {
  const syncType = type === "buyer" ? "buyer_invoices" : "seller_invoices";
  const table = type === "buyer" ? "rs.buyer_invoices" : "rs.seller_invoices";
  
  onProgress?.({
    company,
    step: syncType,
    progress: 0,
    message: `Fetching ${type} invoices from RS API...`,
  });
  
  try {
    // Get credentials
    const [credential] = await db
      .select({
        sUser: rsUsers.sUser,
        sPassword: rsUsers.sPassword,
        userId: rsUsers.userId,
        unId: rsUsers.unId,
      })
      .from(rsUsers)
      .where(eq(rsUsers.companyName, company))
      .limit(1);
    
    if (!credential) {
      throw new Error("Credentials not found for the selected company.");
    }
    
    // Fetch invoices from API
    const invoices = await fetchInvoices(
      type,
      {
        sUser: credential.sUser,
        sPassword: credential.sPassword,
        userId: credential.userId || undefined,
        unId: credential.unId || undefined,
      },
      dateRange
    );
    
    onProgress?.({
      company,
      step: syncType,
      progress: 50,
      message: `Processing ${invoices.length} ${type} invoices...`,
    });
    
    if (invoices.length === 0) {
      return {
        company,
        type: syncType,
        inserted: 0,
        updated: 0,
        skipped: 0,
        total: 0,
        error: false,
        message: `No ${type} invoices found for the date range`,
      };
    }
    
    // Process invoices in batches
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const batchSize = 100;
    
    for (let i = 0; i < invoices.length; i += batchSize) {
      const batch = invoices.slice(i, i + batchSize);
      
      for (const inv of batch) {
        try {
          const invoiceId = inv.ID || inv.INVOICE_ID;
          if (!invoiceId) {
            skipped++;
            continue;
          }
          
          // Prepare invoice data
          const invoiceData: any = {
            INVOICE_ID: invoiceId,
            F_SERIES: inv.F_SERIES || null,
            F_NUMBER: inv.F_NUMBER || null,
            OPERATION_DT: inv.OPERATION_DT ? new Date(inv.OPERATION_DT) : null,
            REG_DT: inv.REG_DT ? new Date(inv.REG_DT) : null,
            SELLER_UN_ID: inv.SELLER_UN_ID || (type === "seller" ? credential.unId : null),
            BUYER_UN_ID: inv.BUYER_UN_ID || (type === "buyer" ? credential.unId : null),
            STATUS: inv.STATUS || null,
            SEQ_NUM_S: inv.SEQ_NUM_S || null,
            S_USER_ID: inv.S_USER_ID || null,
            K_ID: inv.K_ID || null,
            K_TYPE: inv.K_TYPE || null,
            WAS_REF: inv.WAS_REF || null,
            SEQ_NUM_B: inv.SEQ_NUM_B || null,
            B_S_USER_ID: inv.B_S_USER_ID || null,
            BUYER_TIN: inv.BUYER_TIN || null,
            BUYER_NAME: inv.BUYER_NAME || null,
            NOTES: inv.NOTES || null,
            LAST_UPDATE_DATE: inv.LAST_UPDATE_DATE ? new Date(inv.LAST_UPDATE_DATE) : null,
            SA_IDENT_NO: inv.SA_IDENT_NO || null,
            ORG_NAME: inv.ORG_NAME || null,
            DOC_MOS_NOM_S: inv.DOC_MOS_NOM_S || null,
            TANXA: normalizeDecimal(inv.TANXA),
            VAT: normalizeDecimal(inv.VAT),
            AGREE_DATE: inv.AGREE_DATE ? new Date(inv.AGREE_DATE) : null,
            AGREE_S_USER_ID: inv.AGREE_S_USER_ID || null,
            REF_DATE: inv.REF_DATE ? new Date(inv.REF_DATE) : null,
            REF_S_USER_ID: inv.REF_S_USER_ID || null,
            DOC_MOS_NOM_B: inv.DOC_MOS_NOM_B || null,
            OVERHEAD_NO: inv.OVERHEAD_NO || null,
            OVERHEAD_DT: inv.OVERHEAD_DT ? new Date(inv.OVERHEAD_DT) : null,
            R_UN_ID: inv.R_UN_ID || null,
            DEC_STATUS: inv.DEC_STATUS || null,
            DECL_DATE: inv.DECL_DATE ? new Date(inv.DECL_DATE) : null,
            COMPANY_ID: String(companyId),
            COMPANY_TIN: companyTin,
            COMPANY_NAME: company,
            UPDATED_AT: new Date(),
          };
          
          // Check if invoice exists
          const existingInvoiceResult = await pool.query(
            `SELECT "INVOICE_ID" FROM ${table} WHERE "INVOICE_ID" = $1 LIMIT 1`,
            [invoiceId]
          );
          
          if (existingInvoiceResult.rows && existingInvoiceResult.rows.length > 0) {
            // Update existing
            const updateFields = Object.keys(invoiceData)
              .filter((key) => key !== "INVOICE_ID")
              .map((key, idx) => `"${key}" = $${idx + 1}`)
              .join(", ");
            
            const updateInvoiceValues = Object.values(invoiceData).filter((_, idx) => {
              const key = Object.keys(invoiceData)[idx];
              return key !== "INVOICE_ID";
            });
            updateInvoiceValues.push(invoiceId);
            
            await pool.query(
              `UPDATE ${table} SET ${updateFields} WHERE "INVOICE_ID" = $${updateInvoiceValues.length}`,
              updateInvoiceValues
            );
            updated++;
          } else {
            // Insert new
            const fields = Object.keys(invoiceData).map((key) => `"${key}"`).join(", ");
            const placeholders = Object.keys(invoiceData)
              .map((_, idx) => `$${idx + 1}`)
              .join(", ");
            const insertInvoiceValues = Object.values(invoiceData);
            
            await pool.query(
              `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`,
              insertInvoiceValues
            );
            inserted++;
          }
        } catch (error) {
          console.error(`[RS Sync] Error processing invoice:`, error);
          skipped++;
        }
      }
      
      onProgress?.({
        company,
        step: syncType,
        progress: 50 + Math.floor((i / invoices.length) * 50),
        message: `Processed ${Math.min(i + batchSize, invoices.length)}/${invoices.length} invoices...`,
      });
    }
    
    return {
      company,
      type: syncType,
      inserted,
      updated,
      skipped,
      total: invoices.length,
      error: false,
    };
  } catch (error: any) {
    console.error(`[RS Sync] Error syncing ${type} invoices:`, error);
    return {
      company,
      type: syncType,
      inserted: 0,
      updated: 0,
      skipped: 0,
      total: 0,
      error: true,
      message: error.message || "Unknown error",
    };
  }
};

/**
 * Sync invoice goods for a company
 */
export const syncInvoiceGoodsForCompany = async (
  company: string,
  companyId: number | string,
  companyTin: string,
  onProgress?: ProgressCallback
): Promise<SyncResult> => {
  const syncType = "invoice_goods";
  
  onProgress?.({
    company,
    step: syncType,
    progress: 0,
    message: `Fetching invoice IDs from database...`,
  });
  
  try {
    // Get credentials
    const [credential] = await db
      .select({
        sUser: rsUsers.sUser,
        sPassword: rsUsers.sPassword,
        userId: rsUsers.userId,
        unId: rsUsers.unId,
      })
      .from(rsUsers)
      .where(eq(rsUsers.companyName, company))
      .limit(1);
    
    if (!credential) {
      throw new Error("Credentials not found for the selected company.");
    }
    
    // Get invoice IDs from database
    const invoiceRowsResult = await db.execute(
      sql`
        SELECT DISTINCT "INVOICE_ID", 'seller' as "TYPE" 
        FROM rs.seller_invoices 
        WHERE "COMPANY_TIN" = ${companyTin} AND "INVOICE_ID" IS NOT NULL AND "INVOICE_ID" != ''
        UNION
        SELECT DISTINCT "INVOICE_ID", 'buyer' as "TYPE" 
        FROM rs.buyer_invoices 
        WHERE "COMPANY_TIN" = ${companyTin} AND "INVOICE_ID" IS NOT NULL AND "INVOICE_ID" != ''
        ORDER BY "INVOICE_ID"
      `
    );
    
    const invoiceRows = invoiceRowsResult.rows || [];
    if (invoiceRows.length === 0) {
      return {
        company,
        type: syncType,
        inserted: 0,
        updated: 0,
        skipped: 0,
        total: 0,
        error: false,
        message: `No invoices found for company ${company}`,
      };
    }
    
    const invoiceIds = invoiceRows.map((row: any) => row.INVOICE_ID);
    
    onProgress?.({
      company,
      step: syncType,
      progress: 20,
      message: `Fetching goods for ${invoiceIds.length} invoices...`,
    });
    
    // Fetch goods for all invoices with concurrency control
    const goodsMap = await fetchMultipleInvoiceGoods(
      {
        sUser: credential.sUser,
        sPassword: credential.sPassword,
        userId: credential.userId || undefined,
        unId: credential.unId || undefined,
      },
      invoiceIds,
      15 // concurrency
    );
    
    onProgress?.({
      company,
      step: syncType,
      progress: 60,
      message: `Processing invoice goods...`,
    });
    
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let totalGoods = 0;
    
    // Process goods for each invoice type
    for (const row of invoiceRows) {
      const invoiceId = String(row.INVOICE_ID);
      const invoiceType = String(row.TYPE);
      const goods = goodsMap.get(invoiceId) || [];
      totalGoods += goods.length;
      
      const table =
        invoiceType === "buyer"
          ? "rs.buyers_invoice_goods"
          : "rs.sellers_invoice_goods";
      
      for (const item of goods) {
        try {
          const goodsId = item.ID_GOODS || item.ID;
          
          if (!goodsId) {
            skipped++;
            continue;
          }
          
          // Prepare goods data
          const goodsData: any = {
            INVOICE_ID: invoiceId,
            ID_GOODS: goodsId,
            GOODS_NAME: item.GOODS_NAME || null,
            QUANTITY: normalizeDecimal(item.QUANTITY),
            UNIT: item.UNIT || null,
            PRICE: normalizeDecimal(item.PRICE),
            AMOUNT: normalizeDecimal(item.AMOUNT),
            VAT_AMOUNT: normalizeDecimal(item.VAT_AMOUNT),
            EXCISE_AMOUNT: normalizeDecimal(item.EXCISE_AMOUNT),
            COMPANY_ID: String(companyId),
            COMPANY_TIN: companyTin,
            UPDATED_AT: new Date(),
          };
          
          // Check if goods exists
          const existingInvoiceGoodsResult = await pool.query(
            `SELECT "INVOICE_ID", "ID_GOODS" FROM ${table} WHERE "INVOICE_ID" = $1 AND "ID_GOODS" = $2 LIMIT 1`,
            [invoiceId, goodsId]
          );
          
          if (existingInvoiceGoodsResult.rows && existingInvoiceGoodsResult.rows.length > 0) {
            // Update existing
            const updateFields = Object.keys(goodsData)
              .filter((key) => key !== "INVOICE_ID" && key !== "ID_GOODS")
              .map((key, idx) => `"${key}" = $${idx + 1}`)
              .join(", ");
            
            const updateInvoiceGoodsValues = Object.values(goodsData).filter((_, idx) => {
              const key = Object.keys(goodsData)[idx];
              return key !== "INVOICE_ID" && key !== "ID_GOODS";
            });
            updateInvoiceGoodsValues.push(invoiceId, goodsId);
            
            await pool.query(
              `UPDATE ${table} SET ${updateFields} WHERE "INVOICE_ID" = $${updateInvoiceGoodsValues.length - 1} AND "ID_GOODS" = $${updateInvoiceGoodsValues.length}`,
              updateInvoiceGoodsValues
            );
            updated++;
          } else {
            // Insert new
            const fields = Object.keys(goodsData).map((key) => `"${key}"`).join(", ");
            const placeholders = Object.keys(goodsData)
              .map((_, idx) => `$${idx + 1}`)
              .join(", ");
            const insertInvoiceGoodsValues = Object.values(goodsData);
            const conflictUpdate = Object.keys(goodsData)
              .filter((key) => key !== "INVOICE_ID" && key !== "ID_GOODS")
              .map((key) => `"${key}" = EXCLUDED."${key}"`)
              .join(", ");
            
            await pool.query(
              `INSERT INTO ${table} (${fields}) VALUES (${placeholders}) ON CONFLICT ("INVOICE_ID", "ID_GOODS") DO UPDATE SET ${conflictUpdate}`,
              insertInvoiceGoodsValues
            );
            inserted++;
          }
        } catch (error) {
          console.error(`[RS Sync] Error processing invoice goods:`, error);
          skipped++;
        }
      }
    }
    
    return {
      company,
      type: syncType,
      inserted,
      updated,
      skipped,
      total: totalGoods,
      error: false,
    };
  } catch (error: any) {
    console.error(`[RS Sync] Error syncing invoice goods:`, error);
    return {
      company,
      type: syncType,
      inserted: 0,
      updated: 0,
      skipped: 0,
      total: 0,
      error: true,
      message: error.message || "Unknown error",
    };
  }
};

/**
 * Auto-associate invoices with waybills
 */
export const autoAssociateInvoicesWithWaybills = async (
  company: string,
  companyId: number | string,
  companyTin: string,
  onProgress?: ProgressCallback
): Promise<SyncResult> => {
  const syncType = "auto_association";
  
  onProgress?.({
    company,
    step: syncType,
    progress: 0,
    message: `Finding waybills with invoice IDs...`,
  });
  
  try {
    // Get all waybills with invoice IDs
    const waybillRowsResult = await db.execute(
      sql`
        WITH AllWaybills AS (
          SELECT 
            "EXTERNAL_ID",
            "INVOICE_ID",
            'seller' as waybill_type
          FROM rs.sellers_waybills 
          WHERE "COMPANY_TIN" = ${companyTin}
            AND "INVOICE_ID" IS NOT NULL 
            AND "INVOICE_ID" != ''
          
          UNION ALL
          
          SELECT 
            "EXTERNAL_ID",
            "INVOICE_ID",
            'buyer' as waybill_type
          FROM rs.buyers_waybills 
          WHERE "COMPANY_TIN" = ${companyTin}
            AND "INVOICE_ID" IS NOT NULL 
            AND "INVOICE_ID" != ''
        )
        SELECT "EXTERNAL_ID", "INVOICE_ID", waybill_type
        FROM AllWaybills
      `
    );
    
    const waybillRows = waybillRowsResult.rows || [];
    if (waybillRows.length === 0) {
      return {
        company,
        type: syncType,
        inserted: 0,
        updated: 0,
        skipped: 0,
        total: 0,
        error: false,
        message: `No waybills with invoice IDs found for company ${company}`,
      };
    }
    
    onProgress?.({
      company,
      step: syncType,
      progress: 50,
      message: `Associating ${waybillRows.length} waybill-invoice pairs...`,
    });
    
    let inserted = 0;
    let skipped = 0;
    
    for (const row of waybillRows) {
      try {
        const waybillId = String(row.EXTERNAL_ID);
        const invoiceId = String(row.INVOICE_ID);
        const waybillType = String(row.waybill_type);
        
        // Determine invoice type based on waybill type
        const invoiceType = waybillType === "seller" ? "seller" : "buyer";
        
        // Check if association already exists
        const existingAssocResult = await pool.query(
          `SELECT "ID" FROM rs.waybill_invoices WHERE "WAYBILL_EXTERNAL_ID" = $1 AND "INVOICE_ID" = $2 LIMIT 1`,
          [waybillId, invoiceId]
        );
        
        if (existingAssocResult.rows && existingAssocResult.rows.length > 0) {
          skipped++;
          continue;
        }
        
        // Insert association
        await pool.query(
          `INSERT INTO rs.waybill_invoices (
            "WAYBILL_EXTERNAL_ID",
            "INVOICE_ID",
            "COMPANY_ID",
            "COMPANY_TIN",
            "COMPANY_NAME",
            "WAYBILL_TYPE",
            "INVOICE_TYPE",
            "CREATED_AT"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT ("WAYBILL_EXTERNAL_ID", "INVOICE_ID") DO NOTHING`,
          [waybillId, invoiceId, String(companyId), companyTin, company, waybillType, invoiceType]
        );
        inserted++;
      } catch (error) {
        console.error(`[RS Sync] Error associating waybill with invoice:`, error);
        skipped++;
      }
    }
    
    return {
      company,
      type: syncType,
      inserted,
      updated: 0,
      skipped,
      total: waybillRows.length,
      error: false,
    };
  } catch (error: any) {
    console.error(`[RS Sync] Error auto-associating invoices with waybills:`, error);
    return {
      company,
      type: syncType,
      inserted: 0,
      updated: 0,
      skipped: 0,
      total: 0,
      error: true,
      message: error.message || "Unknown error",
    };
  }
};

/**
 * Main sync function that orchestrates all syncs for a company
 */
export const syncCompanyData = async (
  company: string,
  companyId: number | string,
  companyTin: string,
  dateRange: DateRange,
  autoAssociate: boolean = true,
  onProgress?: ProgressCallback
): Promise<SyncResult[]> => {
  const results: SyncResult[] = [];
  
  try {
    // Reset correction baseline
    await resetCorrectionBaseline(companyTin);
    
    // Sync waybills
    onProgress?.({
      company,
      step: "seller_waybills",
      progress: 5,
      message: "Syncing seller waybills...",
    });
    const sellerWaybillsResult = await syncWaybillsForCompany(
      company,
      companyId,
      companyTin,
      dateRange,
      "seller",
      onProgress
    );
    results.push(sellerWaybillsResult);
    
    onProgress?.({
      company,
      step: "buyer_waybills",
      progress: 15,
      message: "Syncing buyer waybills...",
    });
    const buyerWaybillsResult = await syncWaybillsForCompany(
      company,
      companyId,
      companyTin,
      dateRange,
      "buyer",
      onProgress
    );
    results.push(buyerWaybillsResult);
    
    // Sync waybill goods
    onProgress?.({
      company,
      step: "seller_waybill_goods",
      progress: 25,
      message: "Syncing seller waybill goods...",
    });
    const sellerGoodsResult = await syncWaybillGoodsForCompany(
      company,
      companyId,
      companyTin,
      dateRange,
      "seller",
      onProgress
    );
    results.push(sellerGoodsResult);
    
    onProgress?.({
      company,
      step: "buyer_waybill_goods",
      progress: 35,
      message: "Syncing buyer waybill goods...",
    });
    const buyerGoodsResult = await syncWaybillGoodsForCompany(
      company,
      companyId,
      companyTin,
      dateRange,
      "buyer",
      onProgress
    );
    results.push(buyerGoodsResult);
    
    // Sync invoices
    onProgress?.({
      company,
      step: "seller_invoices",
      progress: 45,
      message: "Syncing seller invoices...",
    });
    const sellerInvoicesResult = await syncInvoicesForCompany(
      company,
      companyId,
      companyTin,
      dateRange,
      "seller",
      onProgress
    );
    results.push(sellerInvoicesResult);
    
    onProgress?.({
      company,
      step: "buyer_invoices",
      progress: 55,
      message: "Syncing buyer invoices...",
    });
    const buyerInvoicesResult = await syncInvoicesForCompany(
      company,
      companyId,
      companyTin,
      dateRange,
      "buyer",
      onProgress
    );
    results.push(buyerInvoicesResult);
    
    // Sync invoice goods
    onProgress?.({
      company,
      step: "invoice_goods",
      progress: 70,
      message: "Syncing invoice goods...",
    });
    const invoiceGoodsResult = await syncInvoiceGoodsForCompany(
      company,
      companyId,
      companyTin,
      onProgress
    );
    results.push(invoiceGoodsResult);
    
    // Auto-associate invoices with waybills
    if (autoAssociate) {
      onProgress?.({
        company,
        step: "auto_association",
        progress: 90,
        message: "Auto-associating invoices with waybills...",
      });
      const associationResult = await autoAssociateInvoicesWithWaybills(
        company,
        companyId,
        companyTin,
        onProgress
      );
      results.push(associationResult);
    }
    
    onProgress?.({
      company,
      step: "completed",
      progress: 100,
      message: "Sync completed successfully!",
    });
    
    return results;
  } catch (error: any) {
    console.error(`[RS Sync] Error in syncCompanyData:`, error);
    results.push({
      company,
      type: "sync_error",
      inserted: 0,
      updated: 0,
      skipped: 0,
      total: 0,
      error: true,
      message: error.message || "Unknown error",
    });
    return results;
  }
};

