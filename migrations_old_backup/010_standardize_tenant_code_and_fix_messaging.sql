-- =====================================================
-- Migration: Standardize tenant_code to VARCHAR(50) and Fix Messaging Foreign Keys
-- Description: 
--   Legacy migration for upgrading old databases
--   All new installations create tenant_code as VARCHAR(50) from the start
--   This migration is kept for backward compatibility only
-- Date: 2025-01-XX
-- =====================================================

-- UP
-- This migration is now a no-op for new installations
-- All tenant_code columns are created as VARCHAR(50) from the start in:
--   - Migration 001: clients.tenant_code
--   - Migration 002: accounting.general_ledger.tenant_code, accounting.journal_entries.tenant_code
--   - Migration 003: audit.*.tenant_code (all audit tables)
--   - Migration 009: migration_history.tenant_code
--
-- Foreign keys for messaging tables are created correctly in migration 011
--
-- This migration only runs for legacy databases that may have had INTEGER/NUMERIC tenant_code

-- Create helper function for integer conversion (useful for code that needs INTEGER)
CREATE OR REPLACE FUNCTION tenant_code_to_int(tenant_code_val VARCHAR(50))
RETURNS INTEGER AS $$
BEGIN
  IF tenant_code_val IS NULL OR tenant_code_val = '' THEN
    RETURN NULL;
  END IF;
  
  -- Try to convert to integer, return NULL if not numeric
  BEGIN
    RETURN tenant_code_val::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION tenant_code_to_int IS 'Converts VARCHAR(50) tenant_code to INTEGER for numeric operations. Returns NULL if conversion fails.';

-- Ensure indexes exist (they should already from initial migrations)
CREATE INDEX IF NOT EXISTS idx_clients_tenant_code ON clients(tenant_code);
CREATE INDEX IF NOT EXISTS idx_general_ledger_tenant_code ON accounting.general_ledger(tenant_code);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_code ON accounting.journal_entries(tenant_code);
CREATE INDEX IF NOT EXISTS idx_migration_history_tenant_code ON migration_history(tenant_code);

-- Update comments for clarity
COMMENT ON COLUMN clients.tenant_code IS 'MSSQL tenant code for data synchronization (VARCHAR for flexibility, convert to INT in code when needed)';
COMMENT ON COLUMN accounting.general_ledger.tenant_code IS 'MSSQL tenant code (VARCHAR for flexibility, convert to INT in code when needed)';
COMMENT ON COLUMN accounting.journal_entries.tenant_code IS 'MSSQL tenant code (VARCHAR for flexibility, convert to INT in code when needed)';

-- DOWN
-- Drop helper function
DROP FUNCTION IF EXISTS tenant_code_to_int(VARCHAR(50));
