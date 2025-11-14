-- =====================================================
-- Core Module Migration
-- Schema: public
-- Description: Core system tables - users, clients, permissions, settings
-- =====================================================

-- UP
-- Create core module tables in public schema

-- =====================================================
-- Users Table
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  global_role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  matrix_id VARCHAR(255), -- Matrix user ID for messaging integration
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_matrix_id ON users(matrix_id);

COMMENT ON TABLE users IS 'System users with authentication and authorization';
COMMENT ON COLUMN users.matrix_id IS 'Matrix user ID for messaging integration';

-- =====================================================
-- Clients Table
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_clients_code ON clients(code);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_code ON clients(tenant_code);
CREATE INDEX IF NOT EXISTS idx_clients_verification_status ON clients(verification_status);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);

COMMENT ON TABLE clients IS 'Client companies in multi-tenant accounting system';
COMMENT ON COLUMN clients.tenant_code IS 'MSSQL tenant code for data synchronization';

-- =====================================================
-- User-Client Relationships
-- =====================================================
CREATE TABLE IF NOT EXISTS user_companies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  client_id INTEGER REFERENCES clients(id) NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_client_id ON user_companies(client_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_user_client ON user_companies(user_id, client_id);

COMMENT ON TABLE user_companies IS 'User-client relationships with roles';

-- =====================================================
-- Module-Level Permissions
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_user_client_modules_user_client ON user_client_modules(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_user_client_modules_module ON user_client_modules(module);

COMMENT ON TABLE user_client_modules IS 'Module-level permissions per user per client';
COMMENT ON COLUMN user_client_modules.module IS 'Module name: accounting, bank, audit, rs_integration, tasks, crm, email';

-- =====================================================
-- Feature-Level Permissions
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_user_client_features_user_client ON user_client_features(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_user_client_features_feature ON user_client_features(feature);

COMMENT ON TABLE user_client_features IS 'Feature-level permissions within modules';
COMMENT ON COLUMN user_client_features.feature IS 'Feature name: invoices, bills, journal_entries, accounts, etc.';

-- =====================================================
-- Company Settings
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_company_settings_client_id ON company_settings(client_id);

COMMENT ON TABLE company_settings IS 'Per-client company settings and preferences';

-- =====================================================
-- Main Company Settings
-- =====================================================
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_main_company_single_row 
ON main_company_settings (id) 
WHERE id = 1;

COMMENT ON TABLE main_company_settings IS 'System-wide main company settings (only one row should exist)';

-- =====================================================
-- Activity Logs
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_client_id ON activity_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource, resource_id);

COMMENT ON TABLE activity_logs IS 'System-wide activity logging';

-- =====================================================
-- Constraints
-- =====================================================
DO $$
BEGIN
  -- Add constraint for fiscal year start
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

-- =====================================================
-- Trigger Functions
-- =====================================================
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Triggers
-- =====================================================
-- Drop triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS trigger_update_company_settings_updated_at ON company_settings;
DROP TRIGGER IF EXISTS trigger_update_clients_updated_at ON clients;

CREATE TRIGGER trigger_update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_settings_updated_at();

CREATE TRIGGER trigger_update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();

-- DOWN
-- Drop core module tables

DROP TRIGGER IF EXISTS trigger_update_clients_updated_at ON clients;
DROP TRIGGER IF EXISTS trigger_update_company_settings_updated_at ON company_settings;

DROP FUNCTION IF EXISTS update_clients_updated_at();
DROP FUNCTION IF EXISTS update_company_settings_updated_at();

DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS user_client_features;
DROP TABLE IF EXISTS user_client_modules;
DROP TABLE IF EXISTS main_company_settings;
DROP TABLE IF EXISTS company_settings;
DROP TABLE IF EXISTS user_companies;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS users;

DROP INDEX IF EXISTS idx_main_company_single_row;

