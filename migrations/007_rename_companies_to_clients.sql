-- Rename Companies to Clients Migration
-- Migration: 007_rename_companies_to_clients.sql
-- Description: Rename companies table to clients and all company_id columns to client_id
-- This transforms the system from multi-tenant company model to single-company with multiple clients

-- UP
-- Rename companies table to clients
ALTER TABLE companies RENAME TO clients;

-- Update all foreign key references and column names
-- user_companies table
ALTER TABLE user_companies RENAME COLUMN company_id TO client_id;
ALTER TABLE user_companies DROP CONSTRAINT user_companies_company_id_fkey;
ALTER TABLE user_companies ADD CONSTRAINT user_companies_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id);

-- accounts table
ALTER TABLE accounts RENAME COLUMN company_id TO client_id;
ALTER TABLE accounts DROP CONSTRAINT accounts_company_id_fkey;
ALTER TABLE accounts ADD CONSTRAINT accounts_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- general_ledger table
ALTER TABLE general_ledger RENAME COLUMN company_id TO client_id;
ALTER TABLE general_ledger DROP CONSTRAINT general_ledger_company_id_fkey;
ALTER TABLE general_ledger ADD CONSTRAINT general_ledger_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- company_settings table
ALTER TABLE company_settings RENAME COLUMN company_id TO client_id;
ALTER TABLE company_settings DROP CONSTRAINT company_settings_company_id_fkey;
ALTER TABLE company_settings ADD CONSTRAINT company_settings_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE company_settings DROP CONSTRAINT company_settings_company_id_key;
ALTER TABLE company_settings ADD CONSTRAINT company_settings_client_id_key UNIQUE(client_id);

-- journal_entries table
ALTER TABLE journal_entries RENAME COLUMN company_id TO client_id;
ALTER TABLE journal_entries DROP CONSTRAINT journal_entries_company_id_fkey;
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- journal_entry_lines table
ALTER TABLE journal_entry_lines RENAME COLUMN company_id TO client_id;
ALTER TABLE journal_entry_lines DROP CONSTRAINT journal_entry_lines_company_id_fkey;
ALTER TABLE journal_entry_lines ADD CONSTRAINT journal_entry_lines_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- customers table
ALTER TABLE customers RENAME COLUMN company_id TO client_id;
ALTER TABLE customers DROP CONSTRAINT customers_company_id_fkey;
ALTER TABLE customers ADD CONSTRAINT customers_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- vendors table
ALTER TABLE vendors RENAME COLUMN company_id TO client_id;
ALTER TABLE vendors DROP CONSTRAINT vendors_company_id_fkey;
ALTER TABLE vendors ADD CONSTRAINT vendors_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- invoices table
ALTER TABLE invoices RENAME COLUMN company_id TO client_id;
ALTER TABLE invoices DROP CONSTRAINT invoices_company_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- bills table
ALTER TABLE bills RENAME COLUMN company_id TO client_id;
ALTER TABLE bills DROP CONSTRAINT bills_company_id_fkey;
ALTER TABLE bills ADD CONSTRAINT bills_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- activity_logs table
ALTER TABLE activity_logs RENAME COLUMN company_id TO client_id;
ALTER TABLE activity_logs DROP CONSTRAINT activity_logs_company_id_fkey;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- bank_accounts table
ALTER TABLE bank_accounts RENAME COLUMN company_id TO client_id;
ALTER TABLE bank_accounts DROP CONSTRAINT bank_accounts_company_id_fkey;
ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- raw_bank_transactions table
ALTER TABLE raw_bank_transactions RENAME COLUMN company_id TO client_id;
ALTER TABLE raw_bank_transactions DROP CONSTRAINT raw_bank_transactions_company_id_fkey;
ALTER TABLE raw_bank_transactions ADD CONSTRAINT raw_bank_transactions_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- normalized_bank_transactions table
ALTER TABLE normalized_bank_transactions RENAME COLUMN company_id TO client_id;
ALTER TABLE normalized_bank_transactions DROP CONSTRAINT normalized_bank_transactions_company_id_fkey;
ALTER TABLE normalized_bank_transactions ADD CONSTRAINT normalized_bank_transactions_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- rs_users table (in rs schema)
ALTER TABLE rs.users RENAME COLUMN company_id TO client_id;
ALTER TABLE rs.users DROP CONSTRAINT users_company_id_fkey;
ALTER TABLE rs.users ADD CONSTRAINT users_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id);

-- rs_audit table (in rs schema)
ALTER TABLE rs.audit RENAME COLUMN company_id TO client_id;
ALTER TABLE rs.audit DROP CONSTRAINT audit_company_id_fkey;
ALTER TABLE rs.audit ADD CONSTRAINT audit_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id);

-- Update indexes
-- Drop old indexes
DROP INDEX IF EXISTS idx_user_companies_company_id;
DROP INDEX IF EXISTS idx_user_companies_user_company;
DROP INDEX IF EXISTS idx_accounts_company_id;
DROP INDEX IF EXISTS idx_general_ledger_company_id;
DROP INDEX IF EXISTS idx_company_settings_company_id;
DROP INDEX IF EXISTS idx_journal_entries_company_id;
DROP INDEX IF EXISTS idx_journal_entries_company_date;
DROP INDEX IF EXISTS idx_customers_company_id;
DROP INDEX IF EXISTS idx_vendors_company_id;
DROP INDEX IF EXISTS idx_invoices_company_id;
DROP INDEX IF EXISTS idx_journal_entry_lines_company_id;
DROP INDEX IF EXISTS idx_bills_company_id;
DROP INDEX IF EXISTS idx_activity_logs_company_id;
DROP INDEX IF EXISTS idx_bank_accounts_company_id;
DROP INDEX IF EXISTS idx_bank_accounts_is_active;

-- Create new indexes with client naming
CREATE INDEX IF NOT EXISTS idx_user_companies_client_id ON user_companies(client_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_user_client ON user_companies(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_accounts_client_id ON accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_general_ledger_client_id ON general_ledger(client_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_client_id ON company_settings(client_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_client_id ON journal_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_client_date ON journal_entries(client_id, date);
CREATE INDEX IF NOT EXISTS idx_customers_client_id ON customers(client_id);
CREATE INDEX IF NOT EXISTS idx_vendors_client_id ON vendors(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_client_id ON journal_entry_lines(client_id);
CREATE INDEX IF NOT EXISTS idx_bills_client_id ON bills(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_client_id ON activity_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_client_id ON bank_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);

-- Update any additional tables in bank module
-- raw_bank_transactions has unique index on company_id
ALTER TABLE raw_bank_transactions DROP CONSTRAINT IF EXISTS unique_transaction_company_idx;
CREATE UNIQUE INDEX IF NOT EXISTS unique_transaction_client_idx ON raw_bank_transactions(client_id, unique_transaction_id);

-- normalized_bank_transactions indexes
DROP INDEX IF EXISTS unique_raw_transaction_idx;
DROP INDEX IF EXISTS bank_account_sequence_idx;
CREATE UNIQUE INDEX IF NOT EXISTS unique_raw_transaction_idx ON normalized_bank_transactions(raw_transaction_id);
CREATE INDEX IF NOT EXISTS bank_account_sequence_idx ON normalized_bank_transactions(bank_account_id, sequence_number);

-- Update unique constraints
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_company_id_code_key;
ALTER TABLE accounts ADD CONSTRAINT accounts_client_id_code_key UNIQUE(client_id, code);

ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_company_id_entry_number_key;
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_client_id_entry_number_key UNIQUE(client_id, entry_number);

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_company_id_invoice_number_key;
ALTER TABLE invoices ADD CONSTRAINT invoices_client_id_invoice_number_key UNIQUE(client_id, invoice_number);

ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_company_id_bill_number_key;
ALTER TABLE bills ADD CONSTRAINT bills_client_id_bill_number_key UNIQUE(client_id, bill_number);

-- DOWN (Rollback)
-- This would reverse all the changes above
-- Drop new indexes
DROP INDEX IF EXISTS idx_user_companies_client_id;
DROP INDEX IF EXISTS idx_user_companies_user_client;
DROP INDEX IF EXISTS idx_accounts_client_id;
DROP INDEX IF EXISTS idx_general_ledger_client_id;
DROP INDEX IF EXISTS idx_company_settings_client_id;
DROP INDEX IF EXISTS idx_journal_entries_client_id;
DROP INDEX IF EXISTS idx_journal_entries_client_date;
DROP INDEX IF EXISTS idx_customers_client_id;
DROP INDEX IF EXISTS idx_vendors_client_id;
DROP INDEX IF EXISTS idx_invoices_client_id;
DROP INDEX IF EXISTS idx_journal_entry_lines_client_id;
DROP INDEX IF EXISTS idx_bills_client_id;
DROP INDEX IF EXISTS idx_activity_logs_client_id;
DROP INDEX IF EXISTS idx_bank_accounts_client_id;

-- Revert table and column names
-- Create old companies table from clients
ALTER TABLE clients RENAME TO companies;

-- Revert all column renames (client_id -> company_id)
ALTER TABLE user_companies RENAME COLUMN client_id TO company_id;
ALTER TABLE accounts RENAME COLUMN client_id TO company_id;
ALTER TABLE general_ledger RENAME COLUMN client_id TO company_id;
ALTER TABLE company_settings RENAME COLUMN client_id TO company_id;
ALTER TABLE journal_entries RENAME COLUMN client_id TO company_id;
ALTER TABLE journal_entry_lines RENAME COLUMN client_id TO company_id;
ALTER TABLE customers RENAME COLUMN client_id TO company_id;
ALTER TABLE vendors RENAME COLUMN client_id TO company_id;
ALTER TABLE invoices RENAME COLUMN client_id TO company_id;
ALTER TABLE bills RENAME COLUMN client_id TO company_id;
ALTER TABLE activity_logs RENAME COLUMN client_id TO company_id;
ALTER TABLE bank_accounts RENAME COLUMN client_id TO company_id;
ALTER TABLE raw_bank_transactions RENAME COLUMN client_id TO company_id;
ALTER TABLE normalized_bank_transactions RENAME COLUMN client_id TO company_id;
ALTER TABLE rs.users RENAME COLUMN client_id TO company_id;
ALTER TABLE rs.audit RENAME COLUMN client_id TO company_id;

-- Recreate old indexes
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_user_company ON user_companies(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_company_id ON accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_general_ledger_company_id ON general_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_company_id ON company_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON journal_entries(company_id, date);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_company_id ON vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_company_id ON journal_entry_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_bills_company_id ON bills(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id ON activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company_id ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank_accounts(is_active);

