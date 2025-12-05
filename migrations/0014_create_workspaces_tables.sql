-- =====================================================
-- Migration: Create Workspaces and Related Tables
-- =====================================================

-- UP

-- Create workspaces table if it doesn't exist
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text UNIQUE,
	"client_id" integer REFERENCES "clients"("id") ON DELETE CASCADE,
	"plan" text DEFAULT 'standard',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- Create pipelines table if it doesn't exist (depends on workspaces)
CREATE TABLE IF NOT EXISTS "pipelines" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"description" text,
	"stages" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- Create jobs table if it doesn't exist
CREATE TABLE IF NOT EXISTS "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
	"pipeline_id" integer REFERENCES "pipelines"("id") ON DELETE SET NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending',
	"priority" text DEFAULT 'medium',
	"assigned_to" integer REFERENCES "users"("id") ON DELETE SET NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_workspaces_client_id" ON "workspaces"("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_workspaces_is_active" ON "workspaces"("is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pipelines_workspace_id" ON "pipelines"("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_jobs_workspace_id" ON "jobs"("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_jobs_pipeline_id" ON "jobs"("pipeline_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_jobs_assigned_to" ON "jobs"("assigned_to");
--> statement-breakpoint

-- DOWN

-- Drop indexes
DROP INDEX IF EXISTS "idx_jobs_assigned_to";
DROP INDEX IF EXISTS "idx_jobs_pipeline_id";
DROP INDEX IF EXISTS "idx_jobs_workspace_id";
DROP INDEX IF EXISTS "idx_pipelines_workspace_id";
DROP INDEX IF EXISTS "idx_workspaces_is_active";
DROP INDEX IF EXISTS "idx_workspaces_client_id";

-- Drop tables
DROP TABLE IF EXISTS "jobs";
DROP TABLE IF EXISTS "pipelines";
DROP TABLE IF EXISTS "workspaces";

