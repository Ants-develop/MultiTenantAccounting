-- =====================================================
-- Migration: Standardize tenant_code to VARCHAR(50) and Fix Messaging Foreign Keys
-- Description: 
--   1. Converts all tenant_code columns from INTEGER/DECIMAL to VARCHAR(50) for flexibility
--   2. Ensures proper foreign key constraints in messaging tables
--   3. Adds conversion functions for integer operations where needed
-- Date: 2025-01-XX
-- =====================================================

-- UP
-- Standardize tenant_code to VARCHAR(50) across all schemas

-- =====================================================
-- Step 1: Convert clients.tenant_code from INTEGER to VARCHAR(50)
-- =====================================================
DO $$
BEGIN
  -- Check if column exists and is not already VARCHAR(50)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'tenant_code'
    AND data_type != 'character varying'
  ) THEN
    -- Convert INTEGER to VARCHAR(50) by casting through TEXT
    ALTER TABLE clients 
    ALTER COLUMN tenant_code TYPE VARCHAR(50) 
    USING CASE 
      WHEN tenant_code IS NULL THEN NULL 
      ELSE tenant_code::TEXT 
    END;
    
    RAISE NOTICE 'Converted clients.tenant_code from INTEGER to VARCHAR(50)';
  END IF;
END $$;

-- =====================================================
-- Step 2: Convert accounting.general_ledger.tenant_code from NUMERIC to VARCHAR(50)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'accounting' 
    AND table_name = 'general_ledger' 
    AND column_name = 'tenant_code'
    AND data_type != 'character varying'
  ) THEN
    ALTER TABLE accounting.general_ledger 
    ALTER COLUMN tenant_code TYPE VARCHAR(50) 
    USING CASE 
      WHEN tenant_code IS NULL THEN NULL 
      ELSE tenant_code::TEXT 
    END;
    
    RAISE NOTICE 'Converted accounting.general_ledger.tenant_code from NUMERIC to VARCHAR(50)';
  END IF;
END $$;

-- =====================================================
-- Step 3: Convert accounting.journal_entries.tenant_code from INTEGER to VARCHAR(50)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'accounting' 
    AND table_name = 'journal_entries' 
    AND column_name = 'tenant_code'
    AND data_type != 'character varying'
  ) THEN
    ALTER TABLE accounting.journal_entries 
    ALTER COLUMN tenant_code TYPE VARCHAR(50) 
    USING CASE 
      WHEN tenant_code IS NULL THEN NULL 
      ELSE tenant_code::TEXT 
    END;
    
    RAISE NOTICE 'Converted accounting.journal_entries.tenant_code from INTEGER to VARCHAR(50)';
  END IF;
END $$;

-- =====================================================
-- Step 4: Ensure audit schema tables use VARCHAR(50) (they should already)
-- =====================================================
-- Audit tables already use VARCHAR(50) in migration 003, but verify consistency
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'audit' 
    AND table_type = 'BASE TABLE'
  LOOP
    -- Check if tenant_code column exists and needs conversion
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'audit' 
      AND table_name = table_record.table_name 
      AND column_name = 'tenant_code'
      AND data_type != 'character varying'
    ) THEN
      EXECUTE format(
        'ALTER TABLE audit.%I ALTER COLUMN tenant_code TYPE VARCHAR(50) USING CASE WHEN tenant_code IS NULL THEN NULL ELSE tenant_code::TEXT END',
        table_record.table_name
      );
      RAISE NOTICE 'Converted audit.%.tenant_code to VARCHAR(50)', table_record.table_name;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- Step 5: Ensure RS schema tables use VARCHAR(50) (they should already)
-- =====================================================
-- RS tables already use VARCHAR(50) in migration 005, but verify consistency
-- Note: RS tables don't have tenant_code, they use COMPANY_TIN instead

-- =====================================================
-- Step 6: Ensure migration_history.tenant_code uses VARCHAR(50)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'migration_history' 
    AND column_name = 'tenant_code'
    AND data_type != 'character varying'
  ) THEN
    ALTER TABLE migration_history 
    ALTER COLUMN tenant_code TYPE VARCHAR(50) 
    USING CASE 
      WHEN tenant_code IS NULL THEN NULL 
      ELSE tenant_code::TEXT 
    END;
    
    RAISE NOTICE 'Converted migration_history.tenant_code to VARCHAR(50)';
  END IF;
END $$;

-- =====================================================
-- Step 7: Fix Messaging Notifications Foreign Keys
-- =====================================================
-- Verify and add any missing foreign key constraints

-- Ensure conversations.client_id has proper foreign key
DO $$
BEGIN
  -- Check if foreign key exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'conversations'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'client_id'
  ) THEN
    -- Add foreign key if missing
    ALTER TABLE conversations 
    ADD CONSTRAINT conversations_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint: conversations.client_id -> clients.id';
  END IF;
END $$;

-- Ensure conversations.created_by has proper foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'conversations'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'created_by'
  ) THEN
    ALTER TABLE conversations 
    ADD CONSTRAINT conversations_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint: conversations.created_by -> users.id';
  END IF;
END $$;

-- Ensure conversation_participants has proper foreign keys
DO $$
BEGIN
  -- conversation_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'conversation_participants'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'conversation_id'
  ) THEN
    ALTER TABLE conversation_participants 
    ADD CONSTRAINT conversation_participants_conversation_id_fkey 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint: conversation_participants.conversation_id -> conversations.id';
  END IF;
  
  -- user_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'conversation_participants'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'user_id'
  ) THEN
    ALTER TABLE conversation_participants 
    ADD CONSTRAINT conversation_participants_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint: conversation_participants.user_id -> users.id';
  END IF;
END $$;

-- Ensure messages has proper foreign keys
DO $$
BEGIN
  -- conversation_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'messages'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'conversation_id'
  ) THEN
    ALTER TABLE messages 
    ADD CONSTRAINT messages_conversation_id_fkey 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint: messages.conversation_id -> conversations.id';
  END IF;
  
  -- sender_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'messages'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'sender_id'
  ) THEN
    ALTER TABLE messages 
    ADD CONSTRAINT messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint: messages.sender_id -> users.id';
  END IF;
END $$;

-- Ensure notifications has proper foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'notifications'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'user_id'
  ) THEN
    ALTER TABLE notifications 
    ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint: notifications.user_id -> users.id';
  END IF;
END $$;

-- =====================================================
-- Step 8: Create Helper Function for Integer Conversion
-- =====================================================
-- This function allows converting VARCHAR(50) tenant_code to INTEGER where needed
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

-- =====================================================
-- Step 9: Update Indexes (if needed)
-- =====================================================
-- Indexes should still work with VARCHAR(50), but verify they exist
CREATE INDEX IF NOT EXISTS idx_clients_tenant_code ON clients(tenant_code);
CREATE INDEX IF NOT EXISTS idx_general_ledger_tenant_code ON accounting.general_ledger(tenant_code);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_code ON accounting.journal_entries(tenant_code);
CREATE INDEX IF NOT EXISTS idx_migration_history_tenant_code ON migration_history(tenant_code);

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON COLUMN clients.tenant_code IS 'MSSQL tenant code for data synchronization (VARCHAR for flexibility, convert to INT in code when needed)';
COMMENT ON COLUMN accounting.general_ledger.tenant_code IS 'MSSQL tenant code (VARCHAR for flexibility, convert to INT in code when needed)';
COMMENT ON COLUMN accounting.journal_entries.tenant_code IS 'MSSQL tenant code (VARCHAR for flexibility, convert to INT in code when needed)';

-- DOWN
-- Revert tenant_code back to INTEGER/NUMERIC (if needed for rollback)
-- Note: This is a destructive operation and should be used carefully

-- Revert clients.tenant_code to INTEGER
-- ALTER TABLE clients ALTER COLUMN tenant_code TYPE INTEGER USING tenant_code::INTEGER;

-- Revert accounting.general_ledger.tenant_code to NUMERIC(18,0)
-- ALTER TABLE accounting.general_ledger ALTER COLUMN tenant_code TYPE NUMERIC(18,0) USING tenant_code::NUMERIC;

-- Revert accounting.journal_entries.tenant_code to INTEGER
-- ALTER TABLE accounting.journal_entries ALTER COLUMN tenant_code TYPE INTEGER USING tenant_code::INTEGER;

-- Drop helper function
DROP FUNCTION IF EXISTS tenant_code_to_int(VARCHAR(50));

