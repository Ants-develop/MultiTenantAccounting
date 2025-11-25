-- =====================================================
-- Fix Migration History Constraint
-- Description: Add missing UNIQUE constraint on migration_id
-- =====================================================

-- UP
-- Add unique constraint on migration_id if it doesn't exist
DO $$
BEGIN
    -- Check if constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'migration_history_migration_id_key'
    ) THEN
        -- Add the unique constraint
        ALTER TABLE migration_history
        ADD CONSTRAINT migration_history_migration_id_key UNIQUE (migration_id);
        
        RAISE NOTICE 'Added unique constraint on migration_history(migration_id)';
    ELSE
        RAISE NOTICE 'Unique constraint on migration_history(migration_id) already exists';
    END IF;
END
$$;

-- DOWN
-- Remove the unique constraint
ALTER TABLE migration_history
DROP CONSTRAINT IF EXISTS migration_history_migration_id_key;
