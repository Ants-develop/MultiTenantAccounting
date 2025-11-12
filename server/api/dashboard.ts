// Dashboard API Routes
import express from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { DEFAULT_CLIENT_ID } from "../constants";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Dashboard metrics
router.get('/metrics', async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }

    // Calculate real metrics from database
    const clientId = DEFAULT_CLIENT_ID;
    
    // Total Revenue - sum of all revenue accounts' credit balances
    const revenueResult = await db.execute(sql`
      SELECT COALESCE(SUM(jel.credit_amount::numeric - jel.debit_amount::numeric), 0) as total_revenue
      FROM journal_entry_lines jel
      JOIN accounts a ON jel.account_id = a.id
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE a.client_id = ${clientId}
      AND a.type = 'revenue'
      AND je.is_posted = true
    `);

    // Outstanding Invoices - sum of unpaid invoices
    const invoicesResult = await db.execute(sql`
      SELECT COALESCE(SUM(total_amount::numeric), 0) as outstanding_invoices
      FROM invoices
      WHERE client_id = ${clientId}
      AND status IN ('sent', 'overdue')
    `);

    // Cash Balance - sum of cash accounts
    const cashResult = await db.execute(sql`
      SELECT COALESCE(SUM(jel.debit_amount::numeric - jel.credit_amount::numeric), 0) as cash_balance
      FROM journal_entry_lines jel
      JOIN accounts a ON jel.account_id = a.id
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE a.client_id = ${clientId}
      AND a.type = 'asset'
      AND a.sub_type = 'current_asset'
      AND (a.name ILIKE '%cash%' OR a.name ILIKE '%bank%')
      AND je.is_posted = true
    `);

    // Monthly Expenses - current month expense totals
    const expensesResult = await db.execute(sql`
      SELECT COALESCE(SUM(jel.debit_amount::numeric - jel.credit_amount::numeric), 0) as monthly_expenses
      FROM journal_entry_lines jel
      JOIN accounts a ON jel.account_id = a.id
      JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE a.client_id = ${clientId} 
      AND a.type = 'expense'
      AND je.is_posted = true
      AND je.date >= DATE_TRUNC('month', CURRENT_DATE)
    `);

    const metrics = {
      totalRevenue: parseFloat((revenueResult.rows[0] as any)?.total_revenue || '0'),
      outstandingInvoices: parseFloat((invoicesResult.rows[0] as any)?.outstanding_invoices || '0'),
      cashBalance: parseFloat((cashResult.rows[0] as any)?.cash_balance || '0'),
      monthlyExpenses: parseFloat((expensesResult.rows[0] as any)?.monthly_expenses || '0'),
    };

    res.json(metrics);
  } catch (error) {
    console.error('Get dashboard metrics error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Recent transactions
router.get('/recent-transactions', async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const entries = await storage.getJournalEntriesByCompany(DEFAULT_CLIENT_ID);
    const recentEntries = entries.slice(0, 10);

    res.json(recentEntries);
  } catch (error) {
    console.error('Get recent transactions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

