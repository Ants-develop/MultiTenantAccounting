// Bank Module API Routes
import express from "express";
import { db } from "../db";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { bankAccounts, rawBankTransactions, normalizedBankTransactions, insertBankAccountSchema, insertRawBankTransactionSchema } from "@shared/schema";
import { activityLogger } from "../services/activity-logger";
import { DEFAULT_CLIENT_ID } from "../constants";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// ===== BANK ACCOUNTS CRUD =====

// GET /api/bank/accounts - Get all bank accounts for the current company
router.get('/accounts', async (req, res) => {
  try {
    const companyId = DEFAULT_CLIENT_ID!;
    
    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.clientId, companyId))
      .orderBy(desc(bankAccounts.createdAt));

    res.json(accounts);
  } catch (error) {
    console.error('[Bank] Get accounts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/bank/accounts - Create a new bank account
router.post('/accounts', async (req, res) => {
  try {
    const companyId = DEFAULT_CLIENT_ID!;
    const userId = req.session.userId!;
    
    // Validate request body
    const validationResult = insertBankAccountSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: validationResult.error.flatten().fieldErrors
      });
    }

    const data = validationResult.data;
    
    // If this is marked as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(bankAccounts)
        .set({ isDefault: false })
        .where(eq(bankAccounts.clientId, companyId));
    }

    const [account] = await db
      .insert(bankAccounts)
      .values({
        ...data,
        companyId,
        currentBalance: data.openingBalance || "0",
      })
      .returning();

    // Log activity
    await activityLogger.logCRUD(
      'CREATE',
      'bank_account',
      {
        userId,
        companyId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
      account.id,
      undefined,
      { accountName: account.accountName }
    );

    res.status(201).json(account);
  } catch (error) {
    console.error('[Bank] Create account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/bank/accounts/:id - Update a bank account
router.put('/accounts/:id', async (req, res) => {
  try {
    const companyId = DEFAULT_CLIENT_ID!;
    const userId = req.session.userId!;
    const { id } = req.params;
    
    // Validate request body (partial update)
    const validationResult = insertBankAccountSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: validationResult.error.flatten().fieldErrors
      });
    }

    const data = validationResult.data;
    
    // If this is being marked as default, unset other defaults
    if (data.isDefault) {
      await db
        .update(bankAccounts)
        .set({ isDefault: false })
        .where(and(
          eq(bankAccounts.clientId, companyId),
          sql`${bankAccounts.id} != ${id}`
        ));
    }

    const [account] = await db
      .update(bankAccounts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(bankAccounts.id, parseInt(id)),
        eq(bankAccounts.clientId, companyId)
      ))
      .returning();

    if (!account) {
      return res.status(404).json({ message: 'Bank account not found' });
    }

    // Log activity
    await activityLogger.logCRUD(
      'UPDATE',
      'bank_account',
      {
        userId,
        companyId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
      account.id,
      undefined,
      data
    );

    res.json(account);
  } catch (error) {
    console.error('[Bank] Update account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/bank/accounts/:id - Delete a bank account
router.delete('/accounts/:id', async (req, res) => {
  try {
    const companyId = DEFAULT_CLIENT_ID!;
    const userId = req.session.userId!;
    const { id } = req.params;
    
    const [account] = await db
      .delete(bankAccounts)
      .where(and(
        eq(bankAccounts.id, parseInt(id)),
        eq(bankAccounts.clientId, companyId)
      ))
      .returning();

    if (!account) {
      return res.status(404).json({ message: 'Bank account not found' });
    }

    // Log activity
    await activityLogger.logCRUD(
      'DELETE',
      'bank_account',
      {
        userId,
        companyId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
      account.id,
      { accountName: account.accountName },
      undefined
    );

    res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    console.error('[Bank] Delete account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== RAW BANK TRANSACTIONS CRUD =====

// GET /api/bank/transactions - Get all raw bank transactions with pagination
router.get('/transactions', async (req, res) => {
  try {
    const companyId = DEFAULT_CLIENT_ID!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = (page - 1) * limit;
    
    // Optional filters
    const bankAccountId = req.query.bankAccountId as string;
    const search = req.query.search as string;

    let whereConditions = [eq(rawBankTransactions.clientId, companyId)];
    
    if (bankAccountId) {
      whereConditions.push(eq(rawBankTransactions.bankAccountId, parseInt(bankAccountId)));
    }
    
    if (search) {
      whereConditions.push(
        sql`(
          ${rawBankTransactions.description} ILIKE ${`%${search}%`} OR
          ${rawBankTransactions.partnerName} ILIKE ${`%${search}%`} OR
          ${rawBankTransactions.accountNumber} ILIKE ${`%${search}%`}
        )`
      );
    }

    const [transactions, [{ total }]] = await Promise.all([
      db
        .select()
        .from(rawBankTransactions)
        .where(and(...whereConditions))
        .orderBy(desc(rawBankTransactions.documentDate))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(rawBankTransactions)
        .where(and(...whereConditions))
    ]);

    res.json({
      data: transactions,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      }
    });
  } catch (error) {
    console.error('[Bank] Get transactions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/bank/transactions - Create a single raw bank transaction
router.post('/transactions', async (req, res) => {
  try {
    const companyId = DEFAULT_CLIENT_ID!;
    const userId = req.session.userId!;
    
    // Validate request body
    const validationResult = insertRawBankTransactionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: validationResult.error.flatten().fieldErrors
      });
    }

    const data = validationResult.data;
    
    // Check for duplicate unique_transaction_id
    const existing = await db
      .select()
      .from(rawBankTransactions)
      .where(and(
        eq(rawBankTransactions.clientId, companyId),
        eq(rawBankTransactions.uniqueTransactionId, data.uniqueTransactionId)
      ))
      .limit(1);
    
    if (existing.length > 0) {
      return res.status(409).json({ 
        message: 'Duplicate transaction',
        details: `Transaction with ID ${data.uniqueTransactionId} already exists`
      });
    }

    const [transaction] = await db
      .insert(rawBankTransactions)
      .values({
        ...data,
        companyId,
        importedBy: userId,
      })
      .returning();

    // Log activity
    await activityLogger.logCRUD(
      'CREATE',
      'raw_bank_transaction',
      {
        userId,
        companyId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
      transaction.id,
      undefined,
      { movementId: transaction.movementId }
    );

    res.status(201).json(transaction);
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({ 
        message: 'Duplicate transaction',
        details: 'This transaction already exists in the system'
      });
    }
    console.error('[Bank] Create transaction error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/bank/transactions/import - Bulk import raw bank transactions from CSV
router.post('/transactions/import', async (req, res) => {
  try {
    const companyId = DEFAULT_CLIENT_ID!;
    const userId = req.session.userId!;
    const { transactions: transactionsData, bankAccountId } = req.body;
    
    if (!Array.isArray(transactionsData) || transactionsData.length === 0) {
      return res.status(400).json({ message: 'No transactions provided' });
    }

    if (!bankAccountId) {
      return res.status(400).json({ message: 'Bank account is required for importing transactions' });
    }

    const results = {
      imported: 0,
      duplicates: 0,
      errors: [] as any[],
    };

    for (const txData of transactionsData) {
      try {
        // Validate each transaction
        const validationResult = insertRawBankTransactionSchema.safeParse(txData);
        if (!validationResult.success) {
          console.error('[Bank Import] Validation failed for transaction:', {
            transaction: txData,
            errors: validationResult.error.flatten().fieldErrors
          });
          results.errors.push({
            transaction: txData,
            error: validationResult.error.flatten().fieldErrors
          });
          continue;
        }

        const data = validationResult.data;
        
        // Check for duplicate
        const existing = await db
          .select()
          .from(rawBankTransactions)
          .where(and(
            eq(rawBankTransactions.clientId, companyId),
            eq(rawBankTransactions.uniqueTransactionId, data.uniqueTransactionId)
          ))
          .limit(1);
        
        if (existing.length > 0) {
          results.duplicates++;
          continue;
        }

        // Insert transaction
        await db
          .insert(rawBankTransactions)
          .values({
            ...data,
            companyId,
            bankAccountId: parseInt(bankAccountId),
            importedBy: userId,
          });
        
        results.imported++;
      } catch (error: any) {
        if (error.code === '23505') {
          results.duplicates++;
        } else {
          results.errors.push({
            transaction: txData,
            error: error.message
          });
        }
      }
    }

    // Log activity
    await activityLogger.logCRUD(
      'IMPORT',
      'raw_bank_transactions',
      {
        userId,
        companyId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
      undefined,
      undefined,
      { imported: results.imported, duplicates: results.duplicates, errors: results.errors.length }
    );

    res.json({
      message: 'Import completed',
      results,
    });
  } catch (error) {
    console.error('[Bank] Import transactions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/bank/transactions/:id - Update a raw bank transaction
router.put('/transactions/:id', async (req, res) => {
  try {
    const companyId = DEFAULT_CLIENT_ID!;
    const userId = req.session.userId!;
    const { id } = req.params;
    
    // Validate request body (partial update)
    const validationResult = insertRawBankTransactionSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: validationResult.error.flatten().fieldErrors
      });
    }

    const data = validationResult.data;

    const [transaction] = await db
      .update(rawBankTransactions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(rawBankTransactions.id, parseInt(id)),
        eq(rawBankTransactions.clientId, companyId)
      ))
      .returning();

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Log activity
    await activityLogger.logCRUD(
      'UPDATE',
      'raw_bank_transaction',
      {
        userId,
        companyId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
      transaction.id,
      undefined,
      data
    );

    res.json(transaction);
  } catch (error) {
    console.error('[Bank] Update transaction error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/bank/transactions/:id - Delete a raw bank transaction
router.delete('/transactions/:id', async (req, res) => {
  try {
    const companyId = DEFAULT_CLIENT_ID!;
    const userId = req.session.userId!;
    const { id } = req.params;
    
    const [transaction] = await db
      .delete(rawBankTransactions)
      .where(and(
        eq(rawBankTransactions.id, parseInt(id)),
        eq(rawBankTransactions.clientId, companyId)
      ))
      .returning();

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Log activity
    await activityLogger.logCRUD(
      'DELETE',
      'raw_bank_transaction',
      {
        userId,
        companyId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
      transaction.id,
      { movementId: transaction.movementId },
      undefined
    );

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('[Bank] Delete transaction error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/bank/transactions/normalize - Normalize raw transactions with balance and sequence validation
router.post('/transactions/normalize', async (req, res) => {
  try {
    const companyId = DEFAULT_CLIENT_ID!;
    const userId = req.session.userId!;
    const { bankAccountId } = req.body; // Optional: normalize specific account or all

    // Get bank accounts to normalize
    let accountsToNormalize;
    if (bankAccountId) {
      accountsToNormalize = await db
        .select()
        .from(bankAccounts)
        .where(and(
          eq(bankAccounts.clientId, companyId),
          eq(bankAccounts.id, parseInt(bankAccountId))
        ));
    } else {
      accountsToNormalize = await db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.clientId, companyId));
    }

    if (accountsToNormalize.length === 0) {
      return res.status(404).json({ message: 'No bank accounts found' });
    }

    let totalProcessed = 0;
    let totalErrors = 0;

    for (const account of accountsToNormalize) {
      try {
        // Get all raw transactions for this account, sorted chronologically
        const rawTransactions = await db
          .select()
          .from(rawBankTransactions)
          .where(and(
            eq(rawBankTransactions.clientId, companyId),
            eq(rawBankTransactions.bankAccountId, account.id)
          ))
          .orderBy(rawBankTransactions.documentDate, rawBankTransactions.movementId);

        if (rawTransactions.length === 0) continue;

        // Delete existing normalized records for this account
        await db
          .delete(normalizedBankTransactions)
          .where(and(
            eq(normalizedBankTransactions.clientId, companyId),
            eq(normalizedBankTransactions.bankAccountId, account.id)
          ));

        // Process transactions and validate
        let previousBalance = parseFloat(account.openingBalance || "0");
        const normalizedRecords = [];

        for (let i = 0; i < rawTransactions.length; i++) {
          const tx = rawTransactions[i];
          const amount = parseFloat(tx.amount);
          const actualBalance = tx.endBalance ? parseFloat(tx.endBalance) : null;
          
          // Calculate expected balance
          let expectedBalance;
          if (tx.debitCredit === 'CREDIT') {
            expectedBalance = previousBalance + amount;
          } else {
            expectedBalance = previousBalance - amount;
          }

          // Validate balance
          const balanceValid = actualBalance !== null 
            ? Math.abs(expectedBalance - actualBalance) < 0.01 // Allow 1 cent rounding difference
            : true; // If no actual balance provided, assume valid

          // Validate sequence (check for date gaps)
          let sequenceValid = true;
          const validationErrors: string[] = [];

          if (i > 0 && tx.documentDate && rawTransactions[i - 1].documentDate) {
            const currentDate = tx.documentDate instanceof Date ? tx.documentDate : new Date(tx.documentDate);
            const prevDocDate = rawTransactions[i - 1].documentDate!;
            const prevDate = prevDocDate instanceof Date ? prevDocDate : new Date(prevDocDate);
            
            // Check if dates go backwards
            if (currentDate < prevDate) {
              sequenceValid = false;
              validationErrors.push('Transaction date is before previous transaction');
            }
          }

          // Check for balance mismatch
          if (!balanceValid) {
            validationErrors.push(`Balance mismatch: expected ${expectedBalance.toFixed(2)}, got ${actualBalance?.toFixed(2)}`);
          }

          // Create normalized record
          normalizedRecords.push({
            companyId,
            bankAccountId: account.id,
            rawTransactionId: tx.id,
            sequenceNumber: i + 1,
            movementId: tx.movementId,
            documentDate: tx.documentDate,
            debitCredit: tx.debitCredit,
            amount: tx.amount,
            description: tx.description,
            previousBalance: previousBalance.toString(),
            expectedBalance: expectedBalance.toString(),
            actualBalance: actualBalance?.toString() || null,
            balanceValid,
            sequenceValid,
            validationErrors: validationErrors.length > 0 ? validationErrors : null,
            normalizedBy: userId,
          });

          // Update previous balance for next iteration
          previousBalance = actualBalance !== null ? actualBalance : expectedBalance;
        }

        // Insert normalized records
        if (normalizedRecords.length > 0) {
          await db.insert(normalizedBankTransactions).values(normalizedRecords);
          totalProcessed += normalizedRecords.length;
        }

      } catch (error: any) {
        console.error(`[Bank] Error normalizing account ${account.id}:`, error);
        totalErrors++;
      }
    }

    // Log activity
    await activityLogger.logCRUD(
      'NORMALIZE',
      'bank_transactions',
      {
        userId,
        companyId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
      undefined,
      undefined,
      { 
        accountsProcessed: accountsToNormalize.length,
        transactionsProcessed: totalProcessed,
        errors: totalErrors
      }
    );

    res.json({
      message: 'Normalization completed',
      accountsProcessed: accountsToNormalize.length,
      transactionsProcessed: totalProcessed,
      errors: totalErrors
    });

  } catch (error) {
    console.error('[Bank] Normalize transactions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/bank/transactions/normalized - Get normalized transactions with pagination
router.get('/transactions/normalized', async (req, res) => {
  try {
    const companyId = DEFAULT_CLIENT_ID!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = (page - 1) * limit;
    const bankAccountId = req.query.bankAccountId as string;

    let whereConditions = [eq(normalizedBankTransactions.clientId, companyId)];
    
    if (bankAccountId && bankAccountId !== 'all') {
      whereConditions.push(eq(normalizedBankTransactions.bankAccountId, parseInt(bankAccountId)));
    }

    const [transactions, [{ total }]] = await Promise.all([
      db
        .select()
        .from(normalizedBankTransactions)
        .where(and(...whereConditions))
        .orderBy(normalizedBankTransactions.bankAccountId, normalizedBankTransactions.sequenceNumber)
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(normalizedBankTransactions)
        .where(and(...whereConditions))
    ]);

    res.json({
      data: transactions,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      }
    });
  } catch (error) {
    console.error('[Bank] Get normalized transactions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
