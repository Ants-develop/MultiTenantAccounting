-- Migration: Create profiles table (Supabase Auth) and drop legacy users table
-- UP

-- Step 1: Drop legacy users table and all its foreign key constraints
DROP TABLE IF EXISTS "users" CASCADE;

-- Step 2: Create profiles table (Supabase Auth compatible)
-- Note: Do NOT add FK constraint to clients.id yet - it will be added in migration 0001
CREATE TABLE IF NOT EXISTS "profiles" (
  "id" uuid PRIMARY KEY,
  "username" text UNIQUE,
  "email" text UNIQUE,
  "full_name" text,
  "first_name" text,
  "last_name" text,
  "avatar_url" text,
  "phone" text,
  "job_title" text,
  "global_role" text DEFAULT 'user',
  "is_active" boolean DEFAULT true,
  "matrix_id" text,
  "client_id" uuid,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Step 3: Create indexes on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username ON "profiles"("username");
CREATE INDEX IF NOT EXISTS idx_profiles_email ON "profiles"("email");
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON "profiles"("client_id");
CREATE INDEX IF NOT EXISTS idx_profiles_global_role ON "profiles"("global_role");

-- Step 4: Update user_companies user_id to UUID (but don't add FK yet)
ALTER TABLE "user_companies" DROP CONSTRAINT IF EXISTS "user_companies_user_id_users_id_fk";
ALTER TABLE "user_companies" ALTER COLUMN "user_id" TYPE uuid USING NULL;

-- Step 5: Update user_companies client_id to UUID (but don't add FK yet)
ALTER TABLE "user_companies" ALTER COLUMN "client_id" TYPE uuid USING NULL;

-- Step 6: Update activity_logs user_id to UUID (but don't add FK yet)
ALTER TABLE "activity_logs" DROP CONSTRAINT IF EXISTS "activity_logs_user_id_users_id_fk";
ALTER TABLE "activity_logs" ALTER COLUMN "user_id" TYPE uuid USING NULL;

-- Step 7: Update activity_logs client_id to UUID (but don't add FK yet)
ALTER TABLE "activity_logs" ALTER COLUMN "client_id" TYPE uuid USING NULL;

-- Step 8: Update user_client_modules user_id to UUID (but don't add FK yet)
ALTER TABLE "user_client_modules" DROP CONSTRAINT IF EXISTS "user_client_modules_user_id_users_id_fk";
ALTER TABLE "user_client_modules" ALTER COLUMN "user_id" TYPE uuid USING NULL;

-- Step 9: Update user_client_modules client_id to UUID (but don't add FK yet)
ALTER TABLE "user_client_modules" ALTER COLUMN "client_id" TYPE uuid USING NULL;

-- Step 10: Update user_client_features user_id to UUID (but don't add FK yet)
ALTER TABLE "user_client_features" DROP CONSTRAINT IF EXISTS "user_client_features_user_id_users_id_fk";
ALTER TABLE "user_client_features" ALTER COLUMN "user_id" TYPE uuid USING NULL;

-- Step 11: Update user_client_features client_id to UUID (but don't add FK yet)
ALTER TABLE "user_client_features" ALTER COLUMN "client_id" TYPE uuid USING NULL;

-- Step 12: Update notifications user_id to UUID (but don't add FK yet)
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_user_id_users_id_fk";
ALTER TABLE "notifications" ALTER COLUMN "user_id" TYPE uuid USING NULL;

-- Step 13: Update messages columns to UUID
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_sender_id_users_id_fk";
ALTER TABLE "messages" ALTER COLUMN "sender_id" TYPE uuid USING NULL;

-- Step 14: Update conversations created_by to UUID
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_created_by_users_id_fk";
ALTER TABLE "conversations" ALTER COLUMN "created_by" TYPE uuid USING NULL;

-- Step 15: Update conversations client_id to UUID
ALTER TABLE "conversations" ALTER COLUMN "client_id" TYPE uuid USING NULL;

-- Step 16: Update conversation_participants user_id to UUID
ALTER TABLE "conversation_participants" DROP CONSTRAINT IF EXISTS "conversation_participants_user_id_users_id_fk";
ALTER TABLE "conversation_participants" ALTER COLUMN "user_id" TYPE uuid USING NULL;

-- Step 17: Update rs_users created_by_user_id to UUID
ALTER TABLE "rs.users" DROP CONSTRAINT IF EXISTS "users_created_by_user_id_users_id_fk";
ALTER TABLE "rs.users" ALTER COLUMN "created_by_user_id" TYPE uuid USING NULL;

-- Step 18: Update rs_users client_id to UUID
ALTER TABLE "rs.users" ALTER COLUMN "client_id" TYPE uuid USING NULL;

-- Step 19: Update other tables' user_id columns to UUID (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='backup_migration_logs' AND column_name='created_by') THEN
    ALTER TABLE "backup_migration_logs" ALTER COLUMN "created_by" TYPE uuid USING NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mssql_restores' AND column_name='created_by') THEN
    ALTER TABLE "mssql_restores" ALTER COLUMN "created_by" TYPE uuid USING NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mssql_restores' AND column_name='client_id') THEN
    ALTER TABLE "mssql_restores" ALTER COLUMN "client_id" TYPE uuid USING NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gdrive_downloads' AND column_name='created_by') THEN
    ALTER TABLE "gdrive_downloads" ALTER COLUMN "created_by" TYPE uuid USING NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='uploaded_by') THEN
    ALTER TABLE "documents" ALTER COLUMN "uploaded_by" TYPE uuid USING NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='client_id') THEN
    ALTER TABLE "documents" ALTER COLUMN "client_id" TYPE uuid USING NULL;
  END IF;
END $$;

-- DOWN
DROP TABLE IF EXISTS "profiles" CASCADE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subtasks' AND table_schema = 'public') THEN
    ALTER TABLE "subtasks" DROP CONSTRAINT IF EXISTS "subtasks_assignee_id_users_id_fk";
    EXECUTE 'ALTER TABLE "subtasks" ALTER COLUMN "assignee_id" TYPE uuid USING gen_random_uuid()';
    ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_assignee_id_profiles_id_fk" 
      FOREIGN KEY ("assignee_id") REFERENCES "profiles"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- DOWN
DROP TABLE IF EXISTS "profiles" CASCADE;
