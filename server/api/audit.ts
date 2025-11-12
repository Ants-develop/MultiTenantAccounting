// Audit Analytics API Routes
import express from "express";
import { db } from "../db";
import { sql, eq } from "drizzle-orm";
import { companies as companiesTable } from "@shared/schema";
import { requireAuth, requireCompany } from "../middleware/auth";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(requireCompany);

// Get audit table data with pagination and tenant filtering
router.get('/:tableName', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const { tableName } = req.params;
    
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 500;
    const offset = (page - 1) * limit;

    // Get company to access tenant code
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    console.log(`[Audit API] Fetching ${tableName} for companyId: ${companyId}, tenantCode: ${company.tenantCode || 'none'}, page: ${page}, limit: ${limit}`);

    // Validate table name to prevent SQL injection
    const allowedTables = [
      '1690_stock', 'accounts_summary', 'accrued_interest', 'analytics',
      'analytics_balance_summary', 'capital_accounts', 'capital_accounts_summary',
      'creditors_avans', 'debitors_avans', 'dublicate_creditors', 'dublicate_debitors',
      'high_amount_per_quantity_summary', 'negativ_creditor', 'negativ_debitor',
      'negative_balance_141_summary', 'negative_balance_311_summary', 'negative_balance_summary',
      'negative_loans', 'negative_stock', 'negativ_interest', 'negativ_salary',
      'positive_balance_summary', 'revaluation_status_summary', 'salary_expense', 'writeoff_stock'
    ];

    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({ message: 'Invalid table name' });
    }

    // Build the query dynamically
    // Filter by tenant_code if available (following journal entries pattern)
    let whereClause = '';
    let countWhereClause = '';
    
    if (company.tenantCode) {
      whereClause = `WHERE tenant_code = '${company.tenantCode}'`;
      countWhereClause = whereClause;
    }

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit."${tableName}"
      ${countWhereClause}
    `;
    
    const countResult = await db.execute(sql.raw(countQuery));
    const total = parseInt((countResult.rows[0] as any).total || '0');
    const totalPages = Math.ceil(total / limit);

    // Get the actual data with pagination
    const dataQuery = `
      SELECT *
      FROM audit."${tableName}"
      ${whereClause}
      ORDER BY tenant_code, posting_month DESC NULLS LAST
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
    console.error(`[Audit API] Error fetching audit data:`, error);
    res.status(500).json({ 
      message: 'Failed to fetch audit data',
      error: error.message 
    });
  }
});

export default router;

