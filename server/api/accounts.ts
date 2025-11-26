// Account Management API Routes
import express from "express";
import { db } from "../db";
import { sql, eq, and, inArray } from "drizzle-orm";
import { insertAccountSchema, accounts, users, clients } from "@shared/schema";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from "../services/activity-logger";
import { DEFAULT_CLIENT_ID } from "../constants";
import { getUserClientsByModule } from "../middleware/permissions";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Get all accounts for specified clients
// Query params: ?clientIds=1,2,3 (optional, defaults to DEFAULT_CLIENT_ID)
router.get('/', async (req, res) => {
  try {
    const userId = (req.session as any)?.userId;

    // Parse clientIds from query parameter (comma-separated)
    const clientIdsParam = req.query.clientIds as string;
    let clientIds: number[] = [];

    if (clientIdsParam) {
      clientIds = clientIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    }

    // Check if user is global admin
    const userInfo = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const isGlobalAdmin = userInfo[0]?.globalRole === 'global_administrator';

    console.log(`[Accounts API] User ${userId} - isGlobalAdmin: ${isGlobalAdmin}, globalRole: ${userInfo[0]?.globalRole}`);
    console.log(`[Accounts API] Requested clientIds: ${clientIds.join(',')}`);

    // Validate user has permission for requested clients (skip for global admins)
    if (!isGlobalAdmin) {
      const userClients = await getUserClientsByModule(userId, 'accounting');
      const allowedClientIds = userClients.map(c => c.clientId);

      console.log(`[Accounts API] Regular user - allowed clients: ${allowedClientIds.join(',')}`);

      // If no clientIds specified, use all accessible clients
      if (clientIds.length === 0) {
        clientIds = allowedClientIds;
      } else {
        // Validate requested client IDs
        const invalidIds = clientIds.filter(id => !allowedClientIds.includes(id));

        if (invalidIds.length > 0) {
          console.log(`[Accounts API] Access denied - invalid client IDs: ${invalidIds.join(',')}`);
          return res.status(403).json({ message: 'Access denied to some clients' });
        }
      }
    } else {
      console.log(`[Accounts API] Global admin - bypassing permission checks`);
      // Global admin: if no specific clients requested, get all clients
      if (clientIds.length === 0) {
        const allClients = await db.select({ id: clients.id }).from(clients);
        clientIds = allClients.map(c => c.id);
        console.log(`[Accounts API] Global admin - loading all clients: ${clientIds.join(',')}`);
      }
      // Global admins can access any requested client IDs without validation
    }

    console.log(`[Accounts API] Final clientIds to query: ${clientIds.join(',')}`);


    // Get accounts for all requested clients
    const accountsList = await db
      .select()
      .from(accounts)
      .where(inArray(accounts.clientId, clientIds))
      .orderBy(accounts.code);

    res.json(accountsList);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get account balances
// Query params: ?clientIds=1,2,3 (optional, defaults to DEFAULT_CLIENT_ID)
router.get('/balances', async (req, res) => {
  try {
    const userId = (req.session as any)?.userId;

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
    const userClients = await getUserClientsByModule(userId, 'accounting');
    const allowedClientIds = userClients.map(c => c.clientId);
    const invalidIds = clientIds.filter(id => !allowedClientIds.includes(id));

    if (invalidIds.length > 0) {
      return res.status(403).json({ message: 'Access denied to some clients' });
    }

    // Create SQL IN clause for multiple company IDs
    const companyIdsList = clientIds.join(',');

    // Get account balances using SQL
    const balancesResult = await db.execute(sql`
      SELECT 
        a.id,
        a.code,
        a.name,
        a.type,
        a.sub_type,
        a.company_id,
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
      WHERE a.company_id IN (${sql.raw(companyIdsList)})
      AND a.is_active = true
      AND (je.is_posted = true OR je.id IS NULL)
      GROUP BY a.id, a.code, a.name, a.type, a.sub_type, a.company_id
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
    const userId = (req.session as any)?.userId;

    // Get clientId from request body, fallback to first selected client or DEFAULT_CLIENT_ID
    const requestedClientId = req.body.clientId || DEFAULT_CLIENT_ID;

    if (!requestedClientId) {
      return res.status(400).json({ message: 'No client specified' });
    }

    // Validate user has permission to create accounts for this client
    const userClients = await getUserClientsByModule(userId, 'accounting');
    const allowedClientIds = userClients.map(c => c.clientId);

    if (!allowedClientIds.includes(requestedClientId)) {
      return res.status(403).json({ message: 'Access denied to this client' });
    }

    const accountData = insertAccountSchema.parse({
      ...req.body,
      clientId: requestedClientId,
    });

    const account = await storage.createAccount(accountData);

    // Log account creation
    await activityLogger.logCRUD(
      ACTIVITY_ACTIONS.ACCOUNT_CREATE,
      RESOURCE_TYPES.ACCOUNT,
      {
        userId: req.session.userId!,
        companyId: requestedClientId,
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
        companyId: req.body.clientId || DEFAULT_CLIENT_ID,
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
    const userId = (req.session as any)?.userId;
    const accountIdRaw = req.params.id;
    const accountId = Number(accountIdRaw);

    if (!Number.isInteger(accountId)) {
      return res.status(400).json({ message: 'Invalid account id' });
    }

    // Get the original account
    const [originalAccount] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!originalAccount) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Validate user has permission for this account's client
    const userClients = await getUserClientsByModule(userId, 'accounting');
    const allowedClientIds = userClients.map(c => c.clientId);

    if (!allowedClientIds.includes(originalAccount.clientId)) {
      return res.status(403).json({ message: 'Access denied to this client' });
    }

    // Prevent changing clientId (accounts cannot be moved between clients)
    const updateData = { ...req.body };
    delete updateData.clientId;

    // Update the account
    const [updatedAccount] = await db
      .update(accounts)
      .set({
        ...updateData,
        updatedAt: new Date().toISOString()
      })
      .where(eq(accounts.id, accountId))
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
        companyId: originalAccount.clientId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent")
      },
      accountId,
      originalAccount,
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
        companyId: DEFAULT_CLIENT_ID,
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
    const userId = (req.session as any)?.userId;
    const accountId = parseInt(req.params.id);

    // Get the account before deletion for logging and permission check
    const [accountToDelete] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!accountToDelete) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Validate user has permission for this account's client
    const userClients = await getUserClientsByModule(userId, 'accounting');
    const allowedClientIds = userClients.map(c => c.clientId);

    if (!allowedClientIds.includes(accountToDelete.clientId)) {
      return res.status(403).json({ message: 'Access denied to this client' });
    }

    // Cascade delete: remove journal entry lines referencing this account,
    // and remove orphan journal entries with no lines remaining
    await db.execute(sql`
      DELETE FROM accounting.journal_entry_lines
      WHERE account_id = ${accountId}
    `);

    await db.execute(sql`
      DELETE FROM accounting.journal_entries je
      WHERE NOT EXISTS (
        SELECT 1 FROM accounting.journal_entry_lines jel WHERE jel.journal_entry_id = je.id
      )
      AND je.client_id = ${accountToDelete.clientId}
    `);

    const deletedResult = await db
      .delete(accounts)
      .where(eq(accounts.id, accountId))
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
        companyId: accountToDelete.clientId,
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
        companyId: DEFAULT_CLIENT_ID,
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

