-- UP
-- Initial schema migration for multi-tenant accounting system

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  global_role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Clients table (renamed from companies - now represents client companies in single-company model)
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  tax_id TEXT,
  fiscal_year_start INTEGER DEFAULT 1,
  currency TEXT DEFAULT 'GEL',
  tenant_code INTEGER UNIQUE,
  manager TEXT,
  accounting_software TEXT,
  id_code TEXT,
  verification_status TEXT DEFAULT 'not_registered',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User-Company relationships with roles
CREATE TABLE IF NOT EXISTS user_companies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  client_id INTEGER REFERENCES clients(id) NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, client_id)
);

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  sub_type TEXT,
  parent_id INTEGER REFERENCES accounts(id),
  account_class TEXT,
  category TEXT,
  is_subaccount_allowed BOOLEAN DEFAULT false,
  is_foreign_currency BOOLEAN DEFAULT false,
  is_analytical BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, code)
);

-- General Ledger (Raw MSSQL Import Storage)
-- Purpose: Store raw data from MSSQL GeneralLedger before copying to journal_entries
CREATE TABLE IF NOT EXISTS general_ledger (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  -- Tenant information
  tenant_code NUMERIC(18, 0),
  tenant_name TEXT,
  abonent TEXT,
  postings_period TIMESTAMP,
  register BYTEA, -- binary(16) equivalent
  branch TEXT,
  content TEXT,
  responsible_person TEXT,
  -- Debit account information
  account_dr TEXT,
  account_name_dr TEXT,
  analytic_dr TEXT,
  analytic_ref_dr BYTEA, -- binary(16) equivalent
  id_dr TEXT,
  legal_form_dr TEXT,
  country_dr TEXT,
  profit_tax_dr BOOLEAN,
  withholding_tax_dr BOOLEAN,
  double_taxation_dr BOOLEAN,
  pension_scheme_participant_dr BOOLEAN,
  -- Credit account information
  account_cr TEXT,
  account_name_cr TEXT,
  analytic_cr TEXT,
  analytic_ref_cr BYTEA, -- binary(16) equivalent
  id_cr TEXT,
  legal_form_cr TEXT,
  country_cr TEXT,
  profit_tax_cr BOOLEAN,
  withholding_tax_cr BOOLEAN,
  double_taxation_cr BOOLEAN,
  pension_scheme_participant_cr BOOLEAN,
  -- Financial information
  currency TEXT,
  amount NUMERIC(21, 2),
  amount_cur NUMERIC(21, 2),
  quantity_dr NUMERIC(21, 4),
  quantity_cr NUMERIC(21, 4),
  rate NUMERIC(19, 13),
  document_rate NUMERIC(19, 13),
  -- Tax invoice information
  tax_invoice_number TEXT,
  tax_invoice_date TIMESTAMP,
  tax_invoice_series TEXT,
  waybill_number TEXT,
  attached_files NUMERIC(17, 5),
  -- Document information
  doc_type TEXT,
  doc_date TIMESTAMP,
  doc_number TEXT,
  document_creation_date TIMESTAMP,
  document_modify_date TIMESTAMP,
  document_comments TEXT,
  posting_number NUMERIC(18, 0),
  -- System fields
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) NOT NULL,
  entry_number TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  description TEXT NOT NULL,
  reference TEXT,
  total_amount DECIMAL(15,2) NOT NULL,
  user_id INTEGER REFERENCES users(id),
  is_posted BOOLEAN DEFAULT false,
  -- Internal tracking: Link to general_ledger table for MSSQL import tracking
  mssql_record_id INTEGER REFERENCES general_ledger(id),
  -- MSSQL parity fields (all optional/nullable for legacy data import)
  -- Tenant information
  tenant_code INTEGER,
  tenant_name TEXT,
  abonent TEXT,
  postings_period TIMESTAMP,
  register TEXT, -- BYTEA stored as hex text
  branch TEXT,
  content_text TEXT,
  responsible_person TEXT,
  -- Debit account information
  account_dr TEXT,
  account_name_dr TEXT,
  analytic_dr TEXT,
  analytic_ref_dr TEXT, -- BYTEA stored as hex text
  id_dr TEXT,
  legal_form_dr TEXT,
  country_dr TEXT,
  profit_tax_dr BOOLEAN,
  withholding_tax_dr BOOLEAN,
  double_taxation_dr BOOLEAN,
  pension_scheme_participant_dr BOOLEAN,
  -- Credit account information
  account_cr TEXT,
  account_name_cr TEXT,
  analytic_cr TEXT,
  analytic_ref_cr TEXT, -- BYTEA stored as hex text
  id_cr TEXT,
  legal_form_cr TEXT,
  country_cr TEXT,
  profit_tax_cr BOOLEAN,
  withholding_tax_cr BOOLEAN,
  double_taxation_cr BOOLEAN,
  pension_scheme_participant_cr BOOLEAN,
  -- Financial information
  currency TEXT,
  amount NUMERIC(21, 2),
  amount_cur NUMERIC(21, 2),
  quantity_dr NUMERIC(21, 4),
  quantity_cr NUMERIC(21, 4),
  rate NUMERIC(19, 13),
  document_rate NUMERIC(19, 13),
  -- Tax invoice information
  tax_invoice_number TEXT,
  tax_invoice_date TIMESTAMP,
  tax_invoice_series TEXT,
  waybill_number TEXT,
  attached_files NUMERIC(17, 5),
  -- Document information
  doc_type TEXT,
  doc_date TIMESTAMP,
  doc_number TEXT,
  document_creation_date TIMESTAMP,
  document_modify_date TIMESTAMP,
  document_comments TEXT,
  posting_number INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, entry_number)
);

-- Journal Entry Lines
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id SERIAL PRIMARY KEY,
  journal_entry_id INTEGER REFERENCES journal_entries(id) NOT NULL,
  account_id INTEGER REFERENCES accounts(id) NOT NULL,
  description TEXT,
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) NOT NULL,
  customer_id INTEGER REFERENCES customers(id) NOT NULL,
  invoice_number TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  due_date TIMESTAMP NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'draft',
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, invoice_number)
);

-- Bills
CREATE TABLE IF NOT EXISTS bills (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) NOT NULL,
  vendor_id INTEGER REFERENCES vendors(id) NOT NULL,
  bill_number TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  due_date TIMESTAMP NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'draft',
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, bill_number)
);

-- Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  client_id INTEGER REFERENCES clients(id),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id INTEGER,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Company Settings
CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  -- Notification settings
  email_notifications BOOLEAN DEFAULT TRUE,
  invoice_reminders BOOLEAN DEFAULT TRUE,
  payment_alerts BOOLEAN DEFAULT TRUE,
  report_reminders BOOLEAN DEFAULT FALSE,
  system_updates BOOLEAN DEFAULT TRUE,
  -- Financial settings
  auto_numbering BOOLEAN DEFAULT TRUE,
  invoice_prefix TEXT DEFAULT 'INV',
  bill_prefix TEXT DEFAULT 'BILL',
  journal_prefix TEXT DEFAULT 'JE',
  decimal_places INTEGER DEFAULT 2,
  negative_format TEXT DEFAULT 'minus',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  time_zone TEXT DEFAULT 'America/New_York',
  -- Security settings
  require_password_change BOOLEAN DEFAULT FALSE,
  password_expire_days INTEGER DEFAULT 90,
  session_timeout INTEGER DEFAULT 30,
  enable_two_factor BOOLEAN DEFAULT FALSE,
  allow_multiple_sessions BOOLEAN DEFAULT TRUE,
  -- Integration settings
  bank_connection BOOLEAN DEFAULT FALSE,
  payment_gateway BOOLEAN DEFAULT FALSE,
  tax_service BOOLEAN DEFAULT FALSE,
  reporting_tools BOOLEAN DEFAULT FALSE,
  -- Backup settings
  auto_backup BOOLEAN DEFAULT FALSE,
  backup_frequency TEXT DEFAULT 'weekly',
  retention_days INTEGER DEFAULT 30,
  backup_location TEXT DEFAULT 'cloud',
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Main Company Settings
-- Dedicated table for the accounting firm's own company information
-- Only ONE row should exist in this table (system-wide main company)
CREATE TABLE IF NOT EXISTS main_company_settings (
  id SERIAL PRIMARY KEY,
  
  -- Company Profile
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  tax_id VARCHAR(50),
  
  -- Financial Settings
  fiscal_year_start INTEGER CHECK (fiscal_year_start >= 1 AND fiscal_year_start <= 12),
  currency VARCHAR(3) DEFAULT 'GEL',
  date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
  decimal_places INTEGER DEFAULT 2 CHECK (decimal_places >= 0 AND decimal_places <= 4),
  
  -- Notification Settings
  email_notifications BOOLEAN DEFAULT true,
  invoice_reminders BOOLEAN DEFAULT true,
  payment_alerts BOOLEAN DEFAULT true,
  report_reminders BOOLEAN DEFAULT false,
  system_updates BOOLEAN DEFAULT true,
  
  -- Document Settings
  auto_numbering BOOLEAN DEFAULT true,
  invoice_prefix VARCHAR(20) DEFAULT 'INV',
  bill_prefix VARCHAR(20) DEFAULT 'BILL',
  journal_prefix VARCHAR(20) DEFAULT 'JE',
  negative_format VARCHAR(20) DEFAULT 'minus',
  
  -- Security Settings
  require_password_change BOOLEAN DEFAULT false,
  password_expire_days INTEGER DEFAULT 90,
  session_timeout INTEGER DEFAULT 30,
  enable_two_factor BOOLEAN DEFAULT false,
  allow_multiple_sessions BOOLEAN DEFAULT true,
  
  -- Integration Settings
  bank_connection BOOLEAN DEFAULT false,
  payment_gateway BOOLEAN DEFAULT false,
  tax_service BOOLEAN DEFAULT false,
  reporting_tools BOOLEAN DEFAULT false,
  
  -- Backup Settings
  auto_backup BOOLEAN DEFAULT false,
  backup_frequency VARCHAR(20) DEFAULT 'weekly',
  retention_days INTEGER DEFAULT 30,
  backup_location VARCHAR(50) DEFAULT 'cloud',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT only_one_main_company CHECK (id = 1)
);

-- Module-Level Permissions: Controls access to entire modules
CREATE TABLE IF NOT EXISTS user_client_modules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, client_id, module)
);

-- Feature-Level Permissions: Controls access to specific features within modules
CREATE TABLE IF NOT EXISTS user_client_features (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL,
  feature VARCHAR(100) NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, client_id, module, feature)
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_client_id ON user_companies(client_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_user_company ON user_companies(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_accounts_client_id ON accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_accounts_parent_id ON accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_code ON clients(tenant_code);
CREATE INDEX IF NOT EXISTS idx_clients_verification_status ON clients(verification_status);
CREATE INDEX IF NOT EXISTS idx_general_ledger_client_id ON general_ledger(client_id);
CREATE INDEX IF NOT EXISTS idx_general_ledger_account_dr ON general_ledger(account_dr);
CREATE INDEX IF NOT EXISTS idx_general_ledger_account_cr ON general_ledger(account_cr);
CREATE INDEX IF NOT EXISTS idx_general_ledger_doc_date ON general_ledger(doc_date);
CREATE INDEX IF NOT EXISTS idx_general_ledger_posting_number ON general_ledger(posting_number);
CREATE INDEX IF NOT EXISTS idx_general_ledger_tenant_code ON general_ledger(tenant_code);
CREATE INDEX IF NOT EXISTS idx_company_settings_client_id ON company_settings(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_main_company_single_row 
ON main_company_settings (id) 
WHERE id = 1;
CREATE INDEX IF NOT EXISTS idx_journal_entries_client_id ON journal_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON journal_entries(client_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_customers_client_id ON customers(client_id);
CREATE INDEX IF NOT EXISTS idx_vendors_client_id ON vendors(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_client_id ON bills(client_id);
CREATE INDEX IF NOT EXISTS idx_bills_vendor_id ON bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_code ON journal_entries(tenant_code);
CREATE INDEX IF NOT EXISTS idx_journal_entries_account_dr ON journal_entries(account_dr);
CREATE INDEX IF NOT EXISTS idx_journal_entries_account_cr ON journal_entries(account_cr);
CREATE INDEX IF NOT EXISTS idx_journal_entries_doc_date ON journal_entries(doc_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_posting_number ON journal_entries(posting_number);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_client_id ON activity_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_client_modules_user_client ON user_client_modules(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_user_client_modules_module ON user_client_modules(module);
CREATE INDEX IF NOT EXISTS idx_user_client_features_user_client ON user_client_features(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_user_client_features_feature ON user_client_features(feature);

-- Add constraints for business rules (only if they don't exist)
DO $$
BEGIN
  -- Add constraint for journal entry lines
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_debit_credit_not_both' 
    AND conrelid = 'journal_entry_lines'::regclass
  ) THEN
    ALTER TABLE journal_entry_lines 
    ADD CONSTRAINT chk_debit_credit_not_both 
    CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0));
  END IF;

  -- Add constraint for accounts
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_account_type' 
    AND conrelid = 'accounts'::regclass
  ) THEN
    ALTER TABLE accounts 
    ADD CONSTRAINT chk_account_type 
    CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense'));
  END IF;

  -- Add constraint for clients
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_fiscal_year_start' 
    AND conrelid = 'clients'::regclass
  ) THEN
    ALTER TABLE clients 
    ADD CONSTRAINT chk_fiscal_year_start 
    CHECK (fiscal_year_start >= 1 AND fiscal_year_start <= 12);
  END IF;
END $$;

-- Create trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_general_ledger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER trigger_update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_settings_updated_at();

CREATE TRIGGER trigger_update_general_ledger_updated_at
  BEFORE UPDATE ON general_ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_general_ledger_updated_at();

-- DOWN
-- Drop all tables and indexes in reverse order

-- Drop triggers and functions
DROP TRIGGER IF EXISTS trigger_update_general_ledger_updated_at ON general_ledger;
DROP TRIGGER IF EXISTS trigger_update_company_settings_updated_at ON company_settings;
DROP FUNCTION IF EXISTS update_general_ledger_updated_at();
DROP FUNCTION IF EXISTS update_company_settings_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_user_client_features_feature;
DROP INDEX IF EXISTS idx_user_client_features_user_client;
DROP INDEX IF EXISTS idx_user_client_modules_module;
DROP INDEX IF EXISTS idx_user_client_modules_user_client;
DROP INDEX IF EXISTS idx_activity_logs_timestamp;
DROP INDEX IF EXISTS idx_activity_logs_client_id;
DROP INDEX IF EXISTS idx_activity_logs_user_id;
DROP INDEX IF EXISTS idx_journal_entries_posting_number;
DROP INDEX IF EXISTS idx_journal_entries_doc_date;
DROP INDEX IF EXISTS idx_journal_entries_account_cr;
DROP INDEX IF EXISTS idx_journal_entries_account_dr;
DROP INDEX IF EXISTS idx_journal_entries_tenant_code;
DROP INDEX IF EXISTS idx_company_settings_client_id;
DROP INDEX IF EXISTS idx_general_ledger_tenant_code;
DROP INDEX IF EXISTS idx_general_ledger_posting_number;
DROP INDEX IF EXISTS idx_general_ledger_doc_date;
DROP INDEX IF EXISTS idx_general_ledger_account_cr;
DROP INDEX IF EXISTS idx_general_ledger_account_dr;
DROP INDEX IF EXISTS idx_general_ledger_client_id;
DROP INDEX IF EXISTS idx_clients_tenant_code;
DROP INDEX IF EXISTS idx_bills_user_id;
DROP INDEX IF EXISTS idx_bills_vendor_id;
DROP INDEX IF EXISTS idx_bills_client_id;
DROP INDEX IF EXISTS idx_invoices_user_id;
DROP INDEX IF EXISTS idx_invoices_customer_id;
DROP INDEX IF EXISTS idx_invoices_client_id;
DROP INDEX IF EXISTS idx_vendors_client_id;
DROP INDEX IF EXISTS idx_customers_client_id;
DROP INDEX IF EXISTS idx_journal_entry_lines_account_id;
DROP INDEX IF EXISTS idx_journal_entry_lines_entry_id;
DROP INDEX IF EXISTS idx_journal_entries_date;
DROP INDEX IF EXISTS idx_journal_entries_client_id;
DROP INDEX IF EXISTS idx_journal_entries_company_date;
DROP INDEX IF EXISTS idx_accounts_parent_id;
DROP INDEX IF EXISTS idx_accounts_client_id;
DROP INDEX IF EXISTS idx_user_companies_client_id;
DROP INDEX IF EXISTS idx_user_companies_user_id;
DROP INDEX IF EXISTS idx_user_companies_user_company;

DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS user_client_features;
DROP TABLE IF EXISTS user_client_modules;
DROP TABLE IF EXISTS main_company_settings;
DROP TABLE IF EXISTS company_settings;
DROP TABLE IF EXISTS bills;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS journal_entry_lines;
DROP TABLE IF EXISTS journal_entries;
DROP TABLE IF EXISTS general_ledger;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS user_companies;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS users;
DROP INDEX IF EXISTS idx_main_company_single_row; 