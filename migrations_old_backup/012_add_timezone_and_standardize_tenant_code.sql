-- =====================================================
-- Migration: Add time_zone column and standardize tenant_code types
-- Description: 
--   1. Adds missing time_zone column to main_company_settings
--   2. Converts tenant_code from VARCHAR(50) to TEXT (safe conversion, no data loss)
--      This aligns the database with Drizzle schema which uses text() for tenant_code
-- Date: 2025-01-XX
-- =====================================================

-- UP

-- =====================================================
-- 1. Add time_zone column to main_company_settings
-- =====================================================
DO $$
BEGIN
  -- Check if time_zone column already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'main_company_settings' 
    AND column_name = 'time_zone'
  ) THEN
    ALTER TABLE main_company_settings 
    ADD COLUMN time_zone TEXT DEFAULT 'America/New_York';
    
    COMMENT ON COLUMN main_company_settings.time_zone IS 'Time zone for the main company (IANA timezone identifier)';
    
    RAISE NOTICE 'Added time_zone column to main_company_settings';
  ELSE
    RAISE NOTICE 'time_zone column already exists in main_company_settings';
  END IF;
END $$;

-- =====================================================
-- 2. Convert tenant_code from VARCHAR(50) to TEXT
-- This is a safe conversion - TEXT can hold any length
-- No data loss occurs, we're just removing the length constraint
-- =====================================================

-- clients.tenant_code
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'clients' 
    AND column_name = 'tenant_code'
    AND data_type = 'character varying'
    AND character_maximum_length = 50
  ) THEN
    ALTER TABLE clients 
    ALTER COLUMN tenant_code TYPE TEXT;
    
    RAISE NOTICE 'Converted clients.tenant_code from VARCHAR(50) to TEXT';
  END IF;
END $$;

-- accounting.general_ledger.tenant_code
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'accounting'
    AND table_name = 'general_ledger' 
    AND column_name = 'tenant_code'
    AND data_type = 'character varying'
    AND character_maximum_length = 50
  ) THEN
    ALTER TABLE accounting.general_ledger 
    ALTER COLUMN tenant_code TYPE TEXT;
    
    RAISE NOTICE 'Converted accounting.general_ledger.tenant_code from VARCHAR(50) to TEXT';
  END IF;
END $$;

-- accounting.journal_entries.tenant_code
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'accounting'
    AND table_name = 'journal_entries' 
    AND column_name = 'tenant_code'
    AND data_type = 'character varying'
    AND character_maximum_length = 50
  ) THEN
    ALTER TABLE accounting.journal_entries 
    ALTER COLUMN tenant_code TYPE TEXT;
    
    RAISE NOTICE 'Converted accounting.journal_entries.tenant_code from VARCHAR(50) to TEXT';
  END IF;
END $$;

-- migration_history.tenant_code
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'migration_history' 
    AND column_name = 'tenant_code'
    AND data_type = 'character varying'
    AND character_maximum_length = 50
  ) THEN
    ALTER TABLE migration_history 
    ALTER COLUMN tenant_code TYPE TEXT;
    
    RAISE NOTICE 'Converted migration_history.tenant_code from VARCHAR(50) to TEXT';
  END IF;
END $$;

-- audit.*.tenant_code (all audit tables use VARCHAR(50) NOT NULL)
-- Note: These are kept as VARCHAR(50) since they're NOT NULL and used for filtering
-- If needed, they can be converted in a future migration

-- DOWN
-- Revert time_zone column
ALTER TABLE main_company_settings DROP COLUMN IF EXISTS time_zone;

-- Revert tenant_code back to VARCHAR(50) (optional - usually not needed)
-- Note: This conversion is safe to skip as TEXT is compatible with VARCHAR(50)
-- ALTER TABLE clients ALTER COLUMN tenant_code TYPE VARCHAR(50);
-- ALTER TABLE accounting.general_ledger ALTER COLUMN tenant_code TYPE VARCHAR(50);
-- ALTER TABLE accounting.journal_entries ALTER COLUMN tenant_code TYPE VARCHAR(50);
-- ALTER TABLE migration_history ALTER COLUMN tenant_code TYPE VARCHAR(50);

