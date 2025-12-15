-- Migration to unify user system to Supabase Auth
-- This migration drops the legacy 'users' table and updates all references to use 'profiles' (UUID)

-- 1. Drop tables that depend on 'users' (we will recreate them with UUID FKs)
DROP TABLE IF EXISTS "user_companies" CASCADE;
DROP TABLE IF EXISTS "user_client_modules" CASCADE;
DROP TABLE IF EXISTS "user_client_features" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "activity_logs" CASCADE;
DROP TABLE IF EXISTS "messages" CASCADE;
DROP TABLE IF EXISTS "conversation_participants" CASCADE;
DROP TABLE IF EXISTS "conversations" CASCADE;

-- 2. Drop legacy users table
DROP TABLE IF EXISTS "users" CASCADE;

-- 2.5 Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS "profiles" (
  "id" uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "updated_at" timestamp with time zone,
  "username" text UNIQUE,
  "full_name" text,
  "avatar_url" text,
  "website" text,
  "email" text UNIQUE,
  "first_name" text,
  "last_name" text,
  "global_role" text DEFAULT 'user',
  "is_active" boolean DEFAULT true,
  "matrix_id" text
);

-- 3. Update profiles table to include fields from legacy users
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "username" text UNIQUE;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "email" text UNIQUE;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "global_role" text DEFAULT 'user';
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "matrix_id" text;

-- 4. Recreate tables with UUID foreign keys referencing profiles(id)

-- User Companies
CREATE TABLE IF NOT EXISTS "user_companies" (
    "id" serial PRIMARY KEY,
    "user_id" uuid REFERENCES "profiles"("id"),
    "client_id" integer REFERENCES "clients"("id") NOT NULL,
    "role" text NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT now()
);

-- User Client Modules
CREATE TABLE IF NOT EXISTS "user_client_modules" (
    "id" serial PRIMARY KEY,
    "user_id" uuid REFERENCES "profiles"("id") NOT NULL,
    "client_id" integer REFERENCES "clients"("id") NOT NULL,
    "module" text NOT NULL,
    "can_view" boolean DEFAULT false,
    "can_create" boolean DEFAULT false,
    "can_edit" boolean DEFAULT false,
    "can_delete" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- User Client Features
CREATE TABLE IF NOT EXISTS "user_client_features" (
    "id" serial PRIMARY KEY,
    "user_id" uuid REFERENCES "profiles"("id") NOT NULL,
    "client_id" integer REFERENCES "clients"("id") NOT NULL,
    "feature" text NOT NULL,
    "is_enabled" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" serial PRIMARY KEY,
    "user_id" uuid REFERENCES "profiles"("id") NOT NULL,
    "type" text NOT NULL,
    "title" text NOT NULL,
    "message" text NOT NULL,
    "link" text,
    "is_read" boolean DEFAULT false,
    "read_at" timestamp,
    "created_at" timestamp DEFAULT now()
);

-- Activity Logs
CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" serial PRIMARY KEY,
    "user_id" uuid REFERENCES "profiles"("id"),
    "client_id" integer REFERENCES "clients"("id"),
    "action" text NOT NULL,
    "resource" text NOT NULL,
    "details" jsonb,
    "ip_address" text,
    "user_agent" text,
    "timestamp" timestamp DEFAULT now()
);

-- Conversations
CREATE TABLE IF NOT EXISTS "conversations" (
    "id" serial PRIMARY KEY,
    "title" text,
    "type" text DEFAULT 'direct' NOT NULL,
    "client_id" integer REFERENCES "clients"("id") ON DELETE CASCADE,
    "created_by" uuid REFERENCES "profiles"("id") ON DELETE CASCADE NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "last_message_at" timestamp,
    "is_archived" boolean DEFAULT false NOT NULL
);

-- Conversation Participants
CREATE TABLE IF NOT EXISTS "conversation_participants" (
    "id" serial PRIMARY KEY,
    "conversation_id" integer REFERENCES "conversations"("id") ON DELETE CASCADE NOT NULL,
    "user_id" uuid REFERENCES "profiles"("id") ON DELETE CASCADE NOT NULL,
    "joined_at" timestamp DEFAULT now() NOT NULL,
    "last_read_at" timestamp,
    "is_muted" boolean DEFAULT false NOT NULL
);

-- Messages
CREATE TABLE IF NOT EXISTS "messages" (
    "id" serial PRIMARY KEY,
    "conversation_id" integer REFERENCES "conversations"("id") ON DELETE CASCADE NOT NULL,
    "sender_id" uuid REFERENCES "profiles"("id") ON DELETE CASCADE NOT NULL,
    "content" text NOT NULL,
    "type" text DEFAULT 'text' NOT NULL,
    "metadata" jsonb DEFAULT '{}',
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "is_edited" boolean DEFAULT false NOT NULL,
    "is_deleted" boolean DEFAULT false NOT NULL
);

-- 5. Update other tables that have user references (altering columns)

-- rs_users
ALTER TABLE rs.users DROP COLUMN IF EXISTS "created_by_user_id";
ALTER TABLE rs.users ADD COLUMN "created_by_user_id" uuid REFERENCES "profiles"("id");

-- journal_entries
ALTER TABLE "journal_entries" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "journal_entries" ADD COLUMN "user_id" uuid REFERENCES "profiles"("id");

-- invoices
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "invoices" ADD COLUMN "user_id" uuid REFERENCES "profiles"("id");

-- bills
ALTER TABLE "bills" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "bills" ADD COLUMN "user_id" uuid REFERENCES "profiles"("id");

-- raw_bank_transactions
ALTER TABLE "raw_bank_transactions" DROP COLUMN IF EXISTS "imported_by";
ALTER TABLE "raw_bank_transactions" ADD COLUMN "imported_by" uuid REFERENCES "profiles"("id");

-- normalized_bank_transactions
ALTER TABLE "normalized_bank_transactions" DROP COLUMN IF EXISTS "normalized_by";
ALTER TABLE "normalized_bank_transactions" ADD COLUMN "normalized_by" uuid REFERENCES "profiles"("id");

-- gdrive_downloads
ALTER TABLE "gdrive_downloads" DROP COLUMN IF EXISTS "created_by";
ALTER TABLE "gdrive_downloads" ADD COLUMN "created_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL;

-- mssql_restores
ALTER TABLE "mssql_restores" DROP COLUMN IF EXISTS "created_by";
ALTER TABLE "mssql_restores" ADD COLUMN "created_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL;

-- backup_migration_logs
ALTER TABLE "backup_migration_logs" DROP COLUMN IF EXISTS "created_by";
ALTER TABLE "backup_migration_logs" ADD COLUMN "created_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL;

-- 6. Create trigger to automatically create profile on signup (if not exists)
-- This is usually handled by Supabase Auth hooks, but we ensure the table structure is ready.
