-- =====================================================
-- CREATE WORKFLOW & TASK MANAGEMENT TABLES
-- Workflows, Workflow Templates, Workflow Stages, Tasks
-- =====================================================

-- Workflow Templates (reusable workflow blueprints)
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT, -- 'onboarding', 'monthly_close', 'year_end', 'audit', 'custom'
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Stages (stages within a template)
CREATE TABLE IF NOT EXISTS public.workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL,
  color TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Client Pipelines
CREATE TABLE IF NOT EXISTS public.client_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Client Pipeline Stages
CREATE TABLE IF NOT EXISTS public.client_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.client_pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  color TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workflows (active workflow instances)
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.workflow_templates(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  current_stage_id UUID REFERENCES public.workflow_stages(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Stage History
CREATE TABLE IF NOT EXISTS public.workflow_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.workflow_stages(id) ON DELETE CASCADE,
  entered_at TIMESTAMP DEFAULT NOW(),
  exited_at TIMESTAMP,
  notes TEXT
);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  tags JSONB,
  metadata JSONB,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Task Templates
CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_stage_id UUID REFERENCES public.workflow_stages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  default_assignee UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  estimated_days INTEGER,
  priority TEXT DEFAULT 'medium',
  "order" INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Client Task Templates
CREATE TABLE IF NOT EXISTS public.client_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  recurring_frequency TEXT, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Task Comments
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflow_stages_template_id ON public.workflow_stages(template_id);
CREATE INDEX IF NOT EXISTS idx_workflows_client_id ON public.workflows(client_id);
CREATE INDEX IF NOT EXISTS idx_workflows_template_id ON public.workflows(template_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON public.workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflow_stage_history_workflow_id ON public.workflow_stage_history(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON public.tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_task_templates_workflow_stage_id ON public.task_templates(workflow_stage_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);

COMMENT ON TABLE public.workflow_templates IS 'Reusable workflow blueprints';
COMMENT ON TABLE public.workflow_stages IS 'Stages within workflow templates';
COMMENT ON TABLE public.workflows IS 'Active workflow instances for clients';
COMMENT ON TABLE public.tasks IS 'Task management system';
COMMENT ON TABLE public.task_templates IS 'Reusable task templates';
