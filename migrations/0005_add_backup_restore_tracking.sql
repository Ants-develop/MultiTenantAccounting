-- =====================================================
-- Backup & Restore Tracking Module
-- Schema: public
-- Description: Track backup restore operations with Google Drive and Supabase Storage support
-- =====================================================

-- Create backup_restore_history table
CREATE TABLE IF NOT EXISTS backup_restore_history (
    id SERIAL PRIMARY KEY,
    google_drive_file_id TEXT,
    google_drive_file_name TEXT NOT NULL,
    supabase_storage_path TEXT,
    file_hash TEXT,
    storage_source TEXT NOT NULL DEFAULT 'google_drive',
    temp_database_name TEXT,
    restore_status TEXT NOT NULL DEFAULT 'pending',
    client_id INTEGER REFERENCES public.clients(id) ON DELETE SET NULL,
    restore_options JSONB,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    error_message TEXT,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_storage_source CHECK (storage_source IN ('google_drive', 'supabase_storage')),
    CONSTRAINT check_restore_status CHECK (restore_status IN ('pending', 'downloading', 'restoring', 'migrating', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_backup_restore_history_status ON backup_restore_history(restore_status);
CREATE INDEX IF NOT EXISTS idx_backup_restore_history_client_id ON backup_restore_history(client_id);
CREATE INDEX IF NOT EXISTS idx_backup_restore_history_storage_source ON backup_restore_history(storage_source);
CREATE INDEX IF NOT EXISTS idx_backup_restore_history_started_at ON backup_restore_history(started_at DESC);

COMMENT ON TABLE backup_restore_history IS 'Tracks backup restore operations from Google Drive and Supabase Storage';
COMMENT ON COLUMN backup_restore_history.google_drive_file_id IS 'Google Drive file ID (if source is Google Drive)';
COMMENT ON COLUMN backup_restore_history.supabase_storage_path IS 'Path in Supabase Storage bucket (if source is Supabase Storage)';
COMMENT ON COLUMN backup_restore_history.file_hash IS 'MD5 or SHA256 hash for file integrity verification';
COMMENT ON COLUMN backup_restore_history.storage_source IS 'Source of backup file: google_drive or supabase_storage';

-- DOWN
DROP INDEX IF EXISTS idx_backup_restore_history_started_at;
DROP INDEX IF EXISTS idx_backup_restore_history_storage_source;
DROP INDEX IF EXISTS idx_backup_restore_history_client_id;
DROP INDEX IF EXISTS idx_backup_restore_history_status;
DROP TABLE IF EXISTS backup_restore_history;

