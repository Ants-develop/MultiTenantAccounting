// Audit Analytics API Routes
import express from "express";
import { db } from "../db";
import { sql, eq, inArray } from "drizzle-orm";
import { clients as clientsTable } from "@shared/schema";
import { requireAuth } from "../middleware/auth";
import { DEFAULT_CLIENT_ID } from "../constants";
import { getUserClientsByModule } from "../middleware/permissions";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Get audit table data with pagination and tenant filtering
router.get('/:tableName', async (req, res) => {
  try {
    const userId = (req.session as any)?.userId;
    const { tableName } = req.params;
    
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 500;
    const offset = (page - 1) * limit;

    // Parse clientIds from query parameter (comma-separated)
    const clientIdsParam = req.query.clientIds as string;
    let clientIds: number[] = [];
    
    if (clientIdsParam) {
      clientIds = clientIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    }

    // If no clientIds specified, use DEFAULT_CLIENT_ID
    if (clientIds.length === 0) {
      clientIds = [DEFAULT_CLIENT_ID];
    }

    // Validate user has permission for all requested clients
    const userClients = await getUserClientsByModule(userId, 'audit');
    const allowedClientIds = userClients.map(c => c.clientId);
    const invalidIds = clientIds.filter(id => !allowedClientIds.includes(id));

    if (invalidIds.length > 0) {
      return res.status(403).json({ message: 'Access denied to some clients' });
    }

    // Get companies to access tenant codes
    const companies = await db
      .select()
      .from(clientsTable)
      .where(inArray(clientsTable.id, clientIds));
    
    if (companies.length === 0) {
      return res.status(404).json({ message: 'No companies found' });
    }

    console.log(`[Audit API] Fetching ${tableName} for clientIds: ${clientIds.join(',')}, page: ${page}, limit: ${limit}`);

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
    // Filter by tenant_codes if available
    const tenantCodes = companies
      .filter(c => c.tenantCode)
      .map(c => `'${c.tenantCode}'`);
    
    let whereClause = '';
    let countWhereClause = '';
    
    if (tenantCodes.length > 0) {
      whereClause = `WHERE tenant_code IN (${tenantCodes.join(',')})`;
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

