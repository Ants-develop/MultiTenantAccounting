-- Cleanup old CRM and TaxDome schemas
-- This migration removes tables that were part of the old Drizzle/Integer based architecture
-- and ensures the new Supabase/UUID architecture is correctly established.

-- 1. Drop old CRM schema and tables
DROP SCHEMA IF EXISTS crm CASCADE;

-- 2. Drop old TaxDome-style tables (except tasks which needs special handling)
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.subtasks CASCADE;
DROP TABLE IF EXISTS public.task_relations CASCADE;
DROP TABLE IF EXISTS public.task_activity_logs CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.automations CASCADE;
DROP TABLE IF EXISTS public.activity_log CASCADE; -- taxdomeActivityLog
DROP TABLE IF EXISTS public.pipelines CASCADE;
DROP TABLE IF EXISTS public.checklist_templates CASCADE;
DROP TABLE IF EXISTS public.task_assignments CASCADE;

-- 3. Handle 'tasks' table collision
DO $$
BEGIN
    -- Check if 'tasks' table exists and has 'workspace_id' column (signature of old schema)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'workspace_id') THEN
        -- Rename old tasks table to backup
        ALTER TABLE public.tasks RENAME TO tasks_old_backup;
    END IF;
END $$;

-- 4. Ensure new 'tasks' table exists (in case it was blocked by the old one or we just renamed it)
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.workflows(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.workflow_stages(id),
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES public.profiles(id),
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'todo',
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_pattern jsonb,
  dependencies uuid[],
  tags text[],
  order_position integer DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT either_workflow_or_client CHECK (workflow_id IS NOT NULL OR client_id IS NOT NULL)
);

-- Re-apply RLS to tasks just in case
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Staff can view tasks" ON public.tasks FOR SELECT USING (NOT public.has_role(auth.uid(), 'client'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
