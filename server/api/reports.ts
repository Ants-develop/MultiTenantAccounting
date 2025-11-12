// Reports API Routes
import express from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Trial Balance route
router.get('/trial-balance', async (req, res) => {
  try {
    if (!req.session.currentCompanyId) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const companyId = req.session.currentCompanyId;
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
      WHERE a.company_id = ${companyId} 
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
    console.error('Get trial balance error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Financial statements route
router.get('/financial-statements', async (req, res) => {
  try {
    if (!req.session.currentCompanyId) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const companyId = req.session.currentCompanyId;
    const { type, startDate, endDate } = req.query;
    
    if (type === 'profit-loss') {
      // Income Statement calculation
      const plResult = await db.execute(sql.raw(`
        SELECT 
          a.type,
          a.sub_type,
          a.name,
          CASE 
            WHEN a.type = 'revenue' THEN SUM(jel.credit_amount::numeric - jel.debit_amount::numeric)
            WHEN a.type = 'expense' THEN SUM(jel.debit_amount::numeric - jel.credit_amount::numeric)
            ELSE 0
          END as amount
        FROM accounts a
        LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE a.company_id = ${companyId} 
        AND a.type IN ('revenue', 'expense')
        AND je.is_posted = true
        ${startDate ? `AND je.date >= '${startDate}'` : ''}
        ${endDate ? `AND je.date <= '${endDate}'` : ''}
        GROUP BY a.type, a.sub_type, a.name, a.id
        HAVING SUM(jel.debit_amount::numeric) != 0 OR SUM(jel.credit_amount::numeric) != 0
        ORDER BY a.type, a.sub_type, a.name
      `));

      const accounts = plResult.rows.map((row: any) => ({
        type: row.type,
        subType: row.sub_type,
        name: row.name,
        amount: parseFloat(row.amount || '0'),
      }));

      res.json({ type: 'profit-loss', accounts });
    } else if (type === 'balance-sheet') {
      // Balance Sheet calculation
      const bsResult = await db.execute(sql.raw(`
        SELECT 
          a.type,
          a.sub_type,
          a.name,
          CASE 
            WHEN a.type IN ('asset', 'expense') THEN 
              SUM(jel.debit_amount::numeric - jel.credit_amount::numeric)
            ELSE 
              SUM(jel.credit_amount::numeric - jel.debit_amount::numeric)
          END as amount
        FROM accounts a
        LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE a.company_id = ${companyId} 
        AND a.type IN ('asset', 'liability', 'equity')
        AND (je.is_posted = true OR je.id IS NULL)
        ${endDate ? `AND je.date <= '${endDate}'` : ''}
        GROUP BY a.type, a.sub_type, a.name, a.id
        ORDER BY a.type, a.sub_type, a.name
      `));

      const accounts = bsResult.rows.map((row: any) => ({
        type: row.type,
        subType: row.sub_type,
        name: row.name,
        amount: parseFloat(row.amount || '0'),
      }));

      res.json({ type: 'balance-sheet', accounts });
    } else {
      res.status(400).json({ message: 'Invalid report type' });
    }
  } catch (error) {
    console.error('Get financial statements error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

