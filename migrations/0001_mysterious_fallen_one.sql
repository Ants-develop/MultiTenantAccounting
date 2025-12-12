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
	"created_by" integer,
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
	"client_id" integer,
	"restore_options" jsonb,
	"completed_at" timestamp,
	"error_message" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calendar_event_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_organizer" boolean DEFAULT false,
	"can_edit" boolean DEFAULT false,
	"response_at" timestamp,
	"reminder_minutes" integer DEFAULT 15
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"event_type" text DEFAULT 'meeting' NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"all_day" boolean DEFAULT false,
	"is_recurring" boolean DEFAULT false,
	"recurrence_pattern" jsonb,
	"color" text DEFAULT '#6366f1',
	"meeting_link" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_by" integer,
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
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"action_type" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"user_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"related_task_id" integer NOT NULL,
	"relation_type" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "subtasks" ADD COLUMN "assignee_id" integer;--> statement-breakpoint
ALTER TABLE "subtasks" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "parent_recurring_task_id" integer;--> statement-breakpoint
ALTER TABLE "backup_migration_logs" ADD CONSTRAINT "backup_migration_logs_restore_id_mssql_restores_id_fk" FOREIGN KEY ("restore_id") REFERENCES "public"."mssql_restores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backup_migration_logs" ADD CONSTRAINT "backup_migration_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mssql_restores" ADD CONSTRAINT "mssql_restores_download_id_gdrive_downloads_id_fk" FOREIGN KEY ("download_id") REFERENCES "public"."gdrive_downloads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mssql_restores" ADD CONSTRAINT "mssql_restores_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mssql_restores" ADD CONSTRAINT "mssql_restores_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_participants" ADD CONSTRAINT "calendar_event_participants_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event_participants" ADD CONSTRAINT "calendar_event_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gdrive_downloads" ADD CONSTRAINT "gdrive_downloads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity_logs" ADD CONSTRAINT "task_activity_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity_logs" ADD CONSTRAINT "task_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_relations" ADD CONSTRAINT "task_relations_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_relations" ADD CONSTRAINT "task_relations_related_task_id_tasks_id_fk" FOREIGN KEY ("related_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_recurring_task_id_tasks_id_fk" FOREIGN KEY ("parent_recurring_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;