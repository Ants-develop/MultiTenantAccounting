CREATE TABLE "accounting"."accounts" (
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
CREATE TABLE "automations" (
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
CREATE TABLE "bank_accounts" (
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
CREATE TABLE "email_accounts" (
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
CREATE TABLE "email_messages" (
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
CREATE TABLE "email_routing_rules" (
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
CREATE TABLE "email_templates" (
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
CREATE TABLE "events" (
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
CREATE TABLE "accounting"."general_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"tenant_code" text,
	"tenant_name" text,
	"abonent" text,
	"postings_period" timestamp,
	"register" text,
	"branch" text,
	"content" text,
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
	"posting_number" numeric(18, 0),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
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
CREATE TABLE "jobs" (
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
CREATE TABLE "normalized_bank_transactions" (
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
CREATE TABLE "pipelines" (
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
CREATE TABLE "raw_bank_transactions" (
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
CREATE TABLE "subtasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"title" text NOT NULL,
	"done" boolean DEFAULT false,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" integer
);
--> statement-breakpoint
CREATE TABLE "tasks" (
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
CREATE TABLE "activity_log" (
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
CREATE TABLE "workspaces" (
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
ALTER TABLE "automations" ADD CONSTRAINT "automations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_email_account_id_email_accounts_id_fk" FOREIGN KEY ("email_account_id") REFERENCES "public"."email_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_routing_rules" ADD CONSTRAINT "email_routing_rules_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_related_task_id_tasks_id_fk" FOREIGN KEY ("related_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_related_job_id_jobs_id_fk" FOREIGN KEY ("related_job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."general_ledger" ADD CONSTRAINT "general_ledger_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "accounting"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."journal_entries" ADD CONSTRAINT "journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "accounting"."journal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounting"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_bank_transactions" ADD CONSTRAINT "normalized_bank_transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_bank_transactions" ADD CONSTRAINT "normalized_bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_bank_transactions" ADD CONSTRAINT "normalized_bank_transactions_raw_transaction_id_raw_bank_transactions_id_fk" FOREIGN KEY ("raw_transaction_id") REFERENCES "public"."raw_bank_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "normalized_bank_transactions" ADD CONSTRAINT "normalized_bank_transactions_normalized_by_users_id_fk" FOREIGN KEY ("normalized_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_bank_transactions" ADD CONSTRAINT "raw_bank_transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_bank_transactions" ADD CONSTRAINT "raw_bank_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_bank_transactions" ADD CONSTRAINT "raw_bank_transactions_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rs"."users" ADD CONSTRAINT "users_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rs"."users" ADD CONSTRAINT "users_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_depends_on_task_id_tasks_id_fk" FOREIGN KEY ("depends_on_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_client_features" ADD CONSTRAINT "user_client_features_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_client_features" ADD CONSTRAINT "user_client_features_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_client_modules" ADD CONSTRAINT "user_client_modules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_client_modules" ADD CONSTRAINT "user_client_modules_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting"."vendors" ADD CONSTRAINT "vendors_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
-- DOWN
DROP SCHEMA IF EXISTS accounting CASCADE;
DROP SCHEMA IF EXISTS rs CASCADE;
DROP SCHEMA IF EXISTS crm CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
