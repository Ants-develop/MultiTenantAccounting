-- Phase 1: Pipeline/Workflow Management System - Database Schema Enhancement

-- =====================================================
-- 0. ADD NEW ENUM VALUES FOR WORKFLOW TYPES
-- Note: These must be added outside transaction blocks
-- =====================================================

-- Add monthly_bookkeeping if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'monthly_bookkeeping' AND enumtypid = 'workflow_template_type'::regtype) THEN
    ALTER TYPE workflow_template_type ADD VALUE IF NOT EXISTS 'monthly_bookkeeping';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add vat_return if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'vat_return' AND enumtypid = 'workflow_template_type'::regtype) THEN
    ALTER TYPE workflow_template_type ADD VALUE IF NOT EXISTS 'vat_return';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add payroll if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'payroll' AND enumtypid = 'workflow_template_type'::regtype) THEN
    ALTER TYPE workflow_template_type ADD VALUE IF NOT EXISTS 'payroll';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add annual_financials if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'annual_financials' AND enumtypid = 'workflow_template_type'::regtype) THEN
    ALTER TYPE workflow_template_type ADD VALUE IF NOT EXISTS 'annual_financials';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 1. CREATE CLIENT_SERVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  workflow_template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_client_services_client ON public.client_services(client_id);
CREATE INDEX IF NOT EXISTS idx_client_services_template ON public.client_services(workflow_template_id);
CREATE INDEX IF NOT EXISTS idx_client_services_active ON public.client_services(is_active) WHERE is_active = true;

-- =====================================================
-- 2. ENHANCE WORKFLOWS TABLE
-- =====================================================
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS period TEXT,
  ADD COLUMN IF NOT EXISTS period_start_date DATE,
  ADD COLUMN IF NOT EXISTS period_end_date DATE,
  ADD COLUMN IF NOT EXISTS service_type TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_workflows_period ON public.workflows(client_id, period);
CREATE INDEX IF NOT EXISTS idx_workflows_service ON public.workflows(service_type);
CREATE INDEX IF NOT EXISTS idx_workflows_assigned ON public.workflows(assigned_to);

-- =====================================================
-- 3. CREATE WORKFLOW_STAGE_HISTORY TABLE
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_workflow_stage_history_workflow ON public.workflow_stage_history(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_stage_history_stage ON public.workflow_stage_history(stage_id);
CREATE INDEX IF NOT EXISTS idx_workflow_stage_history_dates ON public.workflow_stage_history(entered_at, exited_at);

-- =====================================================
-- 4. ENHANCE TASKS TABLE
-- =====================================================
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.workflow_stages(id),
  ADD COLUMN IF NOT EXISTS order_position INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tasks_stage ON public.tasks(workflow_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_tasks_order ON public.tasks(stage_id, order_position);

-- =====================================================
-- 6. RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Enable RLS
ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stage_history ENABLE ROW LEVEL SECURITY;

-- Client Services Policies
DROP POLICY IF EXISTS "Staff can view all client services" ON public.client_services;
CREATE POLICY "Staff can view all client services"
  ON public.client_services
  FOR SELECT
  USING (
    NOT has_role(auth.uid(), 'client'::app_role)
  );

DROP POLICY IF EXISTS "Clients can view their own services" ON public.client_services;
CREATE POLICY "Clients can view their own services"
  ON public.client_services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.client_id = client_services.client_id
        AND has_role(auth.uid(), 'client'::app_role)
    )
  );

DROP POLICY IF EXISTS "Staff can manage client services" ON public.client_services;
CREATE POLICY "Staff can manage client services"
  ON public.client_services
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- Workflow Stage History Policies
DROP POLICY IF EXISTS "Staff can view stage history" ON public.workflow_stage_history;
CREATE POLICY "Staff can view stage history"
  ON public.workflow_stage_history
  FOR SELECT
  USING (
    NOT has_role(auth.uid(), 'client'::app_role)
  );

DROP POLICY IF EXISTS "Clients can view their workflow stage history" ON public.workflow_stage_history;
CREATE POLICY "Clients can view their workflow stage history"
  ON public.workflow_stage_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE w.id = workflow_stage_history.workflow_id
        AND p.client_id = w.client_id
        AND has_role(auth.uid(), 'client'::app_role)
    )
  );

DROP POLICY IF EXISTS "Staff can insert stage history" ON public.workflow_stage_history;
CREATE POLICY "Staff can insert stage history"
  ON public.workflow_stage_history
  FOR INSERT
  WITH CHECK (
    NOT has_role(auth.uid(), 'client'::app_role)
  );

DROP POLICY IF EXISTS "Staff can update stage history" ON public.workflow_stage_history;
CREATE POLICY "Staff can update stage history"
  ON public.workflow_stage_history
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- =====================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- =====================================================

DROP TRIGGER IF EXISTS update_client_services_updated_at ON public.client_services;
CREATE TRIGGER update_client_services_updated_at
  BEFORE UPDATE ON public.client_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 8. HELPER FUNCTION FOR STAGE TRANSITIONS
-- =====================================================

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

COMMENT ON FUNCTION public.transition_workflow_stage IS 'Transitions a workflow to a new stage, updating history and closing previous stage';