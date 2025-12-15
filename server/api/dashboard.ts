// Dashboard API Routes
import express from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { getUserClientsByModule } from "../middleware/permissions";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Helper to get target client IDs
async function getTargetClientIds(req: any, res: any): Promise<number[] | null> {
  const userId = req.user?.id;
  const clientIdParam = req.query.clientId as string;
  
  const userClients = await getUserClientsByModule(userId, 'dashboard');
  const allowedClientIds = userClients.map(c => c.clientId);
  
  if (clientIdParam) {
    const requestedId = parseInt(clientIdParam);
    if (isNaN(requestedId)) {
      res.status(400).json({ message: 'Invalid Client ID' });
      return null;
    }
    if (!allowedClientIds.includes(requestedId)) {
      res.status(403).json({ message: 'Access denied to this client' });
      return null;
    }
    return [requestedId];
  }
  
  return allowedClientIds;
}

// Dashboard metrics
router.get('/metrics', async (req, res) => {
  try {
    const targetIds = await getTargetClientIds(req, res);
    if (!targetIds) return;
    
    if (targetIds.length === 0) {
      return res.json({
        totalRevenue: 0,
        outstandingInvoices: 0,
        cashBalance: 0,
        netIncome: 0
      });
    }

    // Calculate real metrics from database
    
    // Total Revenue - sum of all revenue accounts' credit balances
    const revenueResult = await db.execute(sql`
      SELECT COALESCE(SUM(jel.credit_amount::numeric - jel.debit_amount::numeric), 0) as total_revenue
      FROM journal_entry_lines jel
      JOIN accounts a ON jel.account_id = a.id
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE a.client_id = ANY(${targetIds})
      AND a.type = 'revenue'
      AND je.is_posted = true
    `);

    // Outstanding Invoices - sum of unpaid invoices
    const invoicesResult = await db.execute(sql`
      SELECT COALESCE(SUM(total_amount::numeric), 0) as outstanding_invoices
      FROM invoices
      WHERE client_id = ANY(${targetIds})
      AND status IN ('sent', 'overdue')
    `);

    // Cash Balance - sum of cash accounts
    const cashResult = await db.execute(sql`
      SELECT COALESCE(SUM(jel.debit_amount::numeric - jel.credit_amount::numeric), 0) as cash_balance
      FROM journal_entry_lines jel
      JOIN accounts a ON jel.account_id = a.id
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE a.client_id = ANY(${targetIds})
      AND a.type = 'asset'
      AND a.sub_type = 'current_asset'
      AND (a.name ILIKE '%cash%' OR a.name ILIKE '%bank%')
      AND je.is_posted = true
    `);

    // Net Income - Revenue minus Expenses
    const netIncomeResult = await db.execute(sql`
      SELECT COALESCE(SUM(
        CASE 
          WHEN a.type = 'revenue' THEN (jel.credit_amount::numeric - jel.debit_amount::numeric)
          WHEN a.type = 'expense' THEN (jel.credit_amount::numeric - jel.debit_amount::numeric) -- Expenses are debit normal, so this subtracts them if we sum everything
          ELSE 0 
        END
      ), 0) as net_income
      FROM journal_entry_lines jel
      JOIN accounts a ON jel.account_id = a.id
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE a.client_id = ANY(${targetIds})
      AND a.type IN ('revenue', 'expense')
      AND je.is_posted = true
    `);

    const totalRevenue = parseFloat((revenueResult as any)[0]?.total_revenue || '0');
    const outstandingInvoices = parseFloat((invoicesResult as any)[0]?.outstanding_invoices || '0');
    const cashBalance = parseFloat((cashResult as any)[0]?.cash_balance || '0');
    const netIncome = parseFloat((netIncomeResult as any)[0]?.net_income || '0');

    res.json({
      totalRevenue,
      outstandingInvoices,
      cashBalance,
      netIncome
    });
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Recent activity
router.get('/activity', async (req, res) => {
  try {
    const targetIds = await getTargetClientIds(req, res);
    if (!targetIds) return;
    
    if (targetIds.length === 0) {
      return res.json([]);
    }

    const activityResult = await db.execute(sql`
      SELECT 
        je.id,
        je.date,
        je.description,
        je.reference,
        je.total_amount,
        c.name as client_name
      FROM journal_entries je
      LEFT JOIN clients c ON je.client_id = c.id
      WHERE je.client_id = ANY(${targetIds})
      ORDER BY je.created_at DESC
      LIMIT 10
    `);

    res.json(activityResult);
  } catch (error) {
    console.error('Get dashboard activity error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

