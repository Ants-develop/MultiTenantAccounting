-- Bank Module Tables
-- Migration: 003_bank_module.sql
-- Description: Create tables for bank accounts, statements, and reconciliation

-- UP
-- Create bank module tables

-- Bank Accounts Table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100),
  bank_name VARCHAR(255),
  currency VARCHAR(10) DEFAULT 'USD',
  current_balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_company_id ON bank_accounts(company_id);
CREATE INDEX idx_bank_accounts_is_active ON bank_accounts(is_active);

-- Bank Statements Table
CREATE TABLE IF NOT EXISTS bank_statements (
  id SERIAL PRIMARY KEY,
  bank_account_id INTEGER NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  statement_date DATE NOT NULL,
  opening_balance DECIMAL(15,2),
  closing_balance DECIMAL(15,2),
  file_path VARCHAR(500),
  imported_at TIMESTAMP DEFAULT NOW(),
  imported_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_bank_statements_bank_account_id ON bank_statements(bank_account_id);
CREATE INDEX idx_bank_statements_statement_date ON bank_statements(statement_date);

-- Bank Reconciliation Table
CREATE TABLE IF NOT EXISTS bank_reconciliation (
  id SERIAL PRIMARY KEY,
  bank_account_id INTEGER NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL,
  statement_line_id INTEGER,
  reconciled_date TIMESTAMP DEFAULT NOW(),
  reconciled_by INTEGER REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bank_reconciliation_bank_account_id ON bank_reconciliation(bank_account_id);
CREATE INDEX idx_bank_reconciliation_journal_entry_id ON bank_reconciliation(journal_entry_id);
CREATE INDEX idx_bank_reconciliation_status ON bank_reconciliation(status);

-- Comments
COMMENT ON TABLE bank_accounts IS 'Stores bank account information for companies';
COMMENT ON TABLE bank_statements IS 'Stores imported bank statements';
COMMENT ON TABLE bank_reconciliation IS 'Tracks reconciliation between bank statements and journal entries';

-- DOWN
-- Drop bank module tables (rollback)
DROP TABLE IF EXISTS bank_reconciliation CASCADE;
DROP TABLE IF EXISTS bank_statements CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;

