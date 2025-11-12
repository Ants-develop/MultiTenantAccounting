-- Bank Module Tables
-- Migration: 003_bank_module.sql
-- Description: Create tables for bank accounts, raw transactions, and normalized transactions

-- UP
-- Create bank module tables

-- Bank Accounts Table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(100),
  iban VARCHAR(50),
  bank_name VARCHAR(255),
  currency VARCHAR(10) DEFAULT 'USD',
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_company_id ON bank_accounts(company_id);
CREATE INDEX idx_bank_accounts_is_default ON bank_accounts(is_default);
CREATE INDEX idx_bank_accounts_is_active ON bank_accounts(is_active);

-- Raw Bank Transactions Table
CREATE TABLE IF NOT EXISTS raw_bank_transactions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  bank_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE CASCADE,
  
  -- Transaction identification
  movement_id VARCHAR(255) NOT NULL,
  unique_transaction_id VARCHAR(500) NOT NULL,
  
  -- Transaction details
  debit_credit VARCHAR(10) NOT NULL, -- "DEBIT" or "CREDIT"
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  end_balance DECIMAL(15,2),
  currency VARCHAR(10) NOT NULL,
  
  -- Account information
  account_number VARCHAR(100) NOT NULL,
  account_name VARCHAR(255),
  additional_information TEXT,
  
  -- Document details
  document_date TIMESTAMP,
  document_number VARCHAR(100),
  
  -- Partner information
  partner_account_number VARCHAR(100),
  partner_name VARCHAR(255),
  partner_tax_code VARCHAR(50),
  partner_bank_code VARCHAR(50),
  partner_bank VARCHAR(255),
  
  -- Intermediary bank
  intermediary_bank_code VARCHAR(50),
  intermediary_bank VARCHAR(255),
  
  -- Additional transaction details
  charge_detail TEXT,
  operation_code VARCHAR(50),
  additional_description TEXT,
  exchange_rate DECIMAL(15,6),
  transaction_type VARCHAR(50),
  
  -- Audit fields
  imported_at TIMESTAMP DEFAULT NOW(),
  imported_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(company_id, unique_transaction_id)
);

CREATE INDEX idx_raw_bank_transactions_company_id ON raw_bank_transactions(company_id);
CREATE INDEX idx_raw_bank_transactions_bank_account_id ON raw_bank_transactions(bank_account_id);
CREATE INDEX idx_raw_bank_transactions_document_date ON raw_bank_transactions(document_date);
CREATE INDEX idx_raw_bank_transactions_movement_id ON raw_bank_transactions(movement_id);

-- Normalized Bank Transactions Table - Validated transactions with sequence and balance checks
CREATE TABLE IF NOT EXISTS normalized_bank_transactions (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  bank_account_id INTEGER NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  raw_transaction_id INTEGER NOT NULL REFERENCES raw_bank_transactions(id) ON DELETE CASCADE,
  
  -- Sequence information
  sequence_number INTEGER NOT NULL, -- Position within bank account's transaction sequence
  
  -- Transaction details (denormalized for faster queries)
  movement_id VARCHAR(255) NOT NULL,
  document_date TIMESTAMP,
  debit_credit VARCHAR(10) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  
  -- Balance validation
  previous_balance DECIMAL(15,2),
  expected_balance DECIMAL(15,2), -- Calculated: previous + credit - debit
  actual_balance DECIMAL(15,2), -- From transaction record
  balance_valid BOOLEAN DEFAULT true NOT NULL,
  
  -- Sequence validation
  sequence_valid BOOLEAN DEFAULT true NOT NULL,
  
  -- Validation errors
  validation_errors TEXT[], -- Array of error messages
  
  -- Audit fields
  normalized_at TIMESTAMP DEFAULT NOW(),
  normalized_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(raw_transaction_id)
);

CREATE INDEX idx_normalized_bank_transactions_company_id ON normalized_bank_transactions(company_id);
CREATE INDEX idx_normalized_bank_transactions_bank_account_id ON normalized_bank_transactions(bank_account_id);
CREATE INDEX idx_normalized_bank_transactions_raw_transaction_id ON normalized_bank_transactions(raw_transaction_id);
CREATE INDEX idx_bank_account_sequence_idx ON normalized_bank_transactions(bank_account_id, sequence_number);

-- Comments
COMMENT ON TABLE bank_accounts IS 'Stores bank account information for companies';
COMMENT ON TABLE raw_bank_transactions IS 'Stores raw bank transactions imported from bank statements';
COMMENT ON TABLE normalized_bank_transactions IS 'Stores validated and normalized bank transactions with sequence and balance validation';

-- DOWN
-- Drop bank module tables (rollback)
DROP TABLE IF EXISTS normalized_bank_transactions CASCADE;
DROP TABLE IF EXISTS raw_bank_transactions CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;
