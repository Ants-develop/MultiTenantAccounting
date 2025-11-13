-- =====================================================
-- Migration History Table
-- Stores MSSQL migration logs and errors for historical tracking
-- =====================================================

-- UP
-- Create migration_history table

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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_migration_history_status ON migration_history(status);
CREATE INDEX IF NOT EXISTS idx_migration_history_type ON migration_history(type);
CREATE INDEX IF NOT EXISTS idx_migration_history_start_time ON migration_history(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_migration_history_tenant_code ON migration_history(tenant_code);

-- Migration Logs table
CREATE TABLE IF NOT EXISTS migration_logs (
    id SERIAL PRIMARY KEY,
    migration_id TEXT NOT NULL REFERENCES migration_history(migration_id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    level TEXT NOT NULL, -- 'info', 'warn', 'error'
    message TEXT NOT NULL,
    context JSONB, -- Additional context data
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_migration_logs_migration_id ON migration_logs(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_logs_timestamp ON migration_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_migration_logs_level ON migration_logs(level);

-- Migration Errors table
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_migration_errors_migration_id ON migration_errors(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_errors_timestamp ON migration_errors(timestamp DESC);

COMMENT ON TABLE migration_history IS 'Stores MSSQL migration execution history';
COMMENT ON TABLE migration_logs IS 'Stores detailed logs for each migration';
COMMENT ON TABLE migration_errors IS 'Stores detailed errors encountered during migrations';

-- DOWN
-- Drop migration history tables
DROP TABLE IF EXISTS migration_errors CASCADE;
DROP TABLE IF EXISTS migration_logs CASCADE;
DROP TABLE IF EXISTS migration_history CASCADE;

