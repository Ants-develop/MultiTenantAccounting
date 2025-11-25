-- =====================================================
-- Consolidated Migration: All Database Objects
-- This migration consolidates all migrations 001-012 into a single file
-- =====================================================

-- UP
-- Create all schemas
CREATE SCHEMA IF NOT EXISTS public;
GRANT ALL ON SCHEMA public TO PUBLIC;
SET search_path = public;

CREATE SCHEMA IF NOT EXISTS accounting;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS bank;
CREATE SCHEMA IF NOT EXISTS rs;
CREATE SCHEMA IF NOT EXISTS tasks;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS email;

-- =====================================================
-- Public Schema Tables
-- =====================================================

CREATE TABLE IF NOT EXISTS "accounting"."accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
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
	"user_id" integer,
	"client_id" integer,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" integer,
	"details" text,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks"."automations" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer,
	"name" text NOT NULL,
	"description" text,
	"trigger_type" text NOT NULL,
	"trigger_config" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank"."bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
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
	"client_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"bill_number" text NOT NULL,
	"date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0',
	"total_amount" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'draft',
	"user_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "checklist_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"items" jsonb NOT NULL,
	"is_client_facing" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm"."client_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"template_id" integer,
	"items" jsonb NOT NULL,
	"status" text DEFAULT 'in_progress',
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm"."client_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"file_data" text,
	"file_type" text,
	"file_size" integer DEFAULT 0,
	"version" integer DEFAULT 1,
	"expiration_date" timestamp,
	"uploaded_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm"."client_onboarding_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"form_type" text NOT NULL,
	"form_data" jsonb NOT NULL,
	"status" text DEFAULT 'draft',
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm"."client_onboarding_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"step_name" text NOT NULL,
	"step_type" text NOT NULL,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm"."client_service_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"package_name" text NOT NULL,
	"services" jsonb NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm"."client_team_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" integer
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"tenant_code" text,
	"address" text,
	"phone" text,
	"email" text,
	"tax_id" text,
	"fiscal_year_start" integer DEFAULT 1,
	"currency" text DEFAULT 'GEL',
	"is_active" boolean DEFAULT true,
	"manager" text,
	"accounting_software" text,
	"id_code" text,
	"verification_status" text DEFAULT 'not_registered',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "clients_code_unique" UNIQUE("code"),
	CONSTRAINT "clients_tenant_code_unique" UNIQUE("tenant_code")
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
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
	"user_id" integer NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_read_at" timestamp,
	"is_muted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text,
	"type" text DEFAULT 'direct' NOT NULL,
	"client_id" integer,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp,
	"is_archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounting"."customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email"."email_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"client_id" integer,
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
--> statement-breakpoint
CREATE TABLE "email"."email_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_account_id" integer NOT NULL,
	"client_id" integer,
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
	"is_archived" boolean DEFAULT false,
	"labels" jsonb,
	"received_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email"."email_routing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"rule_type" text NOT NULL,
	"condition" jsonb NOT NULL,
	"action" text NOT NULL,
	"action_config" jsonb,
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email"."email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body_html" text,
	"body_text" text,
	"variables" jsonb,
	"category" text,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks"."events" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer,
	"title" text NOT NULL,
	"description" text,
	"start" timestamp NOT NULL,
	"end" timestamp NOT NULL,
	"timezone" text DEFAULT 'UTC',
	"owner_id" integer,
	"related_task_id" integer,
	"related_job_id" integer,
	"matrix_room_id" text,
	"location" text,
	"is_all_day" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
--> statement-breakpoint
CREATE TABLE "accounting"."invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"date" timestamp NOT NULL,
	"due_date" timestamp NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0',
	"total_amount" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'draft',
	"user_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks"."jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer,
	"pipeline_id" integer,
	"client_id" integer,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active',
	"current_stage" text,
	"metadata" jsonb,
	"matrix_room_id" text,
	"created_by" integer,
	"assigned_to" integer,
	"due_date" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "accounting"."journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"entry_number" text NOT NULL,
	"date" timestamp NOT NULL,
	"description" text NOT NULL,
	"reference" text,
	"total_amount" numeric(15, 2) NOT NULL,
	"user_id" integer,
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
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "journal_entries_client_id_entry_number_key" UNIQUE("client_id", "entry_number")
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
	"sender_id" integer NOT NULL,
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
CREATE TABLE "bank"."normalized_bank_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
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
	"normalized_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks"."pipelines" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer,
	"name" text NOT NULL,
	"description" text,
	"stages" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bank"."raw_bank_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
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
	"imported_by" integer,
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
	"client_id" integer,
	"company_tin" text,
	"created_by_user_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
-- RS Schema Tables (from 005_rs_module.sql)
CREATE TABLE IF NOT EXISTS "rs"."seller_invoices" (
	"ID" serial PRIMARY KEY,
	"INVOICE_ID" varchar(50) NOT NULL UNIQUE,
	"F_TYPE" varchar(50),
	"F_DATE" varchar(50),
	"F_SERIES" varchar(50),
	"F_NUMBER" varchar(50),
	"BUYER_TIN" varchar(20),
	"BUYER_NAME" varchar(255),
	"SELLER_TIN" varchar(20),
	"SELLER_NAME" varchar(255),
	"AMOUNT" numeric(18,2),
	"AQCIZI_AMOUNT" numeric(18,2),
	"DRG_AMOUNT" numeric(18,2),
	"FULL_AMOUNT" numeric(18,2),
	"STATUS" varchar(50),
	"SUP_TYPE" varchar(50),
	"CREATE_TIME" varchar(50),
	"WAYBILL_NUMBER" varchar(50),
	"COMPANY_ID" varchar(50),
	"COMPANY_TIN" varchar(20),
	"COMPANY_NAME" varchar(255),
	"UPDATED_AT" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rs"."buyer_invoices" (
	"ID" serial PRIMARY KEY,
	"INVOICE_ID" varchar(50) NOT NULL UNIQUE,
	"F_TYPE" varchar(50),
	"F_DATE" varchar(50),
	"F_SERIES" varchar(50),
	"F_NUMBER" varchar(50),
	"BUYER_TIN" varchar(20),
	"BUYER_NAME" varchar(255),
	"SELLER_TIN" varchar(20),
	"SELLER_NAME" varchar(255),
	"AMOUNT" numeric(18,2),
	"AQCIZI_AMOUNT" numeric(18,2),
	"DRG_AMOUNT" numeric(18,2),
	"FULL_AMOUNT" numeric(18,2),
	"STATUS" varchar(50),
	"SUP_TYPE" varchar(50),
	"CREATE_TIME" varchar(50),
	"WAYBILL_NUMBER" varchar(50),
	"COMPANY_ID" varchar(50),
	"COMPANY_TIN" varchar(20),
	"COMPANY_NAME" varchar(255),
	"UPDATED_AT" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rs"."spec_seller_invoices" (
	"ID" serial PRIMARY KEY,
	"INVOICE_ID" varchar(50) NOT NULL UNIQUE,
	"F_TYPE" varchar(50),
	"F_DATE" varchar(50),
	"F_SERIES" varchar(50),
	"F_NUMBER" varchar(50),
	"BUYER_TIN" varchar(20),
	"BUYER_NAME" varchar(255),
	"SELLER_TIN" varchar(20),
	"SELLER_NAME" varchar(255),
	"FULL_AMOUNT" numeric(18,2),
	"STATUS" varchar(50),
	"COMPANY_ID" varchar(50),
	"COMPANY_TIN" varchar(20),
	"COMPANY_NAME" varchar(255),
	"UPDATED_AT" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rs"."spec_buyer_invoices" (
	"ID" serial PRIMARY KEY,
	"INVOICE_ID" varchar(50) NOT NULL UNIQUE,
	"F_TYPE" varchar(50),
	"F_DATE" varchar(50),
	"F_SERIES" varchar(50),
	"F_NUMBER" varchar(50),
	"BUYER_TIN" varchar(20),
	"BUYER_NAME" varchar(255),
	"SELLER_TIN" varchar(20),
	"SELLER_NAME" varchar(255),
	"FULL_AMOUNT" numeric(18,2),
	"STATUS" varchar(50),
	"COMPANY_ID" varchar(50),
	"COMPANY_TIN" varchar(20),
	"COMPANY_NAME" varchar(255),
	"UPDATED_AT" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rs"."sellers_waybills" (
	"ID" serial PRIMARY KEY,
	"EXTERNAL_ID" varchar(50) NOT NULL UNIQUE,
	"TYPE" varchar(50),
	"CREATE_DATE" varchar(50),
	"SELLER_TIN" varchar(20),
	"SELLER_NAME" varchar(255),
	"BUYER_TIN" varchar(20),
	"BUYER_NAME" varchar(255),
	"START_ADDRESS" varchar(255),
	"END_ADDRESS" varchar(255),
	"DRIVER_TIN" varchar(20),
	"DRIVER_NAME" varchar(255),
	"TRANSPORT_COAST" numeric(18,2),
	"DELIVERY_DATE" varchar(50),
	"STATUS" varchar(50),
	"ACTIVATE_DATE" varchar(50),
	"FULL_AMOUNT" numeric(18,2),
	"CAR_NUMBER" varchar(50),
	"WAYBILL_NUMBER" varchar(50),
	"CLOSE_DATE" varchar(50),
	"BEGIN_DATE" varchar(50),
	"COMMENT" text,
	"IS_CONFIRMED" varchar(50),
	"IS_CORRECTED" varchar(50),
	"IS_VAT_PAYER" varchar(50),
	"PREVIOUS_IS_CORRECTED" varchar(50),
	"COMPANY_ID" varchar(50),
	"COMPANY_TIN" varchar(20),
	"COMPANY_NAME" varchar(255),
	"UPDATED_AT" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rs"."buyers_waybills" (
	"ID" serial PRIMARY KEY,
	"EXTERNAL_ID" varchar(50) NOT NULL UNIQUE,
	"TYPE" varchar(50),
	"CREATE_DATE" varchar(50),
	"SELLER_TIN" varchar(20),
	"SELLER_NAME" varchar(255),
	"BUYER_TIN" varchar(20),
	"BUYER_NAME" varchar(255),
	"START_ADDRESS" varchar(255),
	"END_ADDRESS" varchar(255),
	"DRIVER_TIN" varchar(20),
	"DRIVER_NAME" varchar(255),
	"TRANSPORT_COAST" numeric(18,2),
	"DELIVERY_DATE" varchar(50),
	"STATUS" varchar(50),
	"ACTIVATE_DATE" varchar(50),
	"FULL_AMOUNT" numeric(18,2),
	"CAR_NUMBER" varchar(50),
	"WAYBILL_NUMBER" varchar(50),
	"CLOSE_DATE" varchar(50),
	"BEGIN_DATE" varchar(50),
	"COMMENT" text,
	"IS_CONFIRMED" varchar(50),
	"IS_CORRECTED" varchar(50),
	"IS_VAT_PAYER" varchar(50),
	"PREVIOUS_IS_CORRECTED" varchar(50),
	"COMPANY_ID" varchar(50),
	"COMPANY_TIN" varchar(20),
	"COMPANY_NAME" varchar(255),
	"UPDATED_AT" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rs"."sellers_waybill_goods" (
	"ID" serial PRIMARY KEY,
	"WAYBILL_ID" varchar(100) NOT NULL,
	"W_NAME" varchar(500),
	"UNIT_ID" varchar(100),
	"UNIT_TXT" varchar(100),
	"QUANTITY" numeric(18,4),
	"PRICE" numeric(18,2),
	"AMOUNT" numeric(18,2),
	"BAR_CODE" varchar(100),
	"A_ID" varchar(100),
	"VAT_TYPE" varchar(100),
	"COMPANY_ID" varchar(50),
	"COMPANY_TIN" varchar(20),
	"COMPANY_NAME" varchar(255),
	"UPDATED_AT" timestamp,
	UNIQUE ("WAYBILL_ID", "A_ID", "BAR_CODE")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rs"."buyers_waybill_goods" (
	"ID" serial PRIMARY KEY,
	"WAYBILL_ID" varchar(100) NOT NULL,
	"W_NAME" varchar(500),
	"UNIT_ID" varchar(100),
	"UNIT_TXT" varchar(100),
	"QUANTITY" numeric(18,4),
	"PRICE" numeric(18,2),
	"AMOUNT" numeric(18,2),
	"BAR_CODE" varchar(100),
	"A_ID" varchar(100),
	"VAT_TYPE" varchar(100),
	"COMPANY_ID" varchar(50),
	"COMPANY_TIN" varchar(20),
	"COMPANY_NAME" varchar(255),
	"UPDATED_AT" timestamp,
	UNIQUE ("WAYBILL_ID", "A_ID", "BAR_CODE")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rs"."sellers_invoice_goods" (
	"ID" serial PRIMARY KEY,
	"INVOICE_ID" varchar(50) NOT NULL,
	"AKCIS_ID" varchar(50),
	"AQCIZI_AMOUNT" numeric(18,4),
	"DRG_AMOUNT" numeric(18,4),
	"FULL_AMOUNT" numeric(18,4),
	"GOODS" text,
	"G_NUMBER" numeric(18,4),
	"G_UNIT" varchar(50),
	"ID_GOODS" varchar(50),
	"INV_ID" varchar(50),
	"SDRG_AMOUNT" numeric(18,4),
	"VAT_TYPE" varchar(50),
	"WAYBILL_ID" varchar(50),
	"F_SERIES" varchar(50),
	"F_NUMBER" varchar(50),
	"COMPANY_ID" varchar(50),
	"COMPANY_NAME" varchar(255),
	"COMPANY_TIN" varchar(20),
	"UPDATED_AT" timestamp,
	UNIQUE ("INVOICE_ID", "ID_GOODS")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rs"."buyers_invoice_goods" (
	"ID" serial PRIMARY KEY,
	"INVOICE_ID" varchar(50) NOT NULL,
	"AKCIS_ID" varchar(50),
	"AQCIZI_AMOUNT" numeric(18,4),
	"DRG_AMOUNT" numeric(18,4),
	"FULL_AMOUNT" numeric(18,4),
	"GOODS" text,
	"G_NUMBER" numeric(18,4),
	"G_UNIT" varchar(50),
	"ID_GOODS" varchar(50),
	"INV_ID" varchar(50),
	"SDRG_AMOUNT" numeric(18,4),
	"VAT_TYPE" varchar(50),
	"WAYBILL_ID" varchar(50),
	"F_SERIES" varchar(50),
	"F_NUMBER" varchar(50),
	"COMPANY_ID" varchar(50),
	"COMPANY_NAME" varchar(255),
	"COMPANY_TIN" varchar(20),
	"UPDATED_AT" timestamp,
	UNIQUE ("INVOICE_ID", "ID_GOODS")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rs"."spec_invoice_goods" (
	"ID" serial PRIMARY KEY,
	"INVOICE_ID" varchar(50) NOT NULL,
	"GOODS_NAME" text,
	"QUANTITY" numeric(18,4),
	"UNIT" varchar(50),
	"PRICE" numeric(18,2),
	"AMOUNT" numeric(18,2),
	"VAT_AMOUNT" numeric(18,2),
	"EXCISE_AMOUNT" numeric(18,2),
	"COMPANY_ID" varchar(50),
	"COMPANY_TIN" varchar(20),
	"UPDATED_AT" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rs"."waybill_invoices" (
	"ID" serial PRIMARY KEY,
	"WAYBILL_EXTERNAL_ID" varchar(50) NOT NULL,
	"INVOICE_ID" varchar(50) NOT NULL,
	"COMPANY_ID" varchar(50),
	"COMPANY_TIN" varchar(20),
	"COMPANY_NAME" varchar(255),
	"WAYBILL_TYPE" varchar(50),
	"INVOICE_TYPE" varchar(50),
	"CREATED_AT" timestamp,
	UNIQUE ("WAYBILL_EXTERNAL_ID", "INVOICE_ID")
);
--> statement-breakpoint
-- Audit Schema Tables (from 003_audit_module.sql)
CREATE TABLE IF NOT EXISTS "audit"."1690_stock" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	account_number varchar(50) NOT NULL,
	analytic varchar(255) NOT NULL,
	balance numeric(18,2) NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."accounts_summary" (
	tenant_code varchar(50) NOT NULL,
	doc_date date NOT NULL,
	account_dr varchar(50) NOT NULL,
	account_cr varchar(50) NOT NULL,
	amount numeric(18,2) NOT NULL,
	document_comments text NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, doc_date, account_dr, account_cr)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."accrued_interest" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	analytic varchar(100) NOT NULL,
	account_number varchar(50) NOT NULL,
	balance numeric(18,2) NOT NULL,
	has_181_turnover varchar(3),
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, analytic, account_number)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."analytics" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	analytic varchar(255),
	tenant_name varchar(255),
	"ხარჯი" numeric(18,2),
	"შემოსავალი" numeric(18,2),
	"უნიკალური_გატარებები" integer,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."analytics_balance_summary" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	analytic varchar(100) NOT NULL,
	balance_141 numeric(18,2),
	balance_311 numeric(18,2),
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, analytic)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."capital_accounts" (
	tenant_code varchar(50) NOT NULL,
	doc_date date NOT NULL,
	account_dr varchar(50) NOT NULL,
	account_cr varchar(50) NOT NULL,
	content text NOT NULL,
	amount numeric(18,2) NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, doc_date, account_dr, account_cr)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."capital_accounts_summary" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	account_number varchar(50) NOT NULL,
	analytic varchar(100) NOT NULL,
	balance numeric(18,2) NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."creditors_avans" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	analytic varchar(100) NOT NULL,
	balance_311 numeric(18,2),
	balance_148 numeric(18,2),
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, analytic)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."debitors_avans" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	analytic varchar(100) NOT NULL,
	balance_141 numeric(18,2),
	balance_312 numeric(18,2),
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, analytic)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."dublicate_creditors" (
	tenant_code varchar(50) NOT NULL,
	account varchar(50) NOT NULL,
	analytic varchar(255) NOT NULL,
	unique_id_count integer NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, account, analytic)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."dublicate_debitors" (
	tenant_code varchar(50) NOT NULL,
	account varchar(50) NOT NULL,
	analytic varchar(255) NOT NULL,
	unique_id_count integer NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, account, analytic)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."high_amount_per_quantity_summary" (
	tenant_code varchar(50) NOT NULL,
	doc_date date NOT NULL,
	account_cr varchar(50) NOT NULL,
	account_dr varchar(50) NOT NULL,
	analytic_cr text NOT NULL,
	amount numeric(18,2) NOT NULL,
	quantity_cr integer NOT NULL,
	amount_per_quantity numeric(18,2),
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, doc_date, account_cr, account_dr, analytic_cr)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."negativ_creditor" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	account_number varchar(50) NOT NULL,
	analytic varchar(255) NOT NULL,
	balance numeric(18,2) NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."negativ_debitor" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	account_number varchar(50) NOT NULL,
	analytic varchar(255) NOT NULL,
	balance numeric(18,2) NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."negative_balance_141_summary" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	account_number varchar(50) NOT NULL,
	analytic varchar(255) NOT NULL,
	balance numeric(18,2) NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."negative_balance_311_summary" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	account_number varchar(50) NOT NULL,
	analytic varchar(255) NOT NULL,
	balance numeric(18,2) NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."negative_balance_summary" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	account_number varchar(50) NOT NULL,
	analytic varchar(100) NOT NULL,
	balance numeric(18,2) NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."negative_loans" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	analytic varchar(100) NOT NULL,
	account_number varchar(50) NOT NULL,
	balance numeric(18,2) NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, analytic, account_number)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."negative_stock" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	account_number varchar(50) NOT NULL,
	analytic varchar(255) NOT NULL,
	balance numeric(18,2) NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."negativ_interest" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	account_number varchar(50) NOT NULL,
	analytic varchar(255) NOT NULL,
	balance numeric(18,2) NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."negativ_salary" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	account_number varchar(50) NOT NULL,
	analytic varchar(255) NOT NULL,
	balance numeric(18,2) NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."positive_balance_summary" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	analytic varchar(100) NOT NULL,
	account_number varchar(50) NOT NULL,
	balance numeric(18,2) NOT NULL,
	has_342_turnover varchar(3),
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, analytic, account_number)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."revaluation_status_summary" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	revaluation_status varchar(50) NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."salary_expense" (
	tenant_code varchar(50) NOT NULL,
	doc_date date NOT NULL,
	account_dr varchar(50) NOT NULL,
	account_cr varchar(50) NOT NULL,
	amount numeric(18,2) NOT NULL,
	document_comments text NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, doc_date, account_dr, account_cr)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit"."writeoff_stock" (
	tenant_code varchar(50) NOT NULL,
	posting_month char(7) NOT NULL,
	account_number varchar(50) NOT NULL,
	analytic varchar(255) NOT NULL,
	balance numeric(18,2) NOT NULL,
	company_name varchar(255),
	identification_code varchar(50),
	company_id varchar(50),
	manager varchar(50),
	accountant varchar(50),
	company_code integer REFERENCES public.clients(id) ON DELETE CASCADE,
	PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);
--> statement-breakpoint
CREATE TABLE "tasks"."subtasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"title" text NOT NULL,
	"done" boolean DEFAULT false,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks"."task_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" integer
);
--> statement-breakpoint
CREATE TABLE "tasks"."tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer,
	"job_id" integer,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo',
	"priority" text DEFAULT 'medium',
	"assignee_id" integer,
	"reporter_id" integer,
	"due_date" timestamp,
	"start_date" timestamp,
	"completed_at" timestamp,
	"recurrence" jsonb,
	"recurrence_pattern" jsonb,
	"recurrence_end_date" timestamp,
	"sla_due_date" timestamp,
	"sla_priority" text,
	"depends_on_task_id" integer,
	"matrix_room_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks"."activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer,
	"user_id" integer,
	"action_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" integer NOT NULL,
	"payload" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_client_features" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"client_id" integer NOT NULL,
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
	"user_id" integer NOT NULL,
	"client_id" integer NOT NULL,
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
	"user_id" integer,
	"client_id" integer NOT NULL,
	"role" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"global_role" text DEFAULT 'user',
	"is_active" boolean DEFAULT true,
	"matrix_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "accounting"."vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks"."workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"client_id" integer,
	"plan" text DEFAULT 'standard',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "workspaces_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "accounting"."accounts" ADD CONSTRAINT "accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."automations" ADD CONSTRAINT "automations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "tasks"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."automations" ADD CONSTRAINT "automations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank"."bank_accounts" ADD CONSTRAINT "bank_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."bills" ADD CONSTRAINT "bills_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."bills" ADD CONSTRAINT "bills_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "accounting"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."bills" ADD CONSTRAINT "bills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm"."client_checklists" ADD CONSTRAINT "client_checklists_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm"."client_checklists" ADD CONSTRAINT "client_checklists_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm"."client_documents" ADD CONSTRAINT "client_documents_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm"."client_documents" ADD CONSTRAINT "client_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm"."client_onboarding_forms" ADD CONSTRAINT "client_onboarding_forms_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm"."client_onboarding_steps" ADD CONSTRAINT "client_onboarding_steps_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm"."client_service_packages" ADD CONSTRAINT "client_service_packages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm"."client_team_assignments" ADD CONSTRAINT "client_team_assignments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm"."client_team_assignments" ADD CONSTRAINT "client_team_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm"."client_team_assignments" ADD CONSTRAINT "client_team_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."customers" ADD CONSTRAINT "customers_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email"."email_accounts" ADD CONSTRAINT "email_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email"."email_accounts" ADD CONSTRAINT "email_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email"."email_messages" ADD CONSTRAINT "email_messages_email_account_id_email_accounts_id_fk" FOREIGN KEY ("email_account_id") REFERENCES "email"."email_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email"."email_messages" ADD CONSTRAINT "email_messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email"."email_routing_rules" ADD CONSTRAINT "email_routing_rules_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email"."email_templates" ADD CONSTRAINT "email_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."events" ADD CONSTRAINT "events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "tasks"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."events" ADD CONSTRAINT "events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."events" ADD CONSTRAINT "events_related_task_id_tasks_id_fk" FOREIGN KEY ("related_task_id") REFERENCES "tasks"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."events" ADD CONSTRAINT "events_related_job_id_jobs_id_fk" FOREIGN KEY ("related_job_id") REFERENCES "tasks"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "accounting"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."jobs" ADD CONSTRAINT "jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "tasks"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."jobs" ADD CONSTRAINT "jobs_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "tasks"."pipelines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."jobs" ADD CONSTRAINT "jobs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."jobs" ADD CONSTRAINT "jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."jobs" ADD CONSTRAINT "jobs_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "accounting"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounting"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank"."normalized_bank_transactions" ADD CONSTRAINT "normalized_bank_transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank"."normalized_bank_transactions" ADD CONSTRAINT "normalized_bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "bank"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank"."normalized_bank_transactions" ADD CONSTRAINT "normalized_bank_transactions_raw_transaction_id_raw_bank_transactions_id_fk" FOREIGN KEY ("raw_transaction_id") REFERENCES "bank"."raw_bank_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank"."normalized_bank_transactions" ADD CONSTRAINT "normalized_bank_transactions_normalized_by_users_id_fk" FOREIGN KEY ("normalized_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."pipelines" ADD CONSTRAINT "pipelines_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "tasks"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."pipelines" ADD CONSTRAINT "pipelines_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank"."raw_bank_transactions" ADD CONSTRAINT "raw_bank_transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank"."raw_bank_transactions" ADD CONSTRAINT "raw_bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "bank"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank"."raw_bank_transactions" ADD CONSTRAINT "raw_bank_transactions_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rs"."users" ADD CONSTRAINT "users_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rs"."users" ADD CONSTRAINT "users_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."subtasks" ADD CONSTRAINT "subtasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."task_assignments" ADD CONSTRAINT "task_assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."task_assignments" ADD CONSTRAINT "task_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."task_assignments" ADD CONSTRAINT "task_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."tasks" ADD CONSTRAINT "tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "tasks"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."tasks" ADD CONSTRAINT "tasks_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "tasks"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."tasks" ADD CONSTRAINT "tasks_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."tasks" ADD CONSTRAINT "tasks_depends_on_task_id_tasks_id_fk" FOREIGN KEY ("depends_on_task_id") REFERENCES "tasks"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."activity_log" ADD CONSTRAINT "activity_log_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "tasks"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_client_features" ADD CONSTRAINT "user_client_features_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_client_features" ADD CONSTRAINT "user_client_features_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_client_modules" ADD CONSTRAINT "user_client_modules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_client_modules" ADD CONSTRAINT "user_client_modules_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."vendors" ADD CONSTRAINT "vendors_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks"."workspaces" ADD CONSTRAINT "workspaces_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;

-- =====================================================
-- Indexes (from migrations 001-012)
-- =====================================================

-- Core Module Indexes (001)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_matrix_id ON users(matrix_id);
CREATE INDEX IF NOT EXISTS idx_clients_code ON clients(code);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_code ON clients(tenant_code);
CREATE INDEX IF NOT EXISTS idx_clients_verification_status ON clients(verification_status);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_client_id ON user_companies(client_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_user_client ON user_companies(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_user_client_modules_user_client ON user_client_modules(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_user_client_modules_module ON user_client_modules(module);
CREATE INDEX IF NOT EXISTS idx_user_client_features_user_client ON user_client_features(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_user_client_features_feature ON user_client_features(feature);
CREATE INDEX IF NOT EXISTS idx_company_settings_client_id ON company_settings(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_client_id ON activity_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource, resource_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_main_company_single_row ON main_company_settings (id) WHERE id = 1;

-- Accounting Module Indexes (002)
CREATE INDEX IF NOT EXISTS idx_accounts_client_id ON accounting.accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_accounts_parent_id ON accounting.accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounting.accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounting.accounts(code);
CREATE INDEX IF NOT EXISTS idx_journal_entries_client_id ON accounting.journal_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON accounting.journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON accounting.journal_entries(client_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_code ON accounting.journal_entries(tenant_code);
CREATE INDEX IF NOT EXISTS idx_journal_entries_account_dr ON accounting.journal_entries(account_dr);
CREATE INDEX IF NOT EXISTS idx_journal_entries_account_cr ON accounting.journal_entries(account_cr);
CREATE INDEX IF NOT EXISTS idx_journal_entries_doc_date ON accounting.journal_entries(doc_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_posting_number ON accounting.journal_entries(posting_number);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON accounting.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry_id ON accounting.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON accounting.journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_customers_client_id ON accounting.customers(client_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON accounting.customers(name);
CREATE INDEX IF NOT EXISTS idx_vendors_client_id ON accounting.vendors(client_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON accounting.vendors(name);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON accounting.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON accounting.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON accounting.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON accounting.invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON accounting.invoices(status);
CREATE INDEX IF NOT EXISTS idx_bills_client_id ON accounting.bills(client_id);
CREATE INDEX IF NOT EXISTS idx_bills_vendor_id ON accounting.bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bills_user_id ON accounting.bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bills_date ON accounting.bills(date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON accounting.bills(status);

-- Audit Module Indexes (003)
-- Note: idx_analytics_tenant_month removed - PRIMARY KEY (tenant_code, posting_month) already provides uniqueness

-- Bank Module Indexes (004)
CREATE INDEX IF NOT EXISTS idx_bank_accounts_client_id ON bank.bank_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_default ON bank.bank_accounts(is_default);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_active ON bank.bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_raw_bank_transactions_client_id ON bank.raw_bank_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_raw_bank_transactions_bank_account_id ON bank.raw_bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_raw_bank_transactions_document_date ON bank.raw_bank_transactions(document_date);
CREATE INDEX IF NOT EXISTS idx_raw_bank_transactions_movement_id ON bank.raw_bank_transactions(movement_id);
CREATE INDEX IF NOT EXISTS idx_normalized_bank_transactions_client_id ON bank.normalized_bank_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_normalized_bank_transactions_bank_account_id ON bank.normalized_bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_normalized_bank_transactions_raw_transaction_id ON bank.normalized_bank_transactions(raw_transaction_id);
CREATE INDEX IF NOT EXISTS idx_bank_account_sequence_idx ON bank.normalized_bank_transactions(bank_account_id, sequence_number);

-- RS Module Indexes (005)
CREATE INDEX IF NOT EXISTS idx_rs_users_company_name ON rs.users(company_name);
CREATE INDEX IF NOT EXISTS idx_rs_users_client_id ON rs.users(client_id);
CREATE INDEX IF NOT EXISTS idx_rs_users_company_tin ON rs.users(company_tin);
CREATE INDEX IF NOT EXISTS idx_seller_invoices_invoice_id ON rs.seller_invoices("INVOICE_ID");
CREATE INDEX IF NOT EXISTS idx_seller_invoices_company_tin ON rs.seller_invoices("COMPANY_TIN");
CREATE INDEX IF NOT EXISTS idx_seller_invoices_updated_at ON rs.seller_invoices("UPDATED_AT");
CREATE INDEX IF NOT EXISTS idx_buyer_invoices_invoice_id ON rs.buyer_invoices("INVOICE_ID");
CREATE INDEX IF NOT EXISTS idx_buyer_invoices_company_tin ON rs.buyer_invoices("COMPANY_TIN");
CREATE INDEX IF NOT EXISTS idx_buyer_invoices_updated_at ON rs.buyer_invoices("UPDATED_AT");
CREATE INDEX IF NOT EXISTS idx_spec_seller_invoices_invoice_id ON rs.spec_seller_invoices("INVOICE_ID");
CREATE INDEX IF NOT EXISTS idx_spec_seller_invoices_company_tin ON rs.spec_seller_invoices("COMPANY_TIN");
CREATE INDEX IF NOT EXISTS idx_spec_buyer_invoices_invoice_id ON rs.spec_buyer_invoices("INVOICE_ID");
CREATE INDEX IF NOT EXISTS idx_spec_buyer_invoices_company_tin ON rs.spec_buyer_invoices("COMPANY_TIN");
CREATE INDEX IF NOT EXISTS idx_sellers_waybills_external_id ON rs.sellers_waybills("EXTERNAL_ID");
CREATE INDEX IF NOT EXISTS idx_sellers_waybills_company_tin ON rs.sellers_waybills("COMPANY_TIN");
CREATE INDEX IF NOT EXISTS idx_sellers_waybills_updated_at ON rs.sellers_waybills("UPDATED_AT");
CREATE INDEX IF NOT EXISTS idx_buyers_waybills_external_id ON rs.buyers_waybills("EXTERNAL_ID");
CREATE INDEX IF NOT EXISTS idx_buyers_waybills_company_tin ON rs.buyers_waybills("COMPANY_TIN");
CREATE INDEX IF NOT EXISTS idx_buyers_waybills_updated_at ON rs.buyers_waybills("UPDATED_AT");
CREATE INDEX IF NOT EXISTS idx_sellers_waybill_goods_waybill_id ON rs.sellers_waybill_goods("WAYBILL_ID");
CREATE INDEX IF NOT EXISTS idx_sellers_waybill_goods_company_tin ON rs.sellers_waybill_goods("COMPANY_TIN");
CREATE INDEX IF NOT EXISTS idx_buyers_waybill_goods_waybill_id ON rs.buyers_waybill_goods("WAYBILL_ID");
CREATE INDEX IF NOT EXISTS idx_buyers_waybill_goods_company_tin ON rs.buyers_waybill_goods("COMPANY_TIN");
CREATE INDEX IF NOT EXISTS idx_sellers_invoice_goods_invoice_id ON rs.sellers_invoice_goods("INVOICE_ID");
CREATE INDEX IF NOT EXISTS idx_sellers_invoice_goods_company_tin ON rs.sellers_invoice_goods("COMPANY_TIN");
CREATE INDEX IF NOT EXISTS idx_buyers_invoice_goods_invoice_id ON rs.buyers_invoice_goods("INVOICE_ID");
CREATE INDEX IF NOT EXISTS idx_buyers_invoice_goods_company_tin ON rs.buyers_invoice_goods("COMPANY_TIN");
CREATE INDEX IF NOT EXISTS idx_spec_invoice_goods_invoice_id ON rs.spec_invoice_goods("INVOICE_ID");
CREATE INDEX IF NOT EXISTS idx_spec_invoice_goods_company_tin ON rs.spec_invoice_goods("COMPANY_TIN");
CREATE INDEX IF NOT EXISTS idx_waybill_invoices_waybill_id ON rs.waybill_invoices("WAYBILL_EXTERNAL_ID");
CREATE INDEX IF NOT EXISTS idx_waybill_invoices_invoice_id ON rs.waybill_invoices("INVOICE_ID");
CREATE INDEX IF NOT EXISTS idx_waybill_invoices_company_tin ON rs.waybill_invoices("COMPANY_TIN");

-- Tasks Module Indexes (006)
CREATE INDEX IF NOT EXISTS idx_workspaces_client_id ON tasks.workspaces(client_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_code ON tasks.workspaces(code);
CREATE INDEX IF NOT EXISTS idx_pipelines_workspace_id ON tasks.pipelines(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_created_by ON tasks.pipelines(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_workspace_id ON tasks.jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_jobs_pipeline_id ON tasks.jobs(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON tasks.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON tasks.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON tasks.jobs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON tasks.jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_matrix_room_id ON tasks.jobs(matrix_room_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_job_id ON tasks.tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reporter_id ON tasks.tasks(reporter_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_matrix_room_id ON tasks.tasks(matrix_room_id);
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_end_date ON tasks.tasks(recurrence_end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_sla_due_date ON tasks.tasks(sla_due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_depends_on_task_id ON tasks.tasks(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON tasks.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON tasks.task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_role ON tasks.task_assignments(role);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON tasks.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_done ON tasks.subtasks(done);
CREATE INDEX IF NOT EXISTS idx_events_workspace_id ON tasks.events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_events_owner_id ON tasks.events(owner_id);
CREATE INDEX IF NOT EXISTS idx_events_start ON tasks.events(start);
CREATE INDEX IF NOT EXISTS idx_events_end ON tasks.events("end");
CREATE INDEX IF NOT EXISTS idx_events_related_task_id ON tasks.events(related_task_id);
CREATE INDEX IF NOT EXISTS idx_events_related_job_id ON tasks.events(related_job_id);
CREATE INDEX IF NOT EXISTS idx_events_matrix_room_id ON tasks.events(matrix_room_id);
CREATE INDEX IF NOT EXISTS idx_automations_workspace_id ON tasks.automations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_automations_trigger_type ON tasks.automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automations_is_active ON tasks.automations(is_active);
CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id ON tasks.activity_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON tasks.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON tasks.activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_target_type ON tasks.activity_log(target_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_target_id ON tasks.activity_log(target_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON tasks.activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_category ON checklist_templates(category);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_is_active ON checklist_templates(is_active);

-- CRM Module Indexes (007)
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON crm.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_category ON crm.client_documents(category);
CREATE INDEX IF NOT EXISTS idx_client_documents_expiration_date ON crm.client_documents(expiration_date);
CREATE INDEX IF NOT EXISTS idx_client_documents_uploaded_by ON crm.client_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_client_service_packages_client_id ON crm.client_service_packages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_service_packages_is_active ON crm.client_service_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_client_team_assignments_client_id ON crm.client_team_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_team_assignments_user_id ON crm.client_team_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_client_team_assignments_role ON crm.client_team_assignments(role);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_forms_client_id ON crm.client_onboarding_forms(client_id);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_forms_form_type ON crm.client_onboarding_forms(form_type);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_forms_status ON crm.client_onboarding_forms(status);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_steps_client_id ON crm.client_onboarding_steps(client_id);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_steps_step_type ON crm.client_onboarding_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_client_onboarding_steps_is_completed ON crm.client_onboarding_steps(is_completed);
CREATE INDEX IF NOT EXISTS idx_client_checklists_client_id ON crm.client_checklists(client_id);
CREATE INDEX IF NOT EXISTS idx_client_checklists_template_id ON crm.client_checklists(template_id);
CREATE INDEX IF NOT EXISTS idx_client_checklists_status ON crm.client_checklists(status);

-- Email Module Indexes (008)
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email.email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_client_id ON email.email_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_is_active ON email.email_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_email_messages_email_account_id ON email.email_messages(email_account_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_client_id ON email.email_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_message_id ON email.email_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread_id ON email.email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_is_read ON email.email_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_email_messages_received_at ON email.email_messages(received_at);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email.email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email.email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_routing_rules_client_id ON email.email_routing_rules(client_id);
CREATE INDEX IF NOT EXISTS idx_email_routing_rules_is_active ON email.email_routing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_email_routing_rules_priority ON email.email_routing_rules(priority);

-- Migration Tracking Indexes (009)
CREATE INDEX IF NOT EXISTS idx_migration_history_status ON migration_history(status);
CREATE INDEX IF NOT EXISTS idx_migration_history_type ON migration_history(type);
CREATE INDEX IF NOT EXISTS idx_migration_history_start_time ON migration_history(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_migration_history_tenant_code ON migration_history(tenant_code);
CREATE INDEX IF NOT EXISTS idx_migration_logs_migration_id ON migration_logs(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_logs_timestamp ON migration_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_migration_logs_level ON migration_logs(level);
CREATE INDEX IF NOT EXISTS idx_migration_errors_migration_id ON migration_errors(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_errors_timestamp ON migration_errors(timestamp DESC);

-- Messaging Indexes (011)
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- =====================================================
-- Trigger Functions (from migrations 001-012)
-- =====================================================

-- Core Module Functions (001)
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bank Module Functions (004)
CREATE OR REPLACE FUNCTION bank.update_bank_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RS Module Functions (005)
CREATE OR REPLACE FUNCTION rs.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tasks Module Functions (006)
CREATE OR REPLACE FUNCTION tasks.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CRM Module Functions (007)
CREATE OR REPLACE FUNCTION crm.update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Email Module Functions (008)
CREATE OR REPLACE FUNCTION email.update_email_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Migration Tracking Functions (009)
CREATE OR REPLACE FUNCTION update_migration_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Messaging Functions (011)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper Function (010)
CREATE OR REPLACE FUNCTION tenant_code_to_int(tenant_code_val TEXT)
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

-- =====================================================
-- Triggers (from migrations 001-012)
-- =====================================================

-- Core Module Triggers (001)
DROP TRIGGER IF EXISTS trigger_update_company_settings_updated_at ON company_settings;
CREATE TRIGGER trigger_update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_settings_updated_at();

DROP TRIGGER IF EXISTS trigger_update_clients_updated_at ON clients;
CREATE TRIGGER trigger_update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();

-- Bank Module Triggers (004)
DROP TRIGGER IF EXISTS trigger_update_bank_accounts_updated_at ON bank.bank_accounts;
CREATE TRIGGER trigger_update_bank_accounts_updated_at
  BEFORE UPDATE ON bank.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION bank.update_bank_updated_at();

DROP TRIGGER IF EXISTS trigger_update_raw_bank_transactions_updated_at ON bank.raw_bank_transactions;
CREATE TRIGGER trigger_update_raw_bank_transactions_updated_at
  BEFORE UPDATE ON bank.raw_bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION bank.update_bank_updated_at();

DROP TRIGGER IF EXISTS trigger_update_normalized_bank_transactions_updated_at ON bank.normalized_bank_transactions;
CREATE TRIGGER trigger_update_normalized_bank_transactions_updated_at
  BEFORE UPDATE ON bank.normalized_bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION bank.update_bank_updated_at();

-- RS Module Triggers (005)
DROP TRIGGER IF EXISTS rs_users_set_updated_at ON rs.users;
CREATE TRIGGER rs_users_set_updated_at
BEFORE UPDATE ON rs.users
FOR EACH ROW
EXECUTE FUNCTION rs.set_updated_at();

-- Tasks Module Triggers (006)
DROP TRIGGER IF EXISTS workspaces_updated_at ON tasks.workspaces;
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON tasks.workspaces
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

DROP TRIGGER IF EXISTS pipelines_updated_at ON tasks.pipelines;
CREATE TRIGGER pipelines_updated_at BEFORE UPDATE ON tasks.pipelines
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

DROP TRIGGER IF EXISTS jobs_updated_at ON tasks.jobs;
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON tasks.jobs
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks.tasks;
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks.tasks
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

DROP TRIGGER IF EXISTS subtasks_updated_at ON tasks.subtasks;
CREATE TRIGGER subtasks_updated_at BEFORE UPDATE ON tasks.subtasks
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

DROP TRIGGER IF EXISTS events_updated_at ON tasks.events;
CREATE TRIGGER events_updated_at BEFORE UPDATE ON tasks.events
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

DROP TRIGGER IF EXISTS automations_updated_at ON tasks.automations;
CREATE TRIGGER automations_updated_at BEFORE UPDATE ON tasks.automations
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

DROP TRIGGER IF EXISTS checklist_templates_updated_at ON checklist_templates;
CREATE TRIGGER checklist_templates_updated_at BEFORE UPDATE ON checklist_templates
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

-- CRM Module Triggers (007)
DROP TRIGGER IF EXISTS client_documents_updated_at ON crm.client_documents;
CREATE TRIGGER client_documents_updated_at BEFORE UPDATE ON crm.client_documents
    FOR EACH ROW EXECUTE FUNCTION crm.update_crm_updated_at();

DROP TRIGGER IF EXISTS client_service_packages_updated_at ON crm.client_service_packages;
CREATE TRIGGER client_service_packages_updated_at BEFORE UPDATE ON crm.client_service_packages
    FOR EACH ROW EXECUTE FUNCTION crm.update_crm_updated_at();

DROP TRIGGER IF EXISTS client_onboarding_forms_updated_at ON crm.client_onboarding_forms;
CREATE TRIGGER client_onboarding_forms_updated_at BEFORE UPDATE ON crm.client_onboarding_forms
    FOR EACH ROW EXECUTE FUNCTION crm.update_crm_updated_at();

DROP TRIGGER IF EXISTS client_onboarding_steps_updated_at ON crm.client_onboarding_steps;
CREATE TRIGGER client_onboarding_steps_updated_at BEFORE UPDATE ON crm.client_onboarding_steps
    FOR EACH ROW EXECUTE FUNCTION crm.update_crm_updated_at();

DROP TRIGGER IF EXISTS client_checklists_updated_at ON crm.client_checklists;
CREATE TRIGGER client_checklists_updated_at BEFORE UPDATE ON crm.client_checklists
    FOR EACH ROW EXECUTE FUNCTION crm.update_crm_updated_at();

-- Email Module Triggers (008)
DROP TRIGGER IF EXISTS email_accounts_updated_at ON email.email_accounts;
CREATE TRIGGER email_accounts_updated_at BEFORE UPDATE ON email.email_accounts
    FOR EACH ROW EXECUTE FUNCTION email.update_email_updated_at();

DROP TRIGGER IF EXISTS email_messages_updated_at ON email.email_messages;
CREATE TRIGGER email_messages_updated_at BEFORE UPDATE ON email.email_messages
    FOR EACH ROW EXECUTE FUNCTION email.update_email_updated_at();

DROP TRIGGER IF EXISTS email_templates_updated_at ON email.email_templates;
CREATE TRIGGER email_templates_updated_at BEFORE UPDATE ON email.email_templates
    FOR EACH ROW EXECUTE FUNCTION email.update_email_updated_at();

DROP TRIGGER IF EXISTS email_routing_rules_updated_at ON email.email_routing_rules;
CREATE TRIGGER email_routing_rules_updated_at BEFORE UPDATE ON email.email_routing_rules
    FOR EACH ROW EXECUTE FUNCTION email.update_email_updated_at();

-- Migration Tracking Triggers (009)
DROP TRIGGER IF EXISTS trigger_update_migration_history_updated_at ON migration_history;
CREATE TRIGGER trigger_update_migration_history_updated_at
  BEFORE UPDATE ON migration_history
  FOR EACH ROW
  EXECUTE FUNCTION update_migration_history_updated_at();

-- Messaging Triggers (011)
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Comments (from migrations 001-012)
-- =====================================================

-- Core Module Comments (001)
COMMENT ON TABLE users IS 'System users with authentication and authorization';
COMMENT ON COLUMN users.matrix_id IS 'Matrix user ID for messaging integration';
COMMENT ON TABLE clients IS 'Client companies in multi-tenant accounting system';
COMMENT ON COLUMN clients.tenant_code IS 'MSSQL tenant code for data synchronization (TEXT for flexibility, convert to INT in code when needed)';
COMMENT ON TABLE user_companies IS 'User-client relationships with roles';
COMMENT ON TABLE user_client_modules IS 'Module-level permissions per user per client';
COMMENT ON COLUMN user_client_modules.module IS 'Module name: accounting, bank, audit, rs_integration, tasks, crm, email';
COMMENT ON TABLE user_client_features IS 'Feature-level permissions within modules';
COMMENT ON COLUMN user_client_features.feature IS 'Feature name: invoices, bills, journal_entries, accounts, etc.';
COMMENT ON TABLE company_settings IS 'Per-client company settings and preferences';
COMMENT ON TABLE main_company_settings IS 'System-wide main company settings (only one row should exist)';
COMMENT ON TABLE activity_logs IS 'System-wide activity logging';

-- Accounting Module Comments (002)
COMMENT ON TABLE accounting.accounts IS 'Chart of accounts for each client';
COMMENT ON COLUMN accounting.accounts.type IS 'Account type: asset, liability, equity, revenue, expense';
COMMENT ON TABLE accounting.journal_entries IS 'Journal entries with MSSQL parity fields';
COMMENT ON COLUMN accounting.journal_entries.tenant_code IS 'MSSQL tenant code (TEXT for flexibility, convert to INT in code when needed)';
COMMENT ON TABLE accounting.journal_entry_lines IS 'Line items for journal entries';
COMMENT ON TABLE accounting.customers IS 'Customer records for accounts receivable';
COMMENT ON TABLE accounting.vendors IS 'Vendor records for accounts payable';
COMMENT ON TABLE accounting.invoices IS 'Sales invoices to customers';
COMMENT ON TABLE accounting.bills IS 'Purchase bills from vendors';

-- Audit Module Comments (003)
COMMENT ON TABLE audit."1690_stock" IS 'Inventory (account 1690) stock balance analysis';
COMMENT ON TABLE audit.accounts_summary IS 'Account 515 accounts payable analysis';
COMMENT ON TABLE audit.accrued_interest IS 'Accrued interest analysis (account 145*)';
COMMENT ON COLUMN audit.accrued_interest.has_181_turnover IS 'კი (yes) or არა (no) - indicates if account 181 has activity';
COMMENT ON TABLE audit.analytics IS 'General income and expense cumulative analytics by posting month';
COMMENT ON COLUMN audit.analytics."ხარჯი" IS 'Cumulative expenses (account 7*)';
COMMENT ON COLUMN audit.analytics."შემოსავალი" IS 'Cumulative income (account 6*)';
COMMENT ON COLUMN audit.analytics."უნიკალური_გატარებები" IS 'Unique transaction count';
COMMENT ON TABLE audit.analytics_balance_summary IS 'Combined balance analytics for accounts 141* and 311*';
COMMENT ON TABLE audit.capital_accounts IS 'Capital-related transactions analysis';
COMMENT ON TABLE audit.capital_accounts_summary IS 'Summary of capital account balances';
COMMENT ON TABLE audit.creditors_avans IS 'Advance payments to creditors analysis';
COMMENT ON TABLE audit.debitors_avans IS 'Advance payments from debtors analysis';
COMMENT ON TABLE audit.dublicate_creditors IS 'Duplicate creditor entries detection';
COMMENT ON TABLE audit.dublicate_debitors IS 'Duplicate debtor entries detection';
COMMENT ON TABLE audit.high_amount_per_quantity_summary IS 'Transactions with unusually high unit prices';
COMMENT ON TABLE audit.negativ_creditor IS 'Negative creditor balance analysis (preserves original typo)';
COMMENT ON TABLE audit.negativ_debitor IS 'Negative debtor balance analysis (preserves original typo)';
COMMENT ON TABLE audit.negative_balance_141_summary IS 'Negative balance analysis for account 141* (Fixed Assets)';
COMMENT ON TABLE audit.negative_balance_311_summary IS 'Negative balance analysis for account 311* (Trade Receivables)';
COMMENT ON TABLE audit.negative_balance_summary IS 'General negative balance analysis for account 515*';
COMMENT ON TABLE audit.negative_loans IS 'Negative loan balance analysis for accounts 41* and 32*';
COMMENT ON TABLE audit.negative_stock IS 'Negative stock quantities analysis';
COMMENT ON TABLE audit.negativ_interest IS 'Negative interest balance analysis (preserves original typo)';
COMMENT ON TABLE audit.negativ_salary IS 'Negative salary balance analysis (preserves original typo)';
COMMENT ON TABLE audit.positive_balance_summary IS 'Positive balance summary analysis';
COMMENT ON COLUMN audit.positive_balance_summary.has_342_turnover IS 'კი (yes) or არა (no) - indicates if account 342 has activity';
COMMENT ON TABLE audit.revaluation_status_summary IS 'Foreign currency revaluation status check';
COMMENT ON COLUMN audit.revaluation_status_summary.revaluation_status IS 'გადაფასებულია (revalued) or გადაფასება არ არის გაკეთებული (not revalued)';
COMMENT ON TABLE audit.salary_expense IS 'Account 313 salary expense analysis (non-standard salary transactions)';
COMMENT ON TABLE audit.writeoff_stock IS 'Stock write-off transactions analysis';

-- Bank Module Comments (004)
COMMENT ON TABLE bank.bank_accounts IS 'Stores bank account information for companies';
COMMENT ON TABLE bank.raw_bank_transactions IS 'Stores raw bank transactions imported from bank statements';
COMMENT ON TABLE bank.normalized_bank_transactions IS 'Stores validated and normalized bank transactions with sequence and balance validation';

-- RS Module Comments (005)
COMMENT ON TABLE rs.users IS 'RS.ge API credentials per company';
COMMENT ON TABLE rs.seller_invoices IS 'Sales invoices issued by clients';
COMMENT ON TABLE rs.buyer_invoices IS 'Purchase invoices received by clients';
COMMENT ON TABLE rs.spec_seller_invoices IS 'Special seller invoices (NSAF API)';
COMMENT ON TABLE rs.spec_buyer_invoices IS 'Special buyer invoices (NSAF API)';
COMMENT ON TABLE rs.sellers_waybills IS 'Outgoing waybills';
COMMENT ON TABLE rs.buyers_waybills IS 'Incoming waybills';
COMMENT ON TABLE rs.sellers_waybill_goods IS 'Seller waybill line items';
COMMENT ON TABLE rs.buyers_waybill_goods IS 'Buyer waybill line items';
COMMENT ON TABLE rs.sellers_invoice_goods IS 'Seller invoice line items';
COMMENT ON TABLE rs.buyers_invoice_goods IS 'Buyer invoice line items';
COMMENT ON TABLE rs.spec_invoice_goods IS 'Special invoice goods (NSAF)';
COMMENT ON TABLE rs.waybill_invoices IS 'Waybill-invoice associations';
COMMENT ON SCHEMA rs IS 'Georgian Revenue Service (RS.ge) integration data';

-- Tasks Module Comments (006)
COMMENT ON TABLE tasks.workspaces IS 'Multi-tenant organizations for TaxDome-style system';
COMMENT ON TABLE tasks.pipelines IS 'Reusable workflow templates with stages and task templates';
COMMENT ON COLUMN tasks.pipelines.stages IS 'JSONB array of stage definitions with task templates';
COMMENT ON TABLE tasks.jobs IS 'Work items (cases) created from pipelines, e.g., "2024 Tax Return"';
COMMENT ON COLUMN tasks.jobs.metadata IS 'JSONB for flexible additional data storage';
COMMENT ON TABLE tasks.tasks IS 'Actionable items with assignments, due dates, and priority';
COMMENT ON COLUMN tasks.tasks.recurrence_pattern IS 'JSONB recurrence pattern for repeating tasks';
COMMENT ON TABLE tasks.task_assignments IS 'Many-to-many relationship for task assignments with roles';
COMMENT ON COLUMN tasks.task_assignments.role IS 'Role: assignee (works on task), reviewer (reviews work), watcher (receives updates)';
COMMENT ON TABLE tasks.subtasks IS 'Checklist items within tasks';
COMMENT ON TABLE tasks.events IS 'Calendar events (meetings, deadlines)';
COMMENT ON COLUMN tasks.events."end" IS 'End timestamp (end is a reserved word, quoted)';
COMMENT ON TABLE tasks.automations IS 'Automation rules with triggers and actions';
COMMENT ON COLUMN tasks.automations.trigger_config IS 'JSONB trigger-specific configuration';
COMMENT ON COLUMN tasks.automations.actions IS 'JSONB array of action definitions';
COMMENT ON TABLE tasks.activity_log IS 'Comprehensive audit trail for all system activities';
COMMENT ON TABLE checklist_templates IS 'Reusable checklist templates';
COMMENT ON COLUMN checklist_templates.items IS 'JSON array: [{title, description, required, condition: {type, field, value}}]';
COMMENT ON COLUMN checklist_templates.is_client_facing IS 'Whether clients can see this checklist in portal';

-- CRM Module Comments (007)
COMMENT ON TABLE crm.client_documents IS 'Secure document vault for client files';
COMMENT ON COLUMN crm.client_documents.file_data IS 'Binary file data stored as bytea';
COMMENT ON COLUMN crm.client_documents.category IS 'Document category: Tax, Payroll, Accounting, Legal, Other';
COMMENT ON TABLE crm.client_service_packages IS 'Service packages assigned to clients';
COMMENT ON COLUMN crm.client_service_packages.services IS 'JSON array of service names and descriptions';
COMMENT ON TABLE crm.client_team_assignments IS 'Team member assignments per client with roles';
COMMENT ON COLUMN crm.client_team_assignments.role IS 'Role: Client Owner, Accountant, Reviewer, Assistant';
COMMENT ON TABLE crm.client_onboarding_forms IS 'Onboarding forms for clients';
COMMENT ON COLUMN crm.client_onboarding_forms.form_data IS 'JSON object containing form field values';
COMMENT ON TABLE crm.client_onboarding_steps IS 'Onboarding workflow steps for clients';
COMMENT ON COLUMN crm.client_onboarding_steps.metadata IS 'JSON object for step-specific data';
COMMENT ON TABLE crm.client_checklists IS 'Client-specific checklists (can be from template or custom)';
COMMENT ON COLUMN crm.client_checklists.items IS 'JSON array: [{title, description, done: boolean, completedAt: timestamp}]';

-- Email Module Comments (008)
COMMENT ON TABLE email.email_accounts IS 'Email account configurations for Gmail API integration';
COMMENT ON COLUMN email.email_accounts.access_token IS 'Encrypted OAuth access token';
COMMENT ON COLUMN email.email_accounts.refresh_token IS 'Encrypted OAuth refresh token';
COMMENT ON TABLE email.email_messages IS 'Email messages storage from Gmail API';
COMMENT ON COLUMN email.email_messages.attachments IS 'JSON array of attachment metadata: {name, size, contentType, url}';
COMMENT ON TABLE email.email_templates IS 'Email templates for sending automated emails';
COMMENT ON COLUMN email.email_templates.variables IS 'JSON object describing available template variables';
COMMENT ON TABLE email.email_routing_rules IS 'Email routing rules for automatic email processing';
COMMENT ON COLUMN email.email_routing_rules.condition IS 'JSON object with rule condition: {type, value, operator}';
COMMENT ON COLUMN email.email_routing_rules.action_config IS 'JSON object with action-specific configuration';

-- Migration Tracking Comments (009)
COMMENT ON TABLE migration_history IS 'Stores MSSQL migration execution history';
COMMENT ON TABLE migration_logs IS 'Stores detailed logs for each migration';
COMMENT ON TABLE migration_errors IS 'Stores detailed errors encountered during migrations';

-- Messaging Comments (011)
COMMENT ON TABLE conversations IS 'Stores conversation groups for messaging';
COMMENT ON TABLE conversation_participants IS 'Tracks which users are part of which conversations';
COMMENT ON TABLE messages IS 'Stores individual messages within conversations';
COMMENT ON TABLE notifications IS 'System notifications for users';

-- Helper Function Comment (010)
COMMENT ON FUNCTION tenant_code_to_int IS 'Converts TEXT tenant_code to INTEGER for numeric operations. Returns NULL if conversion fails.';

-- =====================================================
-- Constraints (from migrations 001-012)
-- =====================================================

-- Core Module Constraints (001)
DO $$
BEGIN
  -- Add constraint for fiscal year start
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_fiscal_year_start' 
    AND conrelid = 'clients'::regclass
  ) THEN
    ALTER TABLE clients 
    ADD CONSTRAINT chk_fiscal_year_start 
    CHECK (fiscal_year_start >= 1 AND fiscal_year_start <= 12);
  END IF;
END $$;

-- Accounting Module Constraints (002)
DO $$
BEGIN
  -- Add constraint for journal entry lines
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_debit_credit_not_both' 
    AND conrelid = 'accounting.journal_entry_lines'::regclass
  ) THEN
    ALTER TABLE accounting.journal_entry_lines 
    ADD CONSTRAINT chk_debit_credit_not_both 
    CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0));
  END IF;

  -- Add constraint for accounts
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_account_type' 
    AND conrelid = 'accounting.accounts'::regclass
  ) THEN
    ALTER TABLE accounting.accounts 
    ADD CONSTRAINT chk_account_type 
    CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense'));
  END IF;
END $$;

-- Main Company Settings Constraint (001)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'only_one_main_company' 
    AND conrelid = 'main_company_settings'::regclass
  ) THEN
    ALTER TABLE main_company_settings
    ADD CONSTRAINT only_one_main_company CHECK (id = 1);
  END IF;
END $$;

-- =====================================================
-- Grants (from migration 011)
-- =====================================================
GRANT SELECT, INSERT, UPDATE ON conversations TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON conversation_participants TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON messages TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE conversations_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE conversation_participants_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE messages_id_seq TO PUBLIC;

-- DOWN
-- Drop all triggers
DROP TRIGGER IF EXISTS trigger_update_migration_history_updated_at ON migration_history;
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
DROP TRIGGER IF EXISTS email_routing_rules_updated_at ON email.email_routing_rules;
DROP TRIGGER IF EXISTS email_templates_updated_at ON email.email_templates;
DROP TRIGGER IF EXISTS email_messages_updated_at ON email.email_messages;
DROP TRIGGER IF EXISTS email_accounts_updated_at ON email.email_accounts;
DROP TRIGGER IF EXISTS client_checklists_updated_at ON crm.client_checklists;
DROP TRIGGER IF EXISTS client_onboarding_steps_updated_at ON crm.client_onboarding_steps;
DROP TRIGGER IF EXISTS client_onboarding_forms_updated_at ON crm.client_onboarding_forms;
DROP TRIGGER IF EXISTS client_service_packages_updated_at ON crm.client_service_packages;
DROP TRIGGER IF EXISTS client_documents_updated_at ON crm.client_documents;
DROP TRIGGER IF EXISTS checklist_templates_updated_at ON checklist_templates;
DROP TRIGGER IF EXISTS automations_updated_at ON tasks.automations;
DROP TRIGGER IF EXISTS events_updated_at ON tasks.events;
DROP TRIGGER IF EXISTS subtasks_updated_at ON tasks.subtasks;
DROP TRIGGER IF EXISTS tasks_updated_at ON tasks.tasks;
DROP TRIGGER IF EXISTS jobs_updated_at ON tasks.jobs;
DROP TRIGGER IF EXISTS pipelines_updated_at ON tasks.pipelines;
DROP TRIGGER IF EXISTS workspaces_updated_at ON tasks.workspaces;
DROP TRIGGER IF EXISTS rs_users_set_updated_at ON rs.users;
DROP TRIGGER IF EXISTS trigger_update_normalized_bank_transactions_updated_at ON bank.normalized_bank_transactions;
DROP TRIGGER IF EXISTS trigger_update_raw_bank_transactions_updated_at ON bank.raw_bank_transactions;
DROP TRIGGER IF EXISTS trigger_update_bank_accounts_updated_at ON bank.bank_accounts;
DROP TRIGGER IF EXISTS trigger_update_clients_updated_at ON clients;
DROP TRIGGER IF EXISTS trigger_update_company_settings_updated_at ON company_settings;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS update_migration_history_updated_at();
DROP FUNCTION IF EXISTS email.update_email_updated_at();
DROP FUNCTION IF EXISTS crm.update_crm_updated_at();
DROP FUNCTION IF EXISTS tasks.update_updated_at_column();
DROP FUNCTION IF EXISTS rs.set_updated_at();
DROP FUNCTION IF EXISTS bank.update_bank_updated_at();
DROP FUNCTION IF EXISTS update_clients_updated_at();
DROP FUNCTION IF EXISTS update_company_settings_updated_at();
DROP FUNCTION IF EXISTS tenant_code_to_int(TEXT);

-- Drop all schemas
DROP SCHEMA IF EXISTS email CASCADE;
DROP SCHEMA IF EXISTS crm CASCADE;
DROP SCHEMA IF EXISTS tasks CASCADE;
DROP SCHEMA IF EXISTS rs CASCADE;
DROP SCHEMA IF EXISTS bank CASCADE;
DROP SCHEMA IF EXISTS audit CASCADE;
DROP SCHEMA IF EXISTS accounting CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
