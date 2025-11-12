// Account Management API Routes
import express from "express";
import { db } from "../db";
import { sql, eq, and } from "drizzle-orm";
import { insertAccountSchema, accounts } from "@shared/schema";
import { storage } from "../storage";
import { requireAuth, requireCompany } from "../middleware/auth";
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from "../services/activity-logger";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Get all accounts for current company
router.get('/', requireCompany, async (req, res) => {
  try {
    const accountsList = await storage.getAccountsByCompany(req.session.currentCompanyId!);
    res.json(accountsList);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get account balances
router.get('/balances', async (req, res) => {
  try {
    if (!req.session.currentCompanyId) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const companyId = req.session.currentCompanyId;
    
    // Get account balances using SQL
    const balancesResult = await db.execute(sql`
      SELECT 
        a.id,
        a.code,
        a.name,
        a.type,
        a.sub_type,
        COALESCE(SUM(jel.debit_amount::numeric), 0) as total_debits,
        COALESCE(SUM(jel.credit_amount::numeric), 0) as total_credits,
        CASE 
          WHEN a.type IN ('asset', 'expense') THEN 
            COALESCE(SUM(jel.debit_amount::numeric - jel.credit_amount::numeric), 0)
          ELSE 
            COALESCE(SUM(jel.credit_amount::numeric - jel.debit_amount::numeric), 0)
        END as balance
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
      LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      WHERE a.company_id = ${companyId} 
      AND a.is_active = true
      AND (je.is_posted = true OR je.id IS NULL)
      GROUP BY a.id, a.code, a.name, a.type, a.sub_type
      ORDER BY a.code
    `);

    const accountBalances = balancesResult.rows.map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      type: row.type,
      subType: row.sub_type,
      totalDebits: parseFloat(row.total_debits || '0'),
      totalCredits: parseFloat(row.total_credits || '0'),
      balance: parseFloat(row.balance || '0'),
    }));

    res.json(accountBalances);
  } catch (error) {
    console.error('Get account balances error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new account
router.post('/', async (req, res) => {
  try {
    if (!req.session.currentCompanyId) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const accountData = insertAccountSchema.parse({
      ...req.body,
      companyId: req.session.currentCompanyId,
    });
    
    const account = await storage.createAccount(accountData);
    
    // Log account creation
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.ACCOUNT_CREATE,
      RESOURCE_TYPES.ACCOUNT,
      {
        userId: req.session.userId!,
        companyId: req.session.currentCompanyId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      account.id,
      undefined,
      account
    );
    
    res.json(account);
  } catch (error) {
    console.error('Create account error:', error);
    
    // Log account creation error
    await activityLogger.logError(
      ACTIVITY_ACTIONS.ACCOUNT_CREATE,
      RESOURCE_TYPES.ACCOUNT,
      {
        userId: req.session.userId!,
        companyId: req.session.currentCompanyId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      error as Error,
      undefined,
      { accountData: req.body }
    );
    
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update account
router.put('/:id', async (req, res) => {
  try {
    if (!req.session.currentCompanyId) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const accountIdRaw = req.params.id;
    const accountId = Number(accountIdRaw);
    if (!Number.isInteger(accountId)) {
      return res.status(400).json({ message: 'Invalid account id' });
    }
    const updateData = req.body;

    // Get the original account for logging
    const originalAccount = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.companyId, req.session.currentCompanyId)))
      .limit(1);

    if (!originalAccount || originalAccount.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Update the account
    const [updatedAccount] = await db
      .update(accounts)
      .set({
        ...updateData,
        updatedAt: new Date().toISOString()
      })
      .where(and(eq(accounts.id, accountId), eq(accounts.companyId, req.session.currentCompanyId)))
      .returning();

    if (!updatedAccount) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Log account update
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.ACCOUNT_UPDATE,
      RESOURCE_TYPES.ACCOUNT,
      {
        userId: req.session.userId!,
        companyId: req.session.currentCompanyId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      accountId,
      originalAccount[0],
      updatedAccount
    );

    res.json(updatedAccount);
  } catch (error) {
    console.error('Update account error:', error);
    
    // Log account update error
    await activityLogger.logError(
      ACTIVITY_ACTIONS.ACCOUNT_UPDATE,
      RESOURCE_TYPES.ACCOUNT,
      {
        userId: req.session.userId!,
        companyId: req.session.currentCompanyId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      error as Error,
      parseInt(req.params.id),
      { updateData: req.body }
    );
    
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete account
router.delete('/:id', async (req, res) => {
  try {
    if (!req.session.currentCompanyId) {
      return res.status(400).json({ message: 'No company selected' });
    }

    const accountId = parseInt(req.params.id);

    // Get the account before deletion for logging
    const [accountToDelete] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.companyId, req.session.currentCompanyId)))
      .limit(1);

    if (!accountToDelete) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Cascade delete: remove journal entry lines referencing this account,
    // and remove orphan journal entries with no lines remaining
    await db.execute(sql`
      DELETE FROM journal_entry_lines
      WHERE account_id = ${accountId}
    `);

    await db.execute(sql`
      DELETE FROM journal_entries je
      WHERE NOT EXISTS (
        SELECT 1 FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id
      )
      AND je.company_id = ${req.session.currentCompanyId}
    `);

    const deletedResult = await db
      .delete(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.companyId, req.session.currentCompanyId)))
      .returning();

    const deletedAccount = Array.isArray(deletedResult) ? deletedResult[0] : (deletedResult as any)?.rows?.[0];

    if (!deletedAccount) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Log account deletion
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.ACCOUNT_DELETE,
      RESOURCE_TYPES.ACCOUNT,
      {
        userId: req.session.userId!,
        companyId: req.session.currentCompanyId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      accountId,
      accountToDelete,
      undefined
    );

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    
    // Log account deletion error
    await activityLogger.logError(
      ACTIVITY_ACTIONS.ACCOUNT_DELETE,
      RESOURCE_TYPES.ACCOUNT,
      {
        userId: req.session.userId!,
        companyId: req.session.currentCompanyId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      error as Error,
      parseInt(req.params.id)
    );
    
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

