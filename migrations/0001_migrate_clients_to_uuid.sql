-- =====================================================
-- Migration: Convert clients.id from serial (integer) to UUID
-- Reason: Align with Supabase Auth patterns (auth.users.id is UUID)
-- Impact: Affects 22 tables with foreign keys to clients.id
-- =====================================================

-- UP
-- Set constraints to deferred to allow FK violations during migration
SET CONSTRAINTS ALL DEFERRED;

-- Drop all dependent tables (CASCADE handles relationships)
DROP TABLE IF EXISTS accounting.accounts CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS bank.bank_accounts CASCADE;
DROP TABLE IF EXISTS accounting.bills CASCADE;
DROP TABLE IF EXISTS crm.client_checklists CASCADE;
DROP TABLE IF EXISTS crm.client_documents CASCADE;
DROP TABLE IF EXISTS crm.client_onboarding_forms CASCADE;
DROP TABLE IF EXISTS crm.client_onboarding_steps CASCADE;
DROP TABLE IF EXISTS crm.client_service_packages CASCADE;
DROP TABLE IF EXISTS crm.client_team_assignments CASCADE;
DROP TABLE IF EXISTS company_settings CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS accounting.customers CASCADE;
DROP TABLE IF EXISTS email.email_accounts CASCADE;
DROP TABLE IF EXISTS email.email_messages CASCADE;
DROP TABLE IF EXISTS email.email_routing_rules CASCADE;
DROP TABLE IF EXISTS email.email_templates CASCADE;
DROP TABLE IF EXISTS accounting.invoices CASCADE;
DROP TABLE IF EXISTS tasks.jobs CASCADE;
DROP TABLE IF EXISTS accounting.journal_entries CASCADE;
DROP TABLE IF EXISTS bank.raw_bank_transactions CASCADE;
DROP TABLE IF EXISTS bank.normalized_bank_transactions CASCADE;
DROP TABLE IF EXISTS rs.users CASCADE;
DROP TABLE IF EXISTS user_companies CASCADE;
DROP TABLE IF EXISTS user_client_modules CASCADE;
DROP TABLE IF EXISTS user_client_features CASCADE;
DROP TABLE IF EXISTS feed_posts CASCADE;
DROP TABLE IF EXISTS backup_restore_tracking CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS mssql_restores CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Recreate clients table with UUID
CREATE TABLE IF NOT EXISTS "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"tenant_code" text,
	"address" text,
	"phone" text,
	"email" text,
	"tax_id" text,
	"business_type" text DEFAULT 'individual',
	"industry" text,
	"fiscal_year_start" integer DEFAULT 1,
	"currency" text DEFAULT 'GEL',
	"is_active" boolean DEFAULT true,
	"status" text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
	"manager" text,
	"accounting_software" text,
	"id_code" text,
	"verification_status" text DEFAULT 'not_registered',
	"assigned_owner_id" uuid,
	"assigned_accountant_id" uuid,
	"assigned_reviewer_id" uuid,
	"notes" text,
	"communication_preferences" jsonb DEFAULT '{}'::jsonb,
	"portal_enabled" boolean DEFAULT false,
	"portal_access_token" uuid DEFAULT gen_random_uuid(),
	"portal_invitation_sent_at" timestamp with time zone,
	"portal_invitation_accepted_at" timestamp with time zone,
	"last_portal_login" timestamp with time zone,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "clients_code_unique" UNIQUE("code"),
	CONSTRAINT "clients_tenant_code_unique" UNIQUE("tenant_code")
);
--> statement-breakpoint

-- Update profiles table FK to use UUID
ALTER TABLE "profiles" 
	DROP CONSTRAINT IF EXISTS "profiles_client_id_clients_id_fk";
ALTER TABLE "profiles"
	ALTER COLUMN "client_id" SET DATA TYPE uuid;
ALTER TABLE "profiles"
	ADD CONSTRAINT "profiles_client_id_clients_id_fk" 
	FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL;
--> statement-breakpoint

-- Recreate accounting.accounts table
CREATE TABLE IF NOT EXISTS "accounting"."accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"sub_type" text,
	"parent_id" integer,
	"account_class" text,
	"category" text,
	"is_subaccount_allowed" boolean DEFAULT false,
	"is_foreign_currency" boolean DEFAULT false,
	"is_analytical" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
ALTER TABLE "accounting"."accounts" ADD CONSTRAINT "accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate activity_logs table
CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"client_id" uuid,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" integer,
	"details" text,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate bank.bank_accounts table
CREATE TABLE IF NOT EXISTS "bank"."bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text,
	"iban" text,
	"bank_name" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"opening_balance" numeric(15, 2) DEFAULT '0',
	"current_balance" numeric(15, 2) DEFAULT '0',
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
ALTER TABLE "bank"."bank_accounts" ADD CONSTRAINT "bank_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Recreate accounting.bills table
CREATE TABLE IF NOT EXISTS "accounting"."bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"vendor_id" integer NOT NULL,
	"bill_number" text NOT NULL,
	"date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0',
	"total_amount" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'draft',
	"user_id" uuid,
	"created_at" timestamp DEFAULT now()
);
ALTER TABLE "accounting"."bills" ADD CONSTRAINT "bills_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate crm.client_checklists table
CREATE TABLE IF NOT EXISTS "crm"."client_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"template_id" integer,
	"items" jsonb NOT NULL,
	"status" text DEFAULT 'in_progress',
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
ALTER TABLE "crm"."client_checklists" ADD CONSTRAINT "client_checklists_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate crm.client_documents table
CREATE TABLE IF NOT EXISTS "crm"."client_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"file_data" text,
	"file_type" text,
	"file_size" integer DEFAULT 0,
	"version" integer DEFAULT 1,
	"expiration_date" timestamp,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
ALTER TABLE "crm"."client_documents" ADD CONSTRAINT "client_documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate crm.client_onboarding_forms table
CREATE TABLE IF NOT EXISTS "crm"."client_onboarding_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"form_type" text NOT NULL,
	"form_data" jsonb NOT NULL,
	"status" text DEFAULT 'draft',
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
ALTER TABLE "crm"."client_onboarding_forms" ADD CONSTRAINT "client_onboarding_forms_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate crm.client_onboarding_steps table
CREATE TABLE IF NOT EXISTS "crm"."client_onboarding_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"step_name" text NOT NULL,
	"step_type" text NOT NULL,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
ALTER TABLE "crm"."client_onboarding_steps" ADD CONSTRAINT "client_onboarding_steps_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate crm.client_service_packages table
CREATE TABLE IF NOT EXISTS "crm"."client_service_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"package_name" text NOT NULL,
	"services" jsonb NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
ALTER TABLE "crm"."client_service_packages" ADD CONSTRAINT "client_service_packages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate crm.client_team_assignments table
CREATE TABLE IF NOT EXISTS "crm"."client_team_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" uuid
);
ALTER TABLE "crm"."client_team_assignments" ADD CONSTRAINT "client_team_assignments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate company_settings table
CREATE TABLE IF NOT EXISTS "company_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"email_notifications" boolean DEFAULT true,
	"invoice_reminders" boolean DEFAULT true,
	"payment_alerts" boolean DEFAULT true,
	"report_reminders" boolean DEFAULT false,
	"system_updates" boolean DEFAULT true,
	"auto_numbering" boolean DEFAULT true,
	"invoice_prefix" text DEFAULT 'INV',
	"bill_prefix" text DEFAULT 'BILL',
	"journal_prefix" text DEFAULT 'JE',
	"decimal_places" integer DEFAULT 2,
	"negative_format" text DEFAULT 'minus',
	"date_format" text DEFAULT 'MM/DD/YYYY',
	"time_zone" text DEFAULT 'America/New_York',
	"require_password_change" boolean DEFAULT false,
	"password_expire_days" integer DEFAULT 90,
	"session_timeout" integer DEFAULT 30,
	"enable_two_factor" boolean DEFAULT false,
	"allow_multiple_sessions" boolean DEFAULT true,
	"bank_connection" boolean DEFAULT false,
	"payment_gateway" boolean DEFAULT false,
	"tax_service" boolean DEFAULT false,
	"reporting_tools" boolean DEFAULT false,
	"auto_backup" boolean DEFAULT false,
	"backup_frequency" text DEFAULT 'weekly',
	"retention_days" integer DEFAULT 30,
	"backup_location" text DEFAULT 'cloud',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "company_settings_client_id_unique" UNIQUE("client_id")
);
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate conversations table
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text,
	"type" text DEFAULT 'direct' NOT NULL,
	"client_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp,
	"is_archived" boolean DEFAULT false NOT NULL
);
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Recreate accounting.customers table
CREATE TABLE IF NOT EXISTS "accounting"."customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
ALTER TABLE "accounting"."customers" ADD CONSTRAINT "customers_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate email.email_accounts table
CREATE TABLE IF NOT EXISTS "email"."email_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"client_id" uuid,
	"email_address" text NOT NULL,
	"provider" text DEFAULT 'gmail',
	"access_token" text,
	"refresh_token" text,
	"token_expiry" timestamp,
	"imap_host" text,
	"imap_port" integer DEFAULT 993,
	"imap_username" text,
	"imap_password" text,
	"smtp_host" text,
	"smtp_port" integer DEFAULT 587,
	"smtp_username" text,
	"smtp_password" text,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
ALTER TABLE "email"."email_accounts" ADD CONSTRAINT "email_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate email.email_messages table
CREATE TABLE IF NOT EXISTS "email"."email_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_account_id" integer NOT NULL,
	"client_id" uuid,
	"message_id" text NOT NULL,
	"thread_id" text,
	"subject" text,
	"from_address" text NOT NULL,
	"to_addresses" jsonb,
	"cc_addresses" jsonb,
	"bcc_addresses" jsonb,
	"body_text" text,
	"body_html" text,
	"attachments" jsonb,
	"is_read" boolean DEFAULT false,
	"is_starred" boolean DEFAULT false,
	"labels" jsonb,
	"received_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
ALTER TABLE "email"."email_messages" ADD CONSTRAINT "email_messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate email.email_templates table
CREATE TABLE IF NOT EXISTS "email"."email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid,
	"template_name" text NOT NULL,
	"template_type" text,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"variables" jsonb,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
ALTER TABLE "email"."email_templates" ADD CONSTRAINT "email_templates_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate email.email_routing_rules table
CREATE TABLE IF NOT EXISTS "email"."email_routing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid,
	"rule_name" text NOT NULL,
	"condition" jsonb NOT NULL,
	"action_type" text NOT NULL,
	"action_config" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 0,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
ALTER TABLE "email"."email_routing_rules" ADD CONSTRAINT "email_routing_rules_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate accounting.invoices table
CREATE TABLE IF NOT EXISTS "accounting"."invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"customer_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0',
	"total_amount" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'draft',
	"user_id" uuid,
	"created_at" timestamp DEFAULT now()
);
ALTER TABLE "accounting"."invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate tasks.jobs table
CREATE TABLE IF NOT EXISTS "tasks"."jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid,
	"job_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending',
	"priority" text DEFAULT 'medium',
	"assigned_to" uuid,
	"assigned_by" uuid,
	"due_date" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
ALTER TABLE "tasks"."jobs" ADD CONSTRAINT "jobs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- Recreate accounting.journal_entries table
CREATE TABLE IF NOT EXISTS "accounting"."journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"entry_number" text NOT NULL,
	"entry_date" timestamp NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft',
	"user_id" uuid,
	"posted_by" uuid,
	"posted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	UNIQUE("entry_number", "client_id")
);
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate bank.raw_bank_transactions table
CREATE TABLE IF NOT EXISTS "bank"."raw_bank_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_account_id" integer NOT NULL,
	"client_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text,
	"counterparty" text,
	"description" text,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	UNIQUE("external_id", "client_id")
);
ALTER TABLE "bank"."raw_bank_transactions" ADD CONSTRAINT "raw_bank_transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Recreate bank.normalized_bank_transactions table
CREATE TABLE IF NOT EXISTS "bank"."normalized_bank_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"raw_transaction_id" integer NOT NULL,
	"bank_account_id" integer NOT NULL,
	"client_id" uuid NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text,
	"type" text,
	"counterparty" text,
	"description" text,
	"matched_account_id" integer,
	"matched_invoice_id" integer,
	"status" text DEFAULT 'unmatched',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
ALTER TABLE "bank"."normalized_bank_transactions" ADD CONSTRAINT "normalized_bank_transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Recreate rs.users table
CREATE TABLE IF NOT EXISTS "rs"."users" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"s_user" text NOT NULL,
	"s_password" text NOT NULL,
	"s_password_hash" text NOT NULL,
	"main_user" text,
	"main_password" text,
	"main_password_hash" text,
	"user_id" text,
	"un_id" text,
	"client_id" uuid,
	"company_tin" text,
	"created_by_user_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
ALTER TABLE "rs"."users" ADD CONSTRAINT "rs_users_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate user_companies table
CREATE TABLE IF NOT EXISTS "user_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"client_id" uuid NOT NULL,
	"role" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate user_client_modules table
CREATE TABLE IF NOT EXISTS "user_client_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"module_name" text NOT NULL,
	"can_view" boolean DEFAULT false,
	"can_create" boolean DEFAULT false,
	"can_edit" boolean DEFAULT false,
	"can_delete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
ALTER TABLE "user_client_modules" ADD CONSTRAINT "user_client_modules_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate user_client_features table
CREATE TABLE IF NOT EXISTS "user_client_features" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"feature_name" text NOT NULL,
	"is_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
ALTER TABLE "user_client_features" ADD CONSTRAINT "user_client_features_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Recreate feed_posts table
CREATE TABLE IF NOT EXISTS "feed_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"attachments" jsonb,
	"is_pinned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Recreate backup_restore_tracking table
CREATE TABLE IF NOT EXISTS "backup_restore_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid,
	"operation_type" text NOT NULL,
	"status" text DEFAULT 'pending',
	"started_by" uuid,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"error_message" text,
	"file_path" text
);
ALTER TABLE "backup_restore_tracking" ADD CONSTRAINT "backup_restore_tracking_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- Recreate documents table
CREATE TABLE IF NOT EXISTS "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid,
	"name" text NOT NULL,
	"file_type" text,
	"file_size" integer,
	"storage_path" text,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- Recreate mssql_restores table
CREATE TABLE IF NOT EXISTS "mssql_restores" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid,
	"database_name" text,
	"backup_file_path" text,
	"restore_start_time" timestamp,
	"restore_end_time" timestamp,
	"status" text,
	"error_message" text,
	"restored_by" uuid,
	"created_at" timestamp DEFAULT now()
);
ALTER TABLE "mssql_restores" ADD CONSTRAINT "mssql_restores_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- DOWN
DROP TABLE IF EXISTS mssql_restores CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS backup_restore_tracking CASCADE;
DROP TABLE IF EXISTS feed_posts CASCADE;
DROP TABLE IF EXISTS user_client_features CASCADE;
DROP TABLE IF EXISTS user_client_modules CASCADE;
DROP TABLE IF EXISTS user_companies CASCADE;
DROP TABLE IF EXISTS rs.users CASCADE;
DROP TABLE IF EXISTS bank.normalized_bank_transactions CASCADE;
DROP TABLE IF EXISTS bank.raw_bank_transactions CASCADE;
DROP TABLE IF EXISTS accounting.journal_entries CASCADE;
DROP TABLE IF EXISTS tasks.jobs CASCADE;
DROP TABLE IF EXISTS accounting.invoices CASCADE;
DROP TABLE IF EXISTS email.email_routing_rules CASCADE;
DROP TABLE IF EXISTS email.email_templates CASCADE;
DROP TABLE IF EXISTS email.email_messages CASCADE;
DROP TABLE IF EXISTS email.email_accounts CASCADE;
DROP TABLE IF EXISTS accounting.customers CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS company_settings CASCADE;
DROP TABLE IF EXISTS crm.client_team_assignments CASCADE;
DROP TABLE IF EXISTS crm.client_service_packages CASCADE;
DROP TABLE IF EXISTS crm.client_onboarding_steps CASCADE;
DROP TABLE IF EXISTS crm.client_onboarding_forms CASCADE;
DROP TABLE IF EXISTS crm.client_documents CASCADE;
DROP TABLE IF EXISTS crm.client_checklists CASCADE;
DROP TABLE IF EXISTS accounting.bills CASCADE;
DROP TABLE IF EXISTS bank.bank_accounts CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS accounting.accounts CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
