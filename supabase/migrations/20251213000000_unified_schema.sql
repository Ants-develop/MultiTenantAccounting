-- =====================================================
-- UNIFIED SCHEMA MIGRATION
-- Created: 2025-12-13
-- Purpose: Single source of truth for the entire database schema
-- Consolidates all previous migrations into one coherent structure
-- =====================================================

-- =====================================================
-- ENUMS & TYPES
-- =====================================================

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

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

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

-- =====================================================
-- CORE MODULE: User Management
-- =====================================================

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text NOT NULL,
  avatar_url text,
  phone text,
  job_title text,
  client_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER IF NOT EXISTS update_profiles_updated_at
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

-- =====================================================
-- CLIENT MODULE
-- =====================================================

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

CREATE TRIGGER IF NOT EXISTS update_clients_updated_at
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

-- =====================================================
-- WORKFLOW MODULE
-- =====================================================

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

-- =====================================================
-- TASK MODULE
-- =====================================================

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

-- =====================================================
-- CRM MODULE
-- =====================================================

-- Deal Stages
CREATE TABLE IF NOT EXISTS public.deal_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  order_position INTEGER NOT NULL UNIQUE,
  is_closed BOOLEAN DEFAULT false,
  is_won BOOLEAN DEFAULT false,
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY;

-- Insert default stages
INSERT INTO public.deal_stages (name, description, color, order_position, is_closed, is_won, probability)
SELECT 'Lead', 'Initial contact made', '#94a3b8', 1, false, false, 10
WHERE NOT EXISTS (SELECT 1 FROM public.deal_stages);

INSERT INTO public.deal_stages (name, description, color, order_position, is_closed, is_won, probability)
SELECT 'Qualified', 'Opportunity qualified', '#3b82f6', 2, false, false, 25
WHERE NOT EXISTS (SELECT 1 FROM public.deal_stages WHERE name = 'Qualified');

INSERT INTO public.deal_stages (name, description, color, order_position, is_closed, is_won, probability)
SELECT 'Proposal', 'Proposal sent', '#f59e0b', 3, false, false, 50
WHERE NOT EXISTS (SELECT 1 FROM public.deal_stages WHERE name = 'Proposal');

INSERT INTO public.deal_stages (name, description, color, order_position, is_closed, is_won, probability)
SELECT 'Negotiation', 'In negotiation', '#8b5cf6', 4, false, false, 75
WHERE NOT EXISTS (SELECT 1 FROM public.deal_stages WHERE name = 'Negotiation');

INSERT INTO public.deal_stages (name, description, color, order_position, is_closed, is_won, probability)
SELECT 'Closed Won', 'Deal won', '#22c55e', 5, true, true, 100
WHERE NOT EXISTS (SELECT 1 FROM public.deal_stages WHERE name = 'Closed Won');

INSERT INTO public.deal_stages (name, description, color, order_position, is_closed, is_won, probability)
SELECT 'Closed Lost', 'Deal lost', '#ef4444', 6, true, false, 0
WHERE NOT EXISTS (SELECT 1 FROM public.deal_stages WHERE name = 'Closed Lost');

-- Deals
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  stage_id UUID NOT NULL REFERENCES deal_stages(id),
  deal_value DECIMAL(12, 2),
  currency TEXT DEFAULT 'USD',
  expected_close_date DATE,
  actual_close_date DATE,
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  company_name TEXT,
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  lead_source TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'abandoned')),
  lost_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner_id ON deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_client_id ON deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);

-- Deal Activities
CREATE TABLE IF NOT EXISTS public.deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'call', 'email', 'meeting', 'stage_change', 'task')),
  subject TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  old_stage_id UUID REFERENCES deal_stages(id),
  new_stage_id UUID REFERENCES deal_stages(id),
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_id ON deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_activities_created_by ON deal_activities(created_by);

-- Deal Contacts
CREATE TABLE IF NOT EXISTS public.deal_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deal_contacts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_deal_contacts_deal_id ON deal_contacts(deal_id);

-- =====================================================
-- CALENDAR MODULE
-- =====================================================

-- Calendar Events
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_type TEXT NOT NULL DEFAULT 'meeting',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB,
  color TEXT DEFAULT '#6366f1',
  meeting_link TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON public.calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON public.calendar_events(event_type);

-- Calendar Event Participants
CREATE TABLE IF NOT EXISTS public.calendar_event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'tentative')),
  is_organizer BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  response_at TIMESTAMP WITH TIME ZONE,
  reminder_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.calendar_event_participants ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_calendar_participants_event ON public.calendar_event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_participants_user ON public.calendar_event_participants(user_id);

-- =====================================================
-- MESSAGING MODULE
-- =====================================================

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text,
    type text NOT NULL DEFAULT 'direct',
    client_id uuid REFERENCES public.clients(id),
    created_by uuid NOT NULL REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_message_at timestamp with time zone,
    is_archived boolean DEFAULT false NOT NULL
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_conversations_client ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- Conversation Participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id),
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    last_read_at timestamp with time zone,
    is_muted boolean DEFAULT false NOT NULL
);

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants(user_id);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id uuid NOT NULL REFERENCES auth.users(id),
    content text NOT NULL,
    type text NOT NULL DEFAULT 'text',
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_edited boolean DEFAULT false NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- =====================================================
-- NOTIFICATION MODULE
-- =====================================================

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id),
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- =====================================================
-- FEED MODULE
-- =====================================================

-- Feed Profiles (synced from profiles)
CREATE TABLE IF NOT EXISTS public.feed_profiles (
    id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    avatar_url text,
    job_title text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.feed_profiles ENABLE ROW LEVEL SECURITY;

-- Feed Posts
CREATE TABLE IF NOT EXISTS public.feed_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id uuid REFERENCES public.feed_profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    type text DEFAULT 'post',
    meta jsonb DEFAULT '{}'::jsonb,
    attachments jsonb DEFAULT '[]'::jsonb,
    visibility text DEFAULT 'public',
    parent_post_id uuid REFERENCES public.feed_posts(id) ON DELETE SET NULL,
    is_pinned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feed_posts_author ON public.feed_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON public.feed_posts(created_at DESC);

-- Feed Likes
CREATE TABLE IF NOT EXISTS public.feed_likes (
    post_id uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.feed_profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feed_likes_post ON public.feed_likes(post_id);

-- Feed Comments
CREATE TABLE IF NOT EXISTS public.feed_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE,
    author_id uuid REFERENCES public.feed_profiles(id) ON DELETE CASCADE,
    parent_comment_id uuid REFERENCES public.feed_comments(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_feed_comments_post ON public.feed_comments(post_id);

-- =====================================================
-- STORED PROCEDURES & FUNCTIONS
-- =====================================================

-- Function: Transition Workflow Stage
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
  SELECT current_stage_id INTO _old_stage_id
  FROM public.workflows
  WHERE id = _workflow_id;

  IF _old_stage_id IS NOT NULL THEN
    UPDATE public.workflow_stage_history
    SET exited_at = now(),
        duration_minutes = EXTRACT(EPOCH FROM (now() - entered_at)) / 60
    WHERE workflow_id = _workflow_id
      AND stage_id = _old_stage_id
      AND exited_at IS NULL;
  END IF;

  UPDATE public.workflows
  SET current_stage_id = _new_stage_id,
      updated_at = now()
  WHERE id = _workflow_id;

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

-- Function: Copy Pipeline to Client
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
    SELECT * INTO v_template FROM workflow_templates WHERE id = p_template_id;
    
    IF v_template IS NULL THEN
        RAISE EXCEPTION 'Template not found: %', p_template_id;
    END IF;
    
    INSERT INTO client_pipelines (client_id, source_template_id, name, description, created_by, recurrence_settings)
    VALUES (p_client_id, p_template_id, v_template.name, v_template.description, p_created_by, v_template.recurrence_settings)
    RETURNING id INTO v_client_pipeline_id;
    
    FOR v_stage IN 
        SELECT * FROM workflow_stages WHERE template_id = p_template_id ORDER BY order_position
    LOOP
        INSERT INTO client_pipeline_stages (
            client_pipeline_id, source_stage_id, name, description, 
            order_position, color, automation_rules
        )
        VALUES (
            v_client_pipeline_id, v_stage.id, v_stage.name, v_stage.description,
            v_stage.order_position, v_stage.color, v_stage.automation_rules
        )
        RETURNING id INTO v_new_stage_id;
        
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

-- Function: Create Client from Deal
CREATE OR REPLACE FUNCTION public.create_client_from_deal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_client_id UUID;
  primary_contact_id UUID;
BEGIN
  IF NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status != 'won') AND NEW.client_id IS NULL THEN
    INSERT INTO clients (
      name,
      business_type,
      email,
      phone,
      status,
      assigned_owner_id,
      created_by,
      notes
    ) VALUES (
      COALESCE(NEW.company_name, NEW.contact_name),
      'individual',
      NEW.contact_email,
      NEW.contact_phone,
      'active',
      NEW.owner_id,
      NEW.owner_id,
      'Created automatically from deal: ' || NEW.name
    )
    RETURNING id INTO new_client_id;
    
    INSERT INTO client_contacts (
      client_id,
      name,
      email,
      phone,
      is_primary,
      role
    ) VALUES (
      new_client_id,
      NEW.contact_name,
      NEW.contact_email,
      NEW.contact_phone,
      true,
      'Primary Contact'
    )
    RETURNING id INTO primary_contact_id;
    
    NEW.client_id := new_client_id;
    NEW.actual_close_date := CURRENT_DATE;
    
    INSERT INTO deal_activities (
      deal_id,
      activity_type,
      subject,
      description,
      created_by
    ) VALUES (
      NEW.id,
      'note',
      'Client Created',
      'Client "' || COALESCE(NEW.company_name, NEW.contact_name) || '" created automatically from won deal',
      NEW.owner_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function: Log Deal Stage Change
CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_stage_name TEXT;
  new_stage_name TEXT;
BEGIN
  IF NEW.stage_id != OLD.stage_id THEN
    SELECT name INTO old_stage_name FROM deal_stages WHERE id = OLD.stage_id;
    SELECT name INTO new_stage_name FROM deal_stages WHERE id = NEW.stage_id;
    
    INSERT INTO deal_activities (
      deal_id,
      activity_type,
      subject,
      description,
      old_stage_id,
      new_stage_id,
      created_by
    ) VALUES (
      NEW.id,
      'stage_change',
      'Stage Changed',
      'Deal moved from "' || old_stage_name || '" to "' || new_stage_name || '"',
      OLD.stage_id,
      NEW.stage_id,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function: Update Conversation Last Message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Validate Event Time Range
CREATE OR REPLACE FUNCTION validate_event_time_range()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'Event end time must be after start time';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Workflow Triggers
DROP TRIGGER IF EXISTS update_workflow_templates_updated_at ON public.workflow_templates;
CREATE TRIGGER update_workflow_templates_updated_at
  BEFORE UPDATE ON public.workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflows_updated_at ON public.workflows;
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Deal Triggers
DROP TRIGGER IF EXISTS update_deal_stages_updated_at ON public.deal_stages;
CREATE TRIGGER update_deal_stages_updated_at
  BEFORE UPDATE ON deal_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deals_updated_at ON public.deals;
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deal_activities_updated_at ON public.deal_activities;
CREATE TRIGGER update_deal_activities_updated_at
  BEFORE UPDATE ON deal_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_create_client_from_deal ON public.deals;
CREATE TRIGGER trigger_create_client_from_deal
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION create_client_from_deal();

DROP TRIGGER IF EXISTS trigger_log_deal_stage_change ON public.deals;
CREATE TRIGGER trigger_log_deal_stage_change
  AFTER UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION log_deal_stage_change();

-- Calendar Triggers
DROP TRIGGER IF EXISTS check_event_time_range ON public.calendar_events;
CREATE TRIGGER check_event_time_range
  BEFORE INSERT OR UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION validate_event_time_range();

-- Messaging Triggers
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Profiles RLS
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles 
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Clients RLS
DROP POLICY IF EXISTS "Staff can view clients" ON public.clients;
CREATE POLICY "Staff can view clients" ON public.clients 
  FOR SELECT USING (NOT public.has_role(auth.uid(), 'client'));

-- Workflow Templates RLS
DROP POLICY IF EXISTS "Staff can view all templates" ON public.workflow_templates;
CREATE POLICY "Staff can view all templates" ON public.workflow_templates 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can create templates" ON public.workflow_templates;
CREATE POLICY "Staff can create templates" ON public.workflow_templates 
  FOR INSERT WITH CHECK (NOT public.has_role(auth.uid(), 'client'));

-- Workflow Stages RLS
DROP POLICY IF EXISTS "Staff can view all stages" ON public.workflow_stages;
CREATE POLICY "Staff can view all stages" ON public.workflow_stages 
  FOR SELECT USING (true);

-- Workflows RLS
DROP POLICY IF EXISTS "Staff can view workflows" ON public.workflows;
CREATE POLICY "Staff can view workflows" ON public.workflows 
  FOR SELECT USING (NOT public.has_role(auth.uid(), 'client'));

-- Tasks RLS
DROP POLICY IF EXISTS "Staff can view tasks" ON public.tasks;
CREATE POLICY "Staff can view tasks" ON public.tasks 
  FOR SELECT USING (NOT public.has_role(auth.uid(), 'client'));

-- Client Pipelines RLS
DROP POLICY IF EXISTS "Staff can view client pipelines" ON public.client_pipelines;
CREATE POLICY "Staff can view client pipelines" ON public.client_pipelines 
  FOR SELECT USING (NOT public.has_role(auth.uid(), 'client'));

-- Deal Stages RLS
DROP POLICY IF EXISTS "Staff can view all deal stages" ON public.deal_stages;
CREATE POLICY "Staff can view all deal stages" ON deal_stages 
  FOR SELECT USING (NOT has_role(auth.uid(), 'client'::app_role));

DROP POLICY IF EXISTS "Admins can manage deal stages" ON public.deal_stages;
CREATE POLICY "Admins can manage deal stages" ON deal_stages 
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Deals RLS
DROP POLICY IF EXISTS "Staff can view all deals" ON public.deals;
CREATE POLICY "Staff can view all deals" ON deals 
  FOR SELECT USING (NOT has_role(auth.uid(), 'client'::app_role));

DROP POLICY IF EXISTS "Staff can create deals" ON public.deals;
CREATE POLICY "Staff can create deals" ON deals 
  FOR INSERT WITH CHECK (
    NOT has_role(auth.uid(), 'client'::app_role)
    AND auth.uid() = created_by
  );

DROP POLICY IF EXISTS "Deal owners and admins can update deals" ON public.deals;
CREATE POLICY "Deal owners and admins can update deals" ON deals 
  FOR UPDATE USING (
    auth.uid() = owner_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );

DROP POLICY IF EXISTS "Admins can delete deals" ON public.deals;
CREATE POLICY "Admins can delete deals" ON deals 
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Deal Activities RLS
DROP POLICY IF EXISTS "Staff can view activities for their deals" ON public.deal_activities;
CREATE POLICY "Staff can view activities for their deals" ON deal_activities 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_activities.deal_id
      AND (deals.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

DROP POLICY IF EXISTS "Staff can create activities" ON public.deal_activities;
CREATE POLICY "Staff can create activities" ON deal_activities 
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_activities.deal_id
      AND (deals.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

-- Deal Contacts RLS
DROP POLICY IF EXISTS "Staff can manage contacts for their deals" ON public.deal_contacts;
CREATE POLICY "Staff can manage contacts for their deals" ON deal_contacts 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_contacts.deal_id
      AND (deals.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
    )
  );

-- Calendar Events RLS
DROP POLICY IF EXISTS "Users can view events they are part of" ON public.calendar_events;
CREATE POLICY "Users can view events they are part of" ON public.calendar_events
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.calendar_event_participants
      WHERE event_id = id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create events" ON public.calendar_events;
CREATE POLICY "Users can create events" ON public.calendar_events
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their events" ON public.calendar_events;
CREATE POLICY "Users can update their events" ON public.calendar_events
  FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their events" ON public.calendar_events;
CREATE POLICY "Users can delete their events" ON public.calendar_events
  FOR DELETE USING (created_by = auth.uid());

-- Calendar Event Participants RLS
DROP POLICY IF EXISTS "Users can view participants of events they belong to" ON public.calendar_event_participants;
CREATE POLICY "Users can view participants of events they belong to" ON public.calendar_event_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE id = event_id AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Event creators can manage participants" ON public.calendar_event_participants;
CREATE POLICY "Event creators can manage participants" ON public.calendar_event_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Messaging RLS
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations" ON public.conversations
  FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
CREATE POLICY "Users can send messages to their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Notifications RLS
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

-- Feed RLS (Permissive for MVP)
DROP POLICY IF EXISTS "Allow all access to profiles" ON public.feed_profiles;
CREATE POLICY "Allow all access to profiles" ON public.feed_profiles 
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to posts" ON public.feed_posts;
CREATE POLICY "Allow all access to posts" ON public.feed_posts 
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to likes" ON public.feed_likes;
CREATE POLICY "Allow all access to likes" ON public.feed_likes 
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to comments" ON public.feed_comments;
CREATE POLICY "Allow all access to comments" ON public.feed_comments 
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- END OF UNIFIED SCHEMA
-- =====================================================
