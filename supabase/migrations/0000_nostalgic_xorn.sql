-- =====================================================
-- CREATE SCHEMAS
-- =====================================================
CREATE SCHEMA IF NOT EXISTS accounting;
CREATE SCHEMA IF NOT EXISTS rs;

--> statement-breakpoint
CREATE TABLE "accounting"."accounts" (
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
--> statement-breakpoint
CREATE TABLE "activity_logs" (
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
--> statement-breakpoint
CREATE TABLE "backup_migration_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"restore_id" integer,
	"source_table" text NOT NULL,
	"target_table" text NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_inserted" integer DEFAULT 0,
	"records_failed" integer DEFAULT 0,
	"migration_timestamp" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_log" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mssql_restores" (
	"id" serial PRIMARY KEY NOT NULL,
	"download_id" integer,
	"google_drive_file_id" text,
	"google_drive_file_name" text NOT NULL,
	"supabase_storage_path" text,
	"file_hash" text,
	"storage_source" text DEFAULT 'google_drive' NOT NULL,
	"restored_db_name" text NOT NULL,
	"restore_timestamp" timestamp DEFAULT now() NOT NULL,
	"original_backup_date" timestamp,
	"database_size_mb" numeric(10, 2),
	"is_active" boolean DEFAULT true,
	"local_backup_path" text,
	"restore_status" text DEFAULT 'pending' NOT NULL,
	"client_id" uuid,
	"restore_options" jsonb,
	"completed_at" timestamp,
	"error_message" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
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
--> statement-breakpoint
CREATE TABLE "accounting"."bills" (
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
--> statement-breakpoint
CREATE TABLE "clients" (
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
	"status" text DEFAULT 'active',
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
	"portal_invitation_sent_at" timestamp,
	"portal_invitation_accepted_at" timestamp,
	"last_portal_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "clients_code_unique" UNIQUE("code"),
	CONSTRAINT "clients_tenant_code_unique" UNIQUE("tenant_code")
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
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
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_read_at" timestamp,
	"is_muted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
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
--> statement-breakpoint
CREATE TABLE "accounting"."customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"type" text,
	"size" integer,
	"client_id" uuid,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gdrive_downloads" (
	"id" serial PRIMARY KEY NOT NULL,
	"gdrive_file_id" text NOT NULL,
	"filename" text NOT NULL,
	"download_timestamp" timestamp DEFAULT now() NOT NULL,
	"file_size_bytes" numeric,
	"local_file_path" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"file_hash" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "accounting"."invoices" (
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
--> statement-breakpoint
CREATE TABLE "accounting"."journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"entry_number" text NOT NULL,
	"date" timestamp NOT NULL,
	"description" text NOT NULL,
	"reference" text,
	"total_amount" numeric(15, 2) NOT NULL,
	"user_id" uuid,
	"is_posted" boolean DEFAULT false,
	"tenant_code" text,
	"tenant_name" text,
	"abonent" text,
	"postings_period" timestamp,
	"register" text,
	"branch" text,
	"content_text" text,
	"responsible_person" text,
	"account_dr" text,
	"account_name_dr" text,
	"analytic_dr" text,
	"analytic_ref_dr" text,
	"id_dr" text,
	"legal_form_dr" text,
	"country_dr" text,
	"profit_tax_dr" boolean,
	"withholding_tax_dr" boolean,
	"double_taxation_dr" boolean,
	"pension_scheme_participant_dr" boolean,
	"account_cr" text,
	"account_name_cr" text,
	"analytic_cr" text,
	"analytic_ref_cr" text,
	"id_cr" text,
	"legal_form_cr" text,
	"country_cr" text,
	"profit_tax_cr" boolean,
	"withholding_tax_cr" boolean,
	"double_taxation_cr" boolean,
	"pension_scheme_participant_cr" boolean,
	"currency" text,
	"amount" numeric(21, 2),
	"amount_cur" numeric(21, 2),
	"quantity_dr" numeric(21, 4),
	"quantity_cr" numeric(21, 4),
	"rate" numeric(19, 13),
	"document_rate" numeric(19, 13),
	"tax_invoice_number" text,
	"tax_invoice_date" timestamp,
	"tax_invoice_series" text,
	"waybill_number" text,
	"attached_files" numeric(17, 5),
	"doc_type" text,
	"doc_date" timestamp,
	"doc_number" text,
	"document_creation_date" timestamp,
	"document_modify_date" timestamp,
	"document_comments" text,
	"posting_number" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "accounting"."journal_entry_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"journal_entry_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"description" text,
	"debit_amount" numeric(15, 2) DEFAULT '0',
	"credit_amount" numeric(15, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "main_company_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"tax_id" text,
	"fiscal_year_start" integer DEFAULT 1,
	"currency" text DEFAULT 'GEL',
	"date_format" text DEFAULT 'MM/DD/YYYY',
	"decimal_places" integer DEFAULT 2,
	"time_zone" text DEFAULT 'America/New_York',
	"email_notifications" boolean DEFAULT true,
	"invoice_reminders" boolean DEFAULT true,
	"payment_alerts" boolean DEFAULT true,
	"report_reminders" boolean DEFAULT false,
	"system_updates" boolean DEFAULT true,
	"auto_numbering" boolean DEFAULT true,
	"invoice_prefix" text DEFAULT 'INV',
	"bill_prefix" text DEFAULT 'BILL',
	"journal_prefix" text DEFAULT 'JE',
	"negative_format" text DEFAULT 'minus',
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
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_edited" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"migration_id" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"message" text NOT NULL,
	"record_id" text,
	"record_data" jsonb,
	"stack" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "migration_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"migration_id" text NOT NULL,
	"type" text NOT NULL,
	"tenant_code" text,
	"table_name" text,
	"status" text NOT NULL,
	"total_records" integer DEFAULT 0,
	"processed_records" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"progress" numeric(5, 2) DEFAULT '0',
	"batch_size" integer DEFAULT 1000,
	"error_message" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "migration_history_migration_id_unique" UNIQUE("migration_id")
);
--> statement-breakpoint
CREATE TABLE "migration_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"migration_id" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"context" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "normalized_bank_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"bank_account_id" integer NOT NULL,
	"raw_transaction_id" integer NOT NULL,
	"sequence_number" integer NOT NULL,
	"movement_id" text NOT NULL,
	"document_date" timestamp,
	"debit_credit" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" text,
	"previous_balance" numeric(15, 2),
	"expected_balance" numeric(15, 2),
	"actual_balance" numeric(15, 2),
	"balance_valid" boolean DEFAULT true NOT NULL,
	"sequence_valid" boolean DEFAULT true NOT NULL,
	"validation_errors" text[],
	"normalized_at" timestamp DEFAULT now(),
	"normalized_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
-- Profiles table with Supabase Auth integration
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	"username" text,
	"email" text,
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
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "profiles_username_unique" UNIQUE("username"),
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);

-- Enable RLS on profiles
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON "profiles" FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON "profiles" FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role has full access to profiles"
  ON "profiles" FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
--> statement-breakpoint
CREATE TABLE "raw_bank_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"bank_account_id" integer,
	"movement_id" text NOT NULL,
	"unique_transaction_id" text NOT NULL,
	"debit_credit" text NOT NULL,
	"description" text,
	"amount" numeric(15, 2) NOT NULL,
	"end_balance" numeric(15, 2),
	"currency" text NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text,
	"additional_information" text,
	"document_date" timestamp,
	"document_number" text,
	"partner_account_number" text,
	"partner_name" text,
	"partner_tax_code" text,
	"partner_bank_code" text,
	"partner_bank" text,
	"intermediary_bank_code" text,
	"intermediary_bank" text,
	"charge_detail" text,
	"operation_code" text,
	"additional_description" text,
	"exchange_rate" numeric(15, 6),
	"transaction_type" text,
	"imported_at" timestamp DEFAULT now(),
	"imported_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rs"."users" (
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
--> statement-breakpoint
CREATE TABLE "user_client_features" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"module" text NOT NULL,
	"feature" text NOT NULL,
	"can_view" boolean DEFAULT false,
	"can_create" boolean DEFAULT false,
	"can_edit" boolean DEFAULT false,
	"can_delete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_client_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"module" text NOT NULL,
	"can_view" boolean DEFAULT false,
	"can_create" boolean DEFAULT false,
	"can_edit" boolean DEFAULT false,
	"can_delete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"client_id" uuid NOT NULL,
	"role" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "accounting"."vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "accounting"."accounts" ADD CONSTRAINT "accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backup_migration_logs" ADD CONSTRAINT "backup_migration_logs_restore_id_mssql_restores_id_fk" FOREIGN KEY ("restore_id") REFERENCES "public"."mssql_restores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backup_migration_logs" ADD CONSTRAINT "backup_migration_logs_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mssql_restores" ADD CONSTRAINT "mssql_restores_download_id_gdrive_downloads_id_fk" FOREIGN KEY ("download_id") REFERENCES "public"."gdrive_downloads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mssql_restores" ADD CONSTRAINT "mssql_restores_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mssql_restores" ADD CONSTRAINT "mssql_restores_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."bills" ADD CONSTRAINT "bills_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."bills" ADD CONSTRAINT "bills_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "accounting"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."bills" ADD CONSTRAINT "bills_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_assigned_owner_id_profiles_id_fk" FOREIGN KEY ("assigned_owner_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_assigned_accountant_id_profiles_id_fk" FOREIGN KEY ("assigned_accountant_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_assigned_reviewer_id_profiles_id_fk" FOREIGN KEY ("assigned_reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."customers" ADD CONSTRAINT "customers_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gdrive_downloads" ADD CONSTRAINT "gdrive_downloads_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "accounting"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."invoices" ADD CONSTRAINT "invoices_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "accounting"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounting"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_bank_transactions" ADD CONSTRAINT "normalized_bank_transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_bank_transactions" ADD CONSTRAINT "normalized_bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_bank_transactions" ADD CONSTRAINT "normalized_bank_transactions_raw_transaction_id_raw_bank_transactions_id_fk" FOREIGN KEY ("raw_transaction_id") REFERENCES "public"."raw_bank_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_bank_transactions" ADD CONSTRAINT "normalized_bank_transactions_normalized_by_profiles_id_fk" FOREIGN KEY ("normalized_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_bank_transactions" ADD CONSTRAINT "raw_bank_transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_bank_transactions" ADD CONSTRAINT "raw_bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_bank_transactions" ADD CONSTRAINT "raw_bank_transactions_imported_by_profiles_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rs"."users" ADD CONSTRAINT "users_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rs"."users" ADD CONSTRAINT "users_created_by_user_id_profiles_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_client_features" ADD CONSTRAINT "user_client_features_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_client_features" ADD CONSTRAINT "user_client_features_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_client_modules" ADD CONSTRAINT "user_client_modules_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_client_modules" ADD CONSTRAINT "user_client_modules_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."vendors" ADD CONSTRAINT "vendors_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
-- =====================================================
-- SUPABASE AUTH INTEGRATION
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    now(),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default client for testing
INSERT INTO clients (id, name, code, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Client', 'DEFAULT', 'active')
ON CONFLICT (id) DO NOTHING;