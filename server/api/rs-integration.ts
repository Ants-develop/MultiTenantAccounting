// RS Integration Module API Routes
import express from "express";
import { db } from "../db";
import { companies as companiesTable } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireCompany } from "../middleware/auth";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);
// Note: In single-company mode, we use a default clientId of 1
const DEFAULT_CLIENT_ID = parseInt(process.env.DEFAULT_CLIENT_ID || '1');
router.use(requireCompany);

// GET /api/rs-integration/:tableName - Fetch RS.ge data with pagination
router.get('/:tableName', async (req, res) => {
  try {
    const clientId = DEFAULT_CLIENT_ID!;
    const { tableName } = req.params;
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 500;
    const offset = (page - 1) * limit;

    // Get company code (TIN)
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, clientId));
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    console.log(`[RS Integration] Fetching ${tableName} for clientId: ${clientId}, code: ${company.code || 'none'}, page: ${page}, limit: ${limit}`);

    // Whitelist allowed tables
    const allowedTables = [
      'seller_invoices',
      'buyer_invoices',
      'spec_seller_invoices',
      'spec_buyer_invoices',
      'sellers_waybills',
      'buyers_waybills',
      'sellers_waybill_goods',
      'buyers_waybill_goods',
      'sellers_invoice_goods',
      'buyers_invoice_goods',
      'spec_invoice_goods',
      'waybill_invoices'
    ];

    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({ message: 'Invalid table name' });
    }

    // Build WHERE clause for company filtering
    let whereClause = '';
    let countWhereClause = '';
    
    if (company.code) {
      // Filter by COMPANY_TIN using company code
      whereClause = `WHERE "COMPANY_TIN" = '${company.code}'`;
      countWhereClause = whereClause;
    }

    // Count total records
    const countQuery = `
      SELECT COUNT(*) as total
      FROM rs."${tableName}"
      ${countWhereClause}
    `;
    
    const countResult = await db.execute(sql.raw(countQuery));
    const total = parseInt((countResult.rows[0] as any).total || '0');
    const totalPages = Math.ceil(total / limit);

    // Fetch paginated data
    const dataQuery = `
      SELECT *
      FROM rs."${tableName}"
      ${whereClause}
      ORDER BY "UPDATED_AT" DESC NULLS LAST, "ID" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const dataResult = await db.execute(sql.raw(dataQuery));

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });

  } catch (error: any) {
    console.error(`[RS Integration] Error fetching RS data:`, error);
    res.status(500).json({ 
      message: 'Failed to fetch RS integration data',
      error: error.message 
    });
  }
});

export default router;

