-- Core Types
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'accountant', 'client');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.business_type AS ENUM ('individual', 'sole_proprietor', 'partnership', 'llc', 's_corp', 'c_corp', 'nonprofit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.client_status AS ENUM ('active', 'inactive', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.workflow_template_type AS ENUM ('tax_return', 'monthly_close', 'payroll', 'audit', 'bookkeeping', 'custom', 'monthly_bookkeeping', 'vat_return', 'annual_financials');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'review', 'completed', 'blocked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Helper Functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  new.updated_at = now();
  return new;
END;
$$;

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text NOT NULL,
  avatar_url text,
  phone text,
  job_title text,
  client_id uuid, -- Added for client users
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business_type public.business_type NOT NULL DEFAULT 'individual',
  tax_id text,
  industry text,
  email text,
  phone text,
  address jsonb DEFAULT '{}'::jsonb,
  status public.client_status NOT NULL DEFAULT 'active',
  communication_preferences jsonb DEFAULT '{}'::jsonb,
  assigned_owner_id uuid REFERENCES public.profiles(id),
  assigned_accountant_id uuid REFERENCES public.profiles(id),
  assigned_reviewer_id uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Client Contacts
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  role text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- Client Team Assignments
CREATE TABLE IF NOT EXISTS public.client_team_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_type text NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id, role_type)
);

ALTER TABLE public.client_team_assignments ENABLE ROW LEVEL SECURITY;

-- Workflow Templates
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type public.workflow_template_type NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  estimated_duration_days integer,
  recurrence_settings jsonb DEFAULT '{"is_active": false}',
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

-- Workflow Stages
CREATE TABLE IF NOT EXISTS public.workflow_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  order_position integer NOT NULL,
  color text DEFAULT '#6366f1',
  automation_rules jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;

-- Client Pipelines
CREATE TABLE IF NOT EXISTS public.client_pipelines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    source_template_id uuid NOT NULL REFERENCES public.workflow_templates(id),
    name text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    recurrence_settings jsonb DEFAULT NULL,
    created_by uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_pipelines ENABLE ROW LEVEL SECURITY;

-- Client Pipeline Stages
CREATE TABLE IF NOT EXISTS public.client_pipeline_stages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_pipeline_id uuid NOT NULL REFERENCES public.client_pipelines(id) ON DELETE CASCADE,
    source_stage_id uuid REFERENCES public.workflow_stages(id),
    name text NOT NULL,
    description text,
    order_position integer NOT NULL,
    color text DEFAULT '#6366f1',
    automation_rules jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Workflows
CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.workflow_templates(id),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_pipeline_id uuid REFERENCES public.client_pipelines(id),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  current_stage_id uuid REFERENCES public.workflow_stages(id),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  period text,
  period_start_date date,
  period_end_date date,
  service_type text,
  assigned_to uuid REFERENCES public.profiles(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Tasks
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

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Task Templates
CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.workflow_stages(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  estimated_hours integer,
  order_position integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Client Task Templates
CREATE TABLE IF NOT EXISTS public.client_task_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_pipeline_id uuid NOT NULL REFERENCES public.client_pipelines(id) ON DELETE CASCADE,
    stage_id uuid REFERENCES public.client_pipeline_stages(id) ON DELETE CASCADE,
    source_template_id uuid REFERENCES public.task_templates(id),
    title text NOT NULL,
    description text,
    priority public.task_priority NOT NULL DEFAULT 'medium',
    estimated_hours integer,
    order_position integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_task_templates ENABLE ROW LEVEL SECURITY;

-- Checklists
CREATE TABLE IF NOT EXISTS public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  order_position integer NOT NULL,
  completed_at timestamp with time zone,
  completed_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

-- Task Comments
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  comment text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Workflow Stage History
CREATE TABLE IF NOT EXISTS public.workflow_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.workflow_stages(id) ON DELETE CASCADE,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exited_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  entered_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_stage_history ENABLE ROW LEVEL SECURITY;

-- Client Services
CREATE TABLE IF NOT EXISTS public.client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  workflow_template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  client_pipeline_id uuid REFERENCES public.client_pipelines(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT CHECK (frequency IN ('monthly', 'quarterly', 'annual', 'one-time')),
  start_date DATE NOT NULL,
  end_date DATE,
  assigned_to UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, service_type)
);

ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;

-- RPC: Transition Workflow Stage
CREATE OR REPLACE FUNCTION public.transition_workflow_stage(
  _workflow_id UUID,
  _new_stage_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_stage_id UUID;
  _history_id UUID;
  _entered_at TIMESTAMPTZ;
BEGIN
  -- Get current stage
  SELECT current_stage_id INTO _old_stage_id
  FROM public.workflows
  WHERE id = _workflow_id;

  -- Close previous stage in history
  IF _old_stage_id IS NOT NULL THEN
    UPDATE public.workflow_stage_history
    SET exited_at = now(),
        duration_minutes = EXTRACT(EPOCH FROM (now() - entered_at)) / 60
    WHERE workflow_id = _workflow_id
      AND stage_id = _old_stage_id
      AND exited_at IS NULL;
  END IF;

  -- Update workflow current stage
  UPDATE public.workflows
  SET current_stage_id = _new_stage_id,
      updated_at = now()
  WHERE id = _workflow_id;

  -- Create new stage history entry
  INSERT INTO public.workflow_stage_history (
    workflow_id,
    stage_id,
    entered_at,
    entered_by,
    notes
  ) VALUES (
    _workflow_id,
    _new_stage_id,
    now(),
    auth.uid(),
    _notes
  )
  RETURNING id, entered_at INTO _history_id, _entered_at;

  RETURN _history_id;
END;
$$;

-- RPC: Copy Pipeline to Client
CREATE OR REPLACE FUNCTION public.copy_pipeline_to_client(
    p_client_id uuid,
    p_template_id uuid,
    p_created_by uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_client_pipeline_id uuid;
    v_template RECORD;
    v_stage RECORD;
    v_new_stage_id uuid;
BEGIN
    -- Get template details
    SELECT * INTO v_template FROM workflow_templates WHERE id = p_template_id;
    
    IF v_template IS NULL THEN
        RAISE EXCEPTION 'Template not found: %', p_template_id;
    END IF;
    
    -- Create client pipeline with recurrence_settings
    INSERT INTO client_pipelines (client_id, source_template_id, name, description, created_by, recurrence_settings)
    VALUES (p_client_id, p_template_id, v_template.name, v_template.description, p_created_by, v_template.recurrence_settings)
    RETURNING id INTO v_client_pipeline_id;
    
    -- Copy stages and their task templates
    FOR v_stage IN 
        SELECT * FROM workflow_stages WHERE template_id = p_template_id ORDER BY order_position
    LOOP
        -- Create client pipeline stage
        INSERT INTO client_pipeline_stages (
            client_pipeline_id, source_stage_id, name, description, 
            order_position, color, automation_rules
        )
        VALUES (
            v_client_pipeline_id, v_stage.id, v_stage.name, v_stage.description,
            v_stage.order_position, v_stage.color, v_stage.automation_rules
        )
        RETURNING id INTO v_new_stage_id;
        
        -- Copy task templates for this stage
        INSERT INTO client_task_templates (
            client_pipeline_id, stage_id, source_template_id,
            title, description, priority, estimated_hours, order_position
        )
        SELECT 
            v_client_pipeline_id, v_new_stage_id, tt.id,
            tt.title, tt.description, tt.priority, tt.estimated_hours, tt.order_position
        FROM task_templates tt
        WHERE tt.stage_id = v_stage.id
        ORDER BY tt.order_position;
    END LOOP;
    
    RETURN v_client_pipeline_id;
END;
$$;

-- RLS Policies (Simplified for initial setup)

-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Clients
CREATE POLICY "Staff can view clients" ON public.clients FOR SELECT USING (NOT public.has_role(auth.uid(), 'client'));

-- Workflow Templates
CREATE POLICY "Staff can view all templates" ON public.workflow_templates FOR SELECT USING (true);
CREATE POLICY "Staff can create templates" ON public.workflow_templates FOR INSERT WITH CHECK (NOT public.has_role(auth.uid(), 'client'));

-- Workflow Stages
CREATE POLICY "Staff can view all stages" ON public.workflow_stages FOR SELECT USING (true);

-- Workflows
CREATE POLICY "Staff can view workflows" ON public.workflows FOR SELECT USING (NOT public.has_role(auth.uid(), 'client'));

-- Tasks
CREATE POLICY "Staff can view tasks" ON public.tasks FOR SELECT USING (NOT public.has_role(auth.uid(), 'client'));

-- Client Pipelines
CREATE POLICY "Staff can view client pipelines" ON public.client_pipelines FOR SELECT USING (NOT public.has_role(auth.uid(), 'client'));

