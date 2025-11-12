// Bank Module API Routes
import express from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { requireAuth, requireCompany } from "../middleware/auth";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);
router.use(requireCompany);

// GET /api/bank/accounts - Get all bank accounts for the current company
router.get('/accounts', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    
    const result = await db.execute(sql.raw(`
      SELECT 
        id,
        company_id,
        account_name,
        account_number,
        bank_name,
        currency,
        current_balance,
        is_active,
        created_at
      FROM bank_accounts
      WHERE company_id = ${companyId}
      ORDER BY created_at DESC
    `));

    res.json(result.rows);
  } catch (error) {
    console.error('[Bank] Get accounts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/bank/accounts - Create a new bank account
router.post('/accounts', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const { accountName, accountNumber, bankName, currency, currentBalance } = req.body;
    
    const result = await db.execute(sql.raw(`
      INSERT INTO bank_accounts (
        company_id, account_name, account_number, bank_name, currency, current_balance
      )
      VALUES (
        ${companyId}, 
        '${accountName}', 
        '${accountNumber || ''}', 
        '${bankName || ''}', 
        '${currency || 'USD'}',
        ${currentBalance || 0}
      )
      RETURNING *
    `));

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[Bank] Create account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/bank/accounts/:id - Update a bank account
router.put('/accounts/:id', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const { id } = req.params;
    const { accountName, accountNumber, bankName, currency, currentBalance, isActive } = req.body;
    
    const updates = [];
    if (accountName !== undefined) updates.push(`account_name = '${accountName}'`);
    if (accountNumber !== undefined) updates.push(`account_number = '${accountNumber}'`);
    if (bankName !== undefined) updates.push(`bank_name = '${bankName}'`);
    if (currency !== undefined) updates.push(`currency = '${currency}'`);
    if (currentBalance !== undefined) updates.push(`current_balance = ${currentBalance}`);
    if (isActive !== undefined) updates.push(`is_active = ${isActive}`);
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    const result = await db.execute(sql.raw(`
      UPDATE bank_accounts
      SET ${updates.join(', ')}
      WHERE id = ${id} AND company_id = ${companyId}
      RETURNING *
    `));

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bank account not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Bank] Update account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/bank/accounts/:id - Delete a bank account
router.delete('/accounts/:id', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const { id } = req.params;
    
    const result = await db.execute(sql.raw(`
      DELETE FROM bank_accounts
      WHERE id = ${id} AND company_id = ${companyId}
      RETURNING *
    `));

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bank account not found' });
    }

    res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    console.error('[Bank] Delete account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/bank/statements - Get bank statements for an account
router.get('/statements', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const { bankAccountId } = req.query;
    
    if (!bankAccountId) {
      return res.status(400).json({ message: 'Bank account ID is required' });
    }
    
    // Verify bank account belongs to company
    const accountCheck = await db.execute(sql.raw(`
      SELECT id FROM bank_accounts
      WHERE id = ${bankAccountId} AND company_id = ${companyId}
    `));
    
    if (accountCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this bank account' });
    }
    
    const result = await db.execute(sql.raw(`
      SELECT *
      FROM bank_statements
      WHERE bank_account_id = ${bankAccountId}
      ORDER BY statement_date DESC
    `));

    res.json(result.rows);
  } catch (error) {
    console.error('[Bank] Get statements error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/bank/import - Import a bank statement
router.post('/import', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const { bankAccountId, statementDate, openingBalance, closingBalance, filePath } = req.body;
    
    // Verify bank account belongs to company
    const accountCheck = await db.execute(sql.raw(`
      SELECT id FROM bank_accounts
      WHERE id = ${bankAccountId} AND company_id = ${companyId}
    `));
    
    if (accountCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this bank account' });
    }
    
    const result = await db.execute(sql.raw(`
      INSERT INTO bank_statements (
        bank_account_id, statement_date, opening_balance, closing_balance, file_path
      )
      VALUES (
        ${bankAccountId}, 
        '${statementDate}', 
        ${openingBalance}, 
        ${closingBalance},
        '${filePath || ''}'
      )
      RETURNING *
    `));

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[Bank] Import statement error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/bank/reconciliation/:id - Get a reconciliation record
router.get('/reconciliation/:id', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const { id } = req.params;
    
    const result = await db.execute(sql.raw(`
      SELECT br.*, ba.account_name, ba.company_id
      FROM bank_reconciliation br
      JOIN bank_accounts ba ON br.bank_account_id = ba.id
      WHERE br.id = ${id} AND ba.company_id = ${companyId}
    `));

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reconciliation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Bank] Get reconciliation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/bank/reconciliation - Create a new reconciliation
router.post('/reconciliation', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const userId = req.session.userId!;
    const { bankAccountId, journalEntryId, statementLineId, status } = req.body;
    
    // Verify bank account belongs to company
    const accountCheck = await db.execute(sql.raw(`
      SELECT id FROM bank_accounts
      WHERE id = ${bankAccountId} AND company_id = ${companyId}
    `));
    
    if (accountCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied to this bank account' });
    }
    
    const result = await db.execute(sql.raw(`
      INSERT INTO bank_reconciliation (
        bank_account_id, journal_entry_id, statement_line_id, 
        reconciled_date, reconciled_by, status
      )
      VALUES (
        ${bankAccountId}, 
        ${journalEntryId || null}, 
        ${statementLineId || null},
        NOW(),
        ${userId},
        '${status || 'pending'}'
      )
      RETURNING *
    `));

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[Bank] Create reconciliation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/bank/reconciliation/:id - Update a reconciliation
router.put('/reconciliation/:id', async (req, res) => {
  try {
    const companyId = req.session.currentCompanyId!;
    const { id } = req.params;
    const { status, journalEntryId, statementLineId } = req.body;
    
    const updates = [];
    if (status !== undefined) updates.push(`status = '${status}'`);
    if (journalEntryId !== undefined) updates.push(`journal_entry_id = ${journalEntryId}`);
    if (statementLineId !== undefined) updates.push(`statement_line_id = ${statementLineId}`);
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    const result = await db.execute(sql.raw(`
      UPDATE bank_reconciliation br
      SET ${updates.join(', ')}
      FROM bank_accounts ba
      WHERE br.id = ${id} 
        AND br.bank_account_id = ba.id 
        AND ba.company_id = ${companyId}
      RETURNING br.*
    `));

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reconciliation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Bank] Update reconciliation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

