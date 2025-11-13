-- =====================================================
-- PostgreSQL Migration Script for Audit Analytics Tables
-- Converts 25 MSSQL tables to PostgreSQL format
-- =====================================================

-- UP
-- Create audit schema and tables

-- Create audit schema
CREATE SCHEMA IF NOT EXISTS audit;

-- =====================================================
-- Table 1: audit.1690_stock
-- Inventory (account 1690) stock balance analysis
-- =====================================================
CREATE TABLE IF NOT EXISTS audit."1690_stock" (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    analytic VARCHAR(255) NOT NULL,
    balance NUMERIC(18,2) NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);

COMMENT ON TABLE audit."1690_stock" IS 'Inventory (account 1690) stock balance analysis';

-- =====================================================
-- Table 2: audit.accounts_summary
-- Account 515 accounts payable analysis
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.accounts_summary (
    tenant_code VARCHAR(50) NOT NULL,
    doc_date DATE NOT NULL,
    account_dr VARCHAR(50) NOT NULL,
    account_cr VARCHAR(50) NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    document_comments TEXT NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, doc_date, account_dr, account_cr)
);

COMMENT ON TABLE audit.accounts_summary IS 'Account 515 accounts payable analysis';

-- =====================================================
-- Table 3: audit.accrued_interest
-- Accrued interest analysis (account 145*)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.accrued_interest (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    analytic VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    balance NUMERIC(18,2) NOT NULL,
    has_181_turnover VARCHAR(3),
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, analytic, account_number)
);

COMMENT ON TABLE audit.accrued_interest IS 'Accrued interest analysis (account 145*)';
COMMENT ON COLUMN audit.accrued_interest.has_181_turnover IS 'კი (yes) or არა (no) - indicates if account 181 has activity';

-- =====================================================
-- Table 4: audit.analytics
-- General income and expense cumulative analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.analytics (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    analytic VARCHAR(255),
    tenant_name VARCHAR(255),
    "ხარჯი" NUMERIC(18,2),
    "შემოსავალი" NUMERIC(18,2),
    "უნიკალური_გატარებები" INTEGER,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_tenant_month 
    ON audit.analytics(tenant_code, posting_month);

COMMENT ON TABLE audit.analytics IS 'General income and expense cumulative analytics by posting month';
COMMENT ON COLUMN audit.analytics."ხარჯი" IS 'Cumulative expenses (account 7*)';
COMMENT ON COLUMN audit.analytics."შემოსავალი" IS 'Cumulative income (account 6*)';
COMMENT ON COLUMN audit.analytics."უნიკალური_გატარებები" IS 'Unique transaction count';

-- =====================================================
-- Table 5: audit.analytics_balance_summary
-- Combined balance analytics for accounts 141* and 311*
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.analytics_balance_summary (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    analytic VARCHAR(100) NOT NULL,
    balance_141 NUMERIC(18,2),
    balance_311 NUMERIC(18,2),
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, analytic)
);

COMMENT ON TABLE audit.analytics_balance_summary IS 'Combined balance analytics for accounts 141* and 311*';

-- =====================================================
-- Table 6: audit.capital_accounts
-- Capital-related transactions analysis
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.capital_accounts (
    tenant_code VARCHAR(50) NOT NULL,
    doc_date DATE NOT NULL,
    account_dr VARCHAR(50) NOT NULL,
    account_cr VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, doc_date, account_dr, account_cr)
);

COMMENT ON TABLE audit.capital_accounts IS 'Capital-related transactions analysis';

-- =====================================================
-- Table 7: audit.capital_accounts_summary
-- Summary of capital account balances
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.capital_accounts_summary (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    analytic VARCHAR(100) NOT NULL,
    balance NUMERIC(18,2) NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);

COMMENT ON TABLE audit.capital_accounts_summary IS 'Summary of capital account balances';

-- =====================================================
-- Table 8: audit.creditors_avans
-- Advance payments to creditors analysis
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.creditors_avans (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    analytic VARCHAR(100) NOT NULL,
    balance_311 NUMERIC(18,2),
    balance_148 NUMERIC(18,2),
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, analytic)
);

COMMENT ON TABLE audit.creditors_avans IS 'Advance payments to creditors analysis';

-- =====================================================
-- Table 9: audit.debitors_avans
-- Advance payments from debtors analysis
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.debitors_avans (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    analytic VARCHAR(100) NOT NULL,
    balance_141 NUMERIC(18,2),
    balance_312 NUMERIC(18,2),
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, analytic)
);

COMMENT ON TABLE audit.debitors_avans IS 'Advance payments from debtors analysis';

-- =====================================================
-- Table 10: audit.dublicate_creditors
-- Duplicate creditor entries detection
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.dublicate_creditors (
    tenant_code VARCHAR(50) NOT NULL,
    account VARCHAR(50) NOT NULL,
    analytic VARCHAR(255) NOT NULL,
    unique_id_count INTEGER NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, account, analytic)
);

COMMENT ON TABLE audit.dublicate_creditors IS 'Duplicate creditor entries detection';

-- =====================================================
-- Table 11: audit.dublicate_debitors
-- Duplicate debtor entries detection
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.dublicate_debitors (
    tenant_code VARCHAR(50) NOT NULL,
    account VARCHAR(50) NOT NULL,
    analytic VARCHAR(255) NOT NULL,
    unique_id_count INTEGER NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, account, analytic)
);

COMMENT ON TABLE audit.dublicate_debitors IS 'Duplicate debtor entries detection';

-- =====================================================
-- Table 12: audit.high_amount_per_quantity_summary
-- Transactions with unusually high unit prices
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.high_amount_per_quantity_summary (
    tenant_code VARCHAR(50) NOT NULL,
    doc_date DATE NOT NULL,
    account_cr VARCHAR(50) NOT NULL,
    account_dr VARCHAR(50) NOT NULL,
    analytic_cr TEXT NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    quantity_cr INTEGER NOT NULL,
    amount_per_quantity NUMERIC(18,2),
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, doc_date, account_cr, account_dr, analytic_cr)
);

COMMENT ON TABLE audit.high_amount_per_quantity_summary IS 'Transactions with unusually high unit prices';

-- =====================================================
-- Table 13: audit.negativ_creditor
-- Negative creditor balance analysis (account 31*)
-- Note: Table name preserves database typo
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.negativ_creditor (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    analytic VARCHAR(255) NOT NULL,
    balance NUMERIC(18,2) NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);

COMMENT ON TABLE audit.negativ_creditor IS 'Negative creditor balance analysis (preserves original typo)';

-- =====================================================
-- Table 14: audit.negativ_debitor
-- Negative debtor balance analysis (account 22*)
-- Note: Table name preserves database typo
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.negativ_debitor (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    analytic VARCHAR(255) NOT NULL,
    balance NUMERIC(18,2) NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);

COMMENT ON TABLE audit.negativ_debitor IS 'Negative debtor balance analysis (preserves original typo)';

-- =====================================================
-- Table 15: audit.negative_balance_141_summary
-- Negative balance analysis for account 141* (Fixed Assets)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.negative_balance_141_summary (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    analytic VARCHAR(255) NOT NULL,
    balance NUMERIC(18,2) NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);

COMMENT ON TABLE audit.negative_balance_141_summary IS 'Negative balance analysis for account 141* (Fixed Assets)';

-- =====================================================
-- Table 16: audit.negative_balance_311_summary
-- Negative balance analysis for account 311* (Trade Receivables)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.negative_balance_311_summary (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    analytic VARCHAR(255) NOT NULL,
    balance NUMERIC(18,2) NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);

COMMENT ON TABLE audit.negative_balance_311_summary IS 'Negative balance analysis for account 311* (Trade Receivables)';

-- =====================================================
-- Table 17: audit.negative_balance_summary
-- General negative balance analysis for account 515*
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.negative_balance_summary (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    analytic VARCHAR(100) NOT NULL,
    balance NUMERIC(18,2) NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);

COMMENT ON TABLE audit.negative_balance_summary IS 'General negative balance analysis for account 515*';

-- =====================================================
-- Table 18: audit.negative_loans
-- Negative loan balance analysis for accounts 41* and 32*
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.negative_loans (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    analytic VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    balance NUMERIC(18,2) NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, analytic, account_number)
);

COMMENT ON TABLE audit.negative_loans IS 'Negative loan balance analysis for accounts 41* and 32*';

-- =====================================================
-- Table 19: audit.negative_stock
-- Negative stock quantities analysis (impossible inventory states)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.negative_stock (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    analytic VARCHAR(255) NOT NULL,
    balance NUMERIC(18,2) NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);

COMMENT ON TABLE audit.negative_stock IS 'Negative stock quantities analysis';

-- =====================================================
-- Table 20: audit.negativ_interest
-- Negative interest balance analysis
-- Note: Table name preserves database typo
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.negativ_interest (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    analytic VARCHAR(255) NOT NULL,
    balance NUMERIC(18,2) NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);

COMMENT ON TABLE audit.negativ_interest IS 'Negative interest balance analysis (preserves original typo)';

-- =====================================================
-- Table 21: audit.negativ_salary
-- Negative salary balance analysis
-- Note: Table name preserves database typo
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.negativ_salary (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    analytic VARCHAR(255) NOT NULL,
    balance NUMERIC(18,2) NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);

COMMENT ON TABLE audit.negativ_salary IS 'Negative salary balance analysis (preserves original typo)';

-- =====================================================
-- Table 22: audit.positive_balance_summary
-- Positive balance summary analysis
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.positive_balance_summary (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    analytic VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    balance NUMERIC(18,2) NOT NULL,
    has_342_turnover VARCHAR(3),
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, analytic, account_number)
);

COMMENT ON TABLE audit.positive_balance_summary IS 'Positive balance summary analysis';
COMMENT ON COLUMN audit.positive_balance_summary.has_342_turnover IS 'კი (yes) or არა (no) - indicates if account 342 has activity';

-- =====================================================
-- Table 23: audit.revaluation_status_summary
-- Foreign currency revaluation status check
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.revaluation_status_summary (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    revaluation_status VARCHAR(50) NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month)
);

COMMENT ON TABLE audit.revaluation_status_summary IS 'Foreign currency revaluation status check';
COMMENT ON COLUMN audit.revaluation_status_summary.revaluation_status IS 'გადაფასებულია (revalued) or გადაფასება არ არის გაკეთებული (not revalued)';

-- =====================================================
-- Table 24: audit.salary_expense
-- Account 313 salary expense analysis (non-standard salary transactions)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.salary_expense (
    tenant_code VARCHAR(50) NOT NULL,
    doc_date DATE NOT NULL,
    account_dr VARCHAR(50) NOT NULL,
    account_cr VARCHAR(50) NOT NULL,
    amount NUMERIC(18,2) NOT NULL,
    document_comments TEXT NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, doc_date, account_dr, account_cr)
);

COMMENT ON TABLE audit.salary_expense IS 'Account 313 salary expense analysis (non-standard salary transactions)';

-- =====================================================
-- Table 25: audit.writeoff_stock
-- Stock write-off transactions analysis
-- =====================================================
CREATE TABLE IF NOT EXISTS audit.writeoff_stock (
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    analytic VARCHAR(255) NOT NULL,
    balance NUMERIC(18,2) NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),
    manager VARCHAR(50),
    accountant VARCHAR(50),
    company_code INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);

COMMENT ON TABLE audit.writeoff_stock IS 'Stock write-off transactions analysis';

-- =====================================================
-- Migration Complete
-- =====================================================
-- Total tables created: 25
-- Schema: audit
-- Database: PostgreSQL (Neon compatible)
-- =====================================================

-- DOWN
-- Drop audit schema and all tables (rollback)
DROP SCHEMA IF EXISTS audit CASCADE;

