-- =====================================================
-- Accounting Module Migration
-- Schema: accounting
-- Description: Core accounting tables - accounts, journal entries, customers, vendors, invoices, bills
-- =====================================================

-- UP
-- Create accounting schema and tables

CREATE SCHEMA IF NOT EXISTS accounting;

-- =====================================================
-- Chart of Accounts
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting.accounts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  sub_type TEXT,
  parent_id INTEGER REFERENCES accounting.accounts(id),
  account_class TEXT,
  category TEXT,
  is_subaccount_allowed BOOLEAN DEFAULT false,
  is_foreign_currency BOOLEAN DEFAULT false,
  is_analytical BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, code)
);

CREATE INDEX IF NOT EXISTS idx_accounts_client_id ON accounting.accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_accounts_parent_id ON accounting.accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounting.accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounting.accounts(code);

COMMENT ON TABLE accounting.accounts IS 'Chart of accounts for each client';
COMMENT ON COLUMN accounting.accounts.type IS 'Account type: asset, liability, equity, revenue, expense';

-- =====================================================
-- General Ledger (Raw MSSQL Import Storage)
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting.general_ledger (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_general_ledger_client_id ON accounting.general_ledger(client_id);
CREATE INDEX IF NOT EXISTS idx_general_ledger_account_dr ON accounting.general_ledger(account_dr);
CREATE INDEX IF NOT EXISTS idx_general_ledger_account_cr ON accounting.general_ledger(account_cr);
CREATE INDEX IF NOT EXISTS idx_general_ledger_doc_date ON accounting.general_ledger(doc_date);
CREATE INDEX IF NOT EXISTS idx_general_ledger_posting_number ON accounting.general_ledger(posting_number);
CREATE INDEX IF NOT EXISTS idx_general_ledger_tenant_code ON accounting.general_ledger(tenant_code);

COMMENT ON TABLE accounting.general_ledger IS 'Raw MSSQL GeneralLedger import storage before copying to journal_entries';

-- =====================================================
-- Journal Entries
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting.journal_entries (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) NOT NULL,
  entry_number TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  description TEXT NOT NULL,
  reference TEXT,
  total_amount DECIMAL(15,2) NOT NULL,
  user_id INTEGER REFERENCES public.users(id),
  is_posted BOOLEAN DEFAULT false,
  -- Internal tracking: Link to general_ledger table for MSSQL import tracking
  mssql_record_id INTEGER REFERENCES accounting.general_ledger(id),
  -- MSSQL parity fields (all optional/nullable for legacy data import)
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

CREATE INDEX IF NOT EXISTS idx_journal_entries_client_id ON accounting.journal_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON accounting.journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON accounting.journal_entries(client_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_code ON accounting.journal_entries(tenant_code);
CREATE INDEX IF NOT EXISTS idx_journal_entries_account_dr ON accounting.journal_entries(account_dr);
CREATE INDEX IF NOT EXISTS idx_journal_entries_account_cr ON accounting.journal_entries(account_cr);
CREATE INDEX IF NOT EXISTS idx_journal_entries_doc_date ON accounting.journal_entries(doc_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_posting_number ON accounting.journal_entries(posting_number);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON accounting.journal_entries(user_id);

COMMENT ON TABLE accounting.journal_entries IS 'Journal entries with MSSQL parity fields';

-- =====================================================
-- Journal Entry Lines
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting.journal_entry_lines (
  id SERIAL PRIMARY KEY,
  journal_entry_id INTEGER REFERENCES accounting.journal_entries(id) NOT NULL,
  account_id INTEGER REFERENCES accounting.accounts(id) NOT NULL,
  description TEXT,
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry_id ON accounting.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON accounting.journal_entry_lines(account_id);

COMMENT ON TABLE accounting.journal_entry_lines IS 'Line items for journal entries';

-- =====================================================
-- Customers
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting.customers (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_client_id ON accounting.customers(client_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON accounting.customers(name);

COMMENT ON TABLE accounting.customers IS 'Customer records for accounts receivable';

-- =====================================================
-- Vendors
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting.vendors (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_client_id ON accounting.vendors(client_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON accounting.vendors(name);

COMMENT ON TABLE accounting.vendors IS 'Vendor records for accounts payable';

-- =====================================================
-- Invoices
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting.invoices (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) NOT NULL,
  customer_id INTEGER REFERENCES accounting.customers(id) NOT NULL,
  invoice_number TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  due_date TIMESTAMP NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'draft',
  user_id INTEGER REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON accounting.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON accounting.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON accounting.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON accounting.invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON accounting.invoices(status);

COMMENT ON TABLE accounting.invoices IS 'Sales invoices to customers';

-- =====================================================
-- Bills
-- =====================================================
CREATE TABLE IF NOT EXISTS accounting.bills (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES public.clients(id) NOT NULL,
  vendor_id INTEGER REFERENCES accounting.vendors(id) NOT NULL,
  bill_number TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  due_date TIMESTAMP NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'draft',
  user_id INTEGER REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_bills_client_id ON accounting.bills(client_id);
CREATE INDEX IF NOT EXISTS idx_bills_vendor_id ON accounting.bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON accounting.bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_date ON accounting.bills(date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON accounting.bills(status);

COMMENT ON TABLE accounting.bills IS 'Purchase bills from vendors';

-- =====================================================
-- Constraints
-- =====================================================
DO $$
BEGIN
  -- Add constraint for journal entry lines
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_debit_credit_not_both' 
    AND conrelid = 'accounting.journal_entry_lines'::regclass
  ) THEN
    ALTER TABLE accounting.journal_entry_lines 
    ADD CONSTRAINT chk_debit_credit_not_both 
    CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0));
  END IF;

  -- Add constraint for accounts
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_account_type' 
    AND conrelid = 'accounting.accounts'::regclass
  ) THEN
    ALTER TABLE accounting.accounts 
    ADD CONSTRAINT chk_account_type 
    CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense'));
  END IF;
END $$;

-- =====================================================
-- Trigger Functions
-- =====================================================
CREATE OR REPLACE FUNCTION accounting.update_general_ledger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Triggers
-- =====================================================
CREATE TRIGGER trigger_update_general_ledger_updated_at
  BEFORE UPDATE ON accounting.general_ledger
  FOR EACH ROW
  EXECUTE FUNCTION accounting.update_general_ledger_updated_at();

-- DOWN
-- Drop accounting module schema and tables

DROP TRIGGER IF EXISTS trigger_update_general_ledger_updated_at ON accounting.general_ledger;

DROP FUNCTION IF EXISTS accounting.update_general_ledger_updated_at();

DROP SCHEMA IF EXISTS accounting CASCADE;

