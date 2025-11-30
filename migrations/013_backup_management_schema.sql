-- =====================================================
-- Backup Management System Refactor
-- Migration: 013_backup_management_schema.sql
-- Description: Creates new tables for Phase 1-3: gdrive_downloads, mssql_restores (renamed), migration_logs
-- =====================================================

-- Step 1: Create gdrive_downloads table (Phase 1)
CREATE TABLE IF NOT EXISTS gdrive_downloads (
    id SERIAL PRIMARY KEY,
    gdrive_file_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    download_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    file_size_bytes NUMERIC,
    local_file_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    file_hash TEXT,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_download_status CHECK (status IN ('pending', 'downloading', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_gdrive_downloads_status ON gdrive_downloads(status);
CREATE INDEX IF NOT EXISTS idx_gdrive_downloads_download_timestamp ON gdrive_downloads(download_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_gdrive_downloads_gdrive_file_id ON gdrive_downloads(gdrive_file_id);

COMMENT ON TABLE gdrive_downloads IS 'Tracks downloaded .bak files from Google Drive (Phase 1)';
COMMENT ON COLUMN gdrive_downloads.local_file_path IS 'Path to downloaded file on server (e.g., /var/opt/mssql/backup/)';

-- Step 2: Rename backup_restore_history to mssql_restores and add new columns
DO $$ 
BEGIN
    -- Rename table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'backup_restore_history') THEN
        ALTER TABLE backup_restore_history RENAME TO mssql_restores;
    END IF;
    
    -- Add new columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'mssql_restores' AND column_name = 'download_id') THEN
        ALTER TABLE mssql_restores ADD COLUMN download_id INTEGER REFERENCES gdrive_downloads(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'mssql_restores' AND column_name = 'restored_db_name') THEN
        ALTER TABLE mssql_restores ADD COLUMN restored_db_name TEXT;
        -- Migrate data from temp_database_name
        UPDATE mssql_restores SET restored_db_name = temp_database_name WHERE temp_database_name IS NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'mssql_restores' AND column_name = 'restore_timestamp') THEN
        ALTER TABLE mssql_restores ADD COLUMN restore_timestamp TIMESTAMP;
        -- Migrate data from started_at
        UPDATE mssql_restores SET restore_timestamp = started_at WHERE started_at IS NOT NULL;
        ALTER TABLE mssql_restores ALTER COLUMN restore_timestamp SET DEFAULT NOW();
        ALTER TABLE mssql_restores ALTER COLUMN restore_timestamp SET NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'mssql_restores' AND column_name = 'original_backup_date') THEN
        ALTER TABLE mssql_restores ADD COLUMN original_backup_date TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'mssql_restores' AND column_name = 'database_size_mb') THEN
        ALTER TABLE mssql_restores ADD COLUMN database_size_mb DECIMAL(10, 2);
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'mssql_restores' AND column_name = 'is_active') THEN
        ALTER TABLE mssql_restores ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'mssql_restores' AND column_name = 'local_backup_path') THEN
        ALTER TABLE mssql_restores ADD COLUMN local_backup_path TEXT;
    END IF;
    
    -- Make restored_db_name NOT NULL if it's not already
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'mssql_restores' AND column_name = 'restored_db_name' AND is_nullable = 'YES') THEN
        -- Set default for any NULL values
        UPDATE mssql_restores SET restored_db_name = 'TMP_RESTORE_' || id::text WHERE restored_db_name IS NULL;
        ALTER TABLE mssql_restores ALTER COLUMN restored_db_name SET NOT NULL;
    END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_mssql_restores_download_id ON mssql_restores(download_id);
CREATE INDEX IF NOT EXISTS idx_mssql_restores_restored_db_name ON mssql_restores(restored_db_name);
CREATE INDEX IF NOT EXISTS idx_mssql_restores_is_active ON mssql_restores(is_active);
CREATE INDEX IF NOT EXISTS idx_mssql_restores_restore_timestamp ON mssql_restores(restore_timestamp DESC);

COMMENT ON TABLE mssql_restores IS 'Tracks MSSQL database restores from backup files (Phase 2)';
COMMENT ON COLUMN mssql_restores.download_id IS 'Reference to gdrive_downloads table (Phase 1)';
COMMENT ON COLUMN mssql_restores.restored_db_name IS 'Name of restored temporary database (e.g., TMP_RESTORE_20241130_143022)';
COMMENT ON COLUMN mssql_restores.original_backup_date IS 'Original backup date extracted from MSSQL backup header';
COMMENT ON COLUMN mssql_restores.database_size_mb IS 'Size of restored database in MB';
COMMENT ON COLUMN mssql_restores.is_active IS 'Whether the database is still active (for cleanup tracking)';
COMMENT ON COLUMN mssql_restores.local_backup_path IS 'Path to the .bak file used for restore';

-- Step 3: Create backup_migration_logs table (Phase 3)
CREATE TABLE IF NOT EXISTS backup_migration_logs (
    id SERIAL PRIMARY KEY,
    restore_id INTEGER REFERENCES mssql_restores(id) ON DELETE CASCADE,
    source_table TEXT NOT NULL,
    target_table TEXT NOT NULL,
    records_processed INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    migration_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending',
    error_log TEXT,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_migration_status CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_backup_migration_logs_restore_id ON backup_migration_logs(restore_id);
CREATE INDEX IF NOT EXISTS idx_backup_migration_logs_status ON backup_migration_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_migration_logs_migration_timestamp ON backup_migration_logs(migration_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_backup_migration_logs_source_target ON backup_migration_logs(source_table, target_table);

COMMENT ON TABLE backup_migration_logs IS 'Tracks migrations from restored MSSQL databases to PostgreSQL (Phase 3)';
COMMENT ON COLUMN backup_migration_logs.restore_id IS 'Reference to mssql_restores table';
COMMENT ON COLUMN backup_migration_logs.source_table IS 'Source table name in MSSQL database';
COMMENT ON COLUMN backup_migration_logs.target_table IS 'Target table name in PostgreSQL database';

-- Create a view for backward compatibility (backup_restore_history)
CREATE OR REPLACE VIEW backup_restore_history AS 
SELECT 
    id,
    google_drive_file_id,
    google_drive_file_name,
    supabase_storage_path,
    file_hash,
    storage_source,
    restored_db_name as temp_database_name,
    restore_status,
    client_id,
    restore_options,
    restore_timestamp as started_at,
    completed_at,
    error_message,
    created_by,
    created_at,
    updated_at
FROM mssql_restores;

COMMENT ON VIEW backup_restore_history IS 'Backward compatibility view for backup_restore_history (deprecated, use mssql_restores)';

-- DOWN migration (for rollback)
-- DROP VIEW IF EXISTS backup_restore_history;
-- DROP TABLE IF EXISTS backup_migration_logs;
-- DROP INDEX IF EXISTS idx_mssql_restores_restore_timestamp;
-- DROP INDEX IF EXISTS idx_mssql_restores_is_active;
-- DROP INDEX IF EXISTS idx_mssql_restores_restored_db_name;
-- DROP INDEX IF EXISTS idx_mssql_restores_download_id;
-- ALTER TABLE mssql_restores DROP COLUMN IF EXISTS local_backup_path;
-- ALTER TABLE mssql_restores DROP COLUMN IF EXISTS is_active;
-- ALTER TABLE mssql_restores DROP COLUMN IF EXISTS database_size_mb;
-- ALTER TABLE mssql_restores DROP COLUMN IF EXISTS original_backup_date;
-- ALTER TABLE mssql_restores DROP COLUMN IF EXISTS restore_timestamp;
-- ALTER TABLE mssql_restores DROP COLUMN IF EXISTS restored_db_name;
-- ALTER TABLE mssql_restores DROP COLUMN IF EXISTS download_id;
-- ALTER TABLE mssql_restores RENAME TO backup_restore_history;
-- DROP INDEX IF EXISTS idx_gdrive_downloads_gdrive_file_id;
-- DROP INDEX IF EXISTS idx_gdrive_downloads_download_timestamp;
-- DROP INDEX IF EXISTS idx_gdrive_downloads_status;
-- DROP TABLE IF EXISTS gdrive_downloads;

