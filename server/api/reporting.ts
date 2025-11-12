// Reporting Module API Routes
import express from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { DEFAULT_CLIENT_ID } from "../constants";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Trial Balance route
router.get('/trial-balance', async (req, res) => {
  try {
    const clientId = DEFAULT_CLIENT_ID!;
    const { date } = req.query;
    
    let dateFilter = '';
    if (date) {
      dateFilter = `AND je.date <= '${date}'`;
    }

    const trialBalanceResult = await db.execute(sql.raw(`
      SELECT 
        a.id,
        a.code,
        a.name,
        a.type,
        CASE 
          WHEN a.type IN ('asset', 'expense') AND SUM(jel.debit_amount::numeric - jel.credit_amount::numeric) > 0 THEN 
            SUM(jel.debit_amount::numeric - jel.credit_amount::numeric)
          ELSE 0
        END as debit_balance,
        CASE 
          WHEN a.type IN ('liability', 'equity', 'revenue') AND SUM(jel.credit_amount::numeric - jel.debit_amount::numeric) > 0 THEN 
            SUM(jel.credit_amount::numeric - jel.debit_amount::numeric)
          WHEN a.type IN ('asset', 'expense') AND SUM(jel.debit_amount::numeric - jel.credit_amount::numeric) < 0 THEN 
            ABS(SUM(jel.debit_amount::numeric - jel.credit_amount::numeric))
          ELSE 0
        END as credit_balance
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE a.company_id = ${clientId} 
      AND a.is_active = true
      AND (je.is_posted = true OR je.id IS NULL)
      ${dateFilter}
      GROUP BY a.id, a.code, a.name, a.type
      HAVING COALESCE(SUM(jel.debit_amount::numeric), 0) != 0 OR COALESCE(SUM(jel.credit_amount::numeric), 0) != 0
      ORDER BY a.code
    `));

    const trialBalance = trialBalanceResult.rows.map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
      debitBalance: parseFloat(row.debit_balance || '0'),
      creditBalance: parseFloat(row.credit_balance || '0'),
    }));

    // Calculate totals
    const totalDebits = trialBalance.reduce((sum, account) => sum + account.debitBalance, 0);
    const totalCredits = trialBalance.reduce((sum, account) => sum + account.creditBalance, 0);

    res.json({
      accounts: trialBalance,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
    });
  } catch (error) {
    console.error('[Reporting] Get trial balance error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Profit & Loss Statement route
router.get('/profit-loss', async (req, res) => {
  try {
    const clientId = DEFAULT_CLIENT_ID!;
    const { startDate, endDate } = req.query;
    
    const plResult = await db.execute(sql.raw(`
      SELECT 
        a.type,
        a.sub_type,
        a.name,
        a.code,
        CASE 
          WHEN a.type = 'revenue' THEN SUM(jel.credit_amount::numeric - jel.debit_amount::numeric)
          WHEN a.type = 'expense' THEN SUM(jel.debit_amount::numeric - jel.credit_amount::numeric)
          ELSE 0
        END as amount
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE a.company_id = ${clientId} 
      AND a.type IN ('revenue', 'expense')
      AND je.is_posted = true
      ${startDate ? `AND je.date >= '${startDate}'` : ''}
      ${endDate ? `AND je.date <= '${endDate}'` : ''}
      GROUP BY a.type, a.sub_type, a.name, a.code, a.id
      HAVING SUM(jel.debit_amount::numeric) != 0 OR SUM(jel.credit_amount::numeric) != 0
      ORDER BY a.type DESC, a.sub_type, a.code
    `));

    const accounts = plResult.rows.map((row: any) => ({
      type: row.type,
      subType: row.sub_type,
      name: row.name,
      code: row.code,
      amount: parseFloat(row.amount || '0'),
    }));

    const revenue = accounts.filter(a => a.type === 'revenue');
    const expenses = accounts.filter(a => a.type === 'expense');
    const totalRevenue = revenue.reduce((sum, a) => sum + a.amount, 0);
    const totalExpenses = expenses.reduce((sum, a) => sum + a.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    res.json({
      type: 'profit-loss',
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netIncome,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('[Reporting] Get profit & loss error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Balance Sheet route
router.get('/balance-sheet', async (req, res) => {
  try {
    const clientId = DEFAULT_CLIENT_ID!;
    const { date } = req.query;
    
    const bsResult = await db.execute(sql.raw(`
      SELECT 
        a.type,
        a.sub_type,
        a.name,
        a.code,
        CASE 
          WHEN a.type IN ('asset', 'expense') THEN 
            SUM(jel.debit_amount::numeric - jel.credit_amount::numeric)
          ELSE 
            SUM(jel.credit_amount::numeric - jel.debit_amount::numeric)
        END as amount
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE a.company_id = ${clientId} 
      AND a.type IN ('asset', 'liability', 'equity')
      AND (je.is_posted = true OR je.id IS NULL)
      ${date ? `AND je.date <= '${date}'` : ''}
      GROUP BY a.type, a.sub_type, a.name, a.code, a.id
      ORDER BY a.type, a.sub_type, a.code
    `));

    const accounts = bsResult.rows.map((row: any) => ({
      type: row.type,
      subType: row.sub_type,
      name: row.name,
      code: row.code,
      amount: parseFloat(row.amount || '0'),
    }));

    const assets = accounts.filter(a => a.type === 'asset');
    const liabilities = accounts.filter(a => a.type === 'liability');
    const equity = accounts.filter(a => a.type === 'equity');
    const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + a.amount, 0);
    const totalEquity = equity.reduce((sum, a) => sum + a.amount, 0);

    res.json({
      type: 'balance-sheet',
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      date
    });
  } catch (error) {
    console.error('[Reporting] Get balance sheet error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Cash Flow Statement route
router.get('/cash-flow', async (req, res) => {
  try {
    const clientId = DEFAULT_CLIENT_ID!;
    const { startDate, endDate } = req.query;
    
    // Get cash account movements
    const cashFlowResult = await db.execute(sql.raw(`
      SELECT 
        je.date,
        je.description,
        jel.debit_amount,
        jel.credit_amount,
        a.name as account_name,
        a.type as account_type
      FROM journal_entries je
      JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
      JOIN accounts a ON jel.account_id = a.id
      WHERE je.company_id = ${clientId}
      AND je.is_posted = true
      AND a.sub_type = 'cash'
      ${startDate ? `AND je.date >= '${startDate}'` : ''}
      ${endDate ? `AND je.date <= '${endDate}'` : ''}
      ORDER BY je.date DESC
    `));

    const transactions = cashFlowResult.rows.map((row: any) => ({
      date: row.date,
      description: row.description,
      debitAmount: parseFloat(row.debit_amount || '0'),
      creditAmount: parseFloat(row.credit_amount || '0'),
      accountName: row.account_name,
      accountType: row.account_type,
    }));

    const totalInflows = transactions.reduce((sum, t) => sum + t.debitAmount, 0);
    const totalOutflows = transactions.reduce((sum, t) => sum + t.creditAmount, 0);
    const netCashFlow = totalInflows - totalOutflows;

    res.json({
      type: 'cash-flow',
      transactions,
      totalInflows,
      totalOutflows,
      netCashFlow,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('[Reporting] Get cash flow error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Financial Statements (unified route - for backward compatibility)
router.get('/financial-statements', async (req, res) => {
  try {
    const clientId = DEFAULT_CLIENT_ID!;
    const { type, startDate, endDate } = req.query;
    
    if (type === 'profit-loss') {
      // Call profit-loss endpoint logic
      const plResult = await db.execute(sql.raw(`
        SELECT 
          a.type,
          a.sub_type,
          a.name,
          a.code,
          CASE 
            WHEN a.type = 'revenue' THEN SUM(jel.credit_amount::numeric - jel.debit_amount::numeric)
            WHEN a.type = 'expense' THEN SUM(jel.debit_amount::numeric - jel.credit_amount::numeric)
            ELSE 0
          END as amount
        FROM accounts a
        LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE a.company_id = ${clientId} 
        AND a.type IN ('revenue', 'expense')
        AND je.is_posted = true
        ${startDate ? `AND je.date >= '${startDate}'` : ''}
        ${endDate ? `AND je.date <= '${endDate}'` : ''}
        GROUP BY a.type, a.sub_type, a.name, a.code, a.id
        HAVING SUM(jel.debit_amount::numeric) != 0 OR SUM(jel.credit_amount::numeric) != 0
        ORDER BY a.type DESC, a.sub_type, a.code
      `));

      const accounts = plResult.rows.map((row: any) => ({
        type: row.type,
        subType: row.sub_type,
        name: row.name,
        code: row.code,
        amount: parseFloat(row.amount || '0'),
      }));

      res.json({ type: 'profit-loss', accounts });
    } else if (type === 'balance-sheet') {
      // Call balance-sheet endpoint logic
      const bsResult = await db.execute(sql.raw(`
        SELECT 
          a.type,
          a.sub_type,
          a.name,
          a.code,
          CASE 
            WHEN a.type IN ('asset', 'expense') THEN 
              SUM(jel.debit_amount::numeric - jel.credit_amount::numeric)
            ELSE 
              SUM(jel.credit_amount::numeric - jel.debit_amount::numeric)
          END as amount
        FROM accounts a
        LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE a.company_id = ${clientId} 
        AND a.type IN ('asset', 'liability', 'equity')
        AND (je.is_posted = true OR je.id IS NULL)
        ${endDate ? `AND je.date <= '${endDate}'` : ''}
        GROUP BY a.type, a.sub_type, a.name, a.code, a.id
        ORDER BY a.type, a.sub_type, a.code
      `));

      const accounts = bsResult.rows.map((row: any) => ({
        type: row.type,
        subType: row.sub_type,
        name: row.name,
        code: row.code,
        amount: parseFloat(row.amount || '0'),
      }));

      res.json({ type: 'balance-sheet', accounts });
    } else {
      res.status(400).json({ message: 'Invalid report type' });
    }
  } catch (error) {
    console.error('[Reporting] Get financial statements error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Custom Reports - placeholder for future implementation
router.get('/custom', async (req, res) => {
  try {
    // TODO: Implement custom report retrieval
    res.json({ 
      message: 'Custom reports feature coming soon',
      reports: []
    });
  } catch (error) {
    console.error('[Reporting] Get custom reports error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/custom', async (req, res) => {
  try {
    // TODO: Implement custom report creation
    res.status(501).json({ message: 'Custom report creation not yet implemented' });
  } catch (error) {
    console.error('[Reporting] Create custom report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/custom/:id', async (req, res) => {
  try {
    // TODO: Implement specific custom report retrieval
    res.status(501).json({ message: 'Custom report retrieval not yet implemented' });
  } catch (error) {
    console.error('[Reporting] Get custom report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Report Scheduling - placeholder for future implementation
router.post('/schedule', async (req, res) => {
  try {
    // TODO: Implement report scheduling
    res.status(501).json({ message: 'Report scheduling not yet implemented' });
  } catch (error) {
    console.error('[Reporting] Schedule report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

