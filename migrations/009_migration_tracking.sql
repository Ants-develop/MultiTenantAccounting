-- =====================================================
-- Migration Tracking Module
-- Schema: public
-- Description: MSSQL migration logs and errors for historical tracking
-- =====================================================

-- UP
-- Create migration tracking tables in public schema

-- =====================================================
-- Migration History Table
-- =====================================================
CREATE TABLE IF NOT EXISTS migration_history (
    id SERIAL PRIMARY KEY,
    migration_id TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL, -- 'general-ledger', 'audit', 'rs', 'update'
    tenant_code INTEGER,
    table_name TEXT,
    status TEXT NOT NULL, -- 'pending', 'running', 'completed', 'failed', 'stopped'
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    progress NUMERIC(5,2) DEFAULT 0,
    batch_size INTEGER DEFAULT 1000,
    error_message TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_migration_history_status ON migration_history(status);
CREATE INDEX IF NOT EXISTS idx_migration_history_type ON migration_history(type);
CREATE INDEX IF NOT EXISTS idx_migration_history_start_time ON migration_history(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_migration_history_tenant_code ON migration_history(tenant_code);

COMMENT ON TABLE migration_history IS 'Stores MSSQL migration execution history';

-- =====================================================
-- Migration Logs Table
-- =====================================================
CREATE TABLE IF NOT EXISTS migration_logs (
    id SERIAL PRIMARY KEY,
    migration_id TEXT NOT NULL REFERENCES migration_history(migration_id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    level TEXT NOT NULL, -- 'info', 'warn', 'error'
    message TEXT NOT NULL,
    context JSONB, -- Additional context data
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_migration_logs_migration_id ON migration_logs(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_logs_timestamp ON migration_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_migration_logs_level ON migration_logs(level);

COMMENT ON TABLE migration_logs IS 'Stores detailed logs for each migration';

-- =====================================================
-- Migration Errors Table
-- =====================================================
CREATE TABLE IF NOT EXISTS migration_errors (
    id SERIAL PRIMARY KEY,
    migration_id TEXT NOT NULL REFERENCES migration_history(migration_id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    message TEXT NOT NULL,
    record_id TEXT,
    record_data JSONB, -- Additional record context
    stack TEXT, -- Stack trace if available
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_migration_errors_migration_id ON migration_errors(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_errors_timestamp ON migration_errors(timestamp DESC);

COMMENT ON TABLE migration_errors IS 'Stores detailed errors encountered during migrations';

-- =====================================================
-- Trigger Functions
-- =====================================================
CREATE OR REPLACE FUNCTION update_migration_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Triggers
-- =====================================================
CREATE TRIGGER trigger_update_migration_history_updated_at
  BEFORE UPDATE ON migration_history
  FOR EACH ROW
  EXECUTE FUNCTION update_migration_history_updated_at();

-- DOWN
-- Drop migration tracking tables

DROP TRIGGER IF EXISTS trigger_update_migration_history_updated_at ON migration_history;

DROP FUNCTION IF EXISTS update_migration_history_updated_at();

DROP TABLE IF EXISTS migration_errors CASCADE;
DROP TABLE IF EXISTS migration_logs CASCADE;
DROP TABLE IF EXISTS migration_history CASCADE;

