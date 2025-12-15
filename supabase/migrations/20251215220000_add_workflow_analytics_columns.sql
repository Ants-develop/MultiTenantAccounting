-- =====================================================
-- ADD MISSING ANALYTICS & TRACKING COLUMNS
-- Required by WorkflowAnalyticsDashboard & StageHistoryTimeline
-- Migration: 20251215220000
-- =====================================================

-- =====================================================
-- 1. ENHANCE WORKFLOWS TABLE
-- Add columns required for analytics and assignment tracking
-- =====================================================

-- Add service_type for workflow categorization
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS service_type TEXT;

-- Add assigned_to for team workload analysis
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add due_date for deadline tracking and overdue calculations
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;

-- Create indexes for performance on filter/sort operations
CREATE INDEX IF NOT EXISTS idx_workflows_service_type ON public.workflows(service_type);
CREATE INDEX IF NOT EXISTS idx_workflows_assigned_to ON public.workflows(assigned_to);
CREATE INDEX IF NOT EXISTS idx_workflows_due_date ON public.workflows(due_date);

-- Add helpful comments
COMMENT ON COLUMN public.workflows.service_type IS 'Type of service: monthly_bookkeeping, vat_return, payroll, tax_return, audit, year_end, etc.';
COMMENT ON COLUMN public.workflows.assigned_to IS 'Primary accountant assigned to this workflow job';
COMMENT ON COLUMN public.workflows.due_date IS 'Deadline for workflow completion, used for overdue calculations';

-- =====================================================
-- 2. ENHANCE WORKFLOW_STAGE_HISTORY TABLE
-- Add entered_by for audit trail of stage transitions
-- =====================================================

-- Add entered_by to track who made each stage transition
ALTER TABLE public.workflow_stage_history
  ADD COLUMN IF NOT EXISTS entered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_workflow_stage_history_entered_by ON public.workflow_stage_history(entered_by);

-- Add helpful comment
COMMENT ON COLUMN public.workflow_stage_history.entered_by IS 'User who transitioned the workflow to this stage';

-- =====================================================
-- 3. VERIFY EXISTING FOREIGN KEY CONSTRAINTS
-- Ensure proper relationships are maintained
-- =====================================================

-- Verify workflows foreign keys
DO $$
BEGIN
  -- Check if workflow.assigned_to constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workflows_assigned_to_fkey'
  ) THEN
    ALTER TABLE public.workflows
      ADD CONSTRAINT workflows_assigned_to_fkey 
      FOREIGN KEY (assigned_to) 
      REFERENCES public.profiles(id) 
      ON DELETE SET NULL;
  END IF;

  -- Check if workflow_stage_history.entered_by constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workflow_stage_history_entered_by_fkey'
  ) THEN
    ALTER TABLE public.workflow_stage_history
      ADD CONSTRAINT workflow_stage_history_entered_by_fkey 
      FOREIGN KEY (entered_by) 
      REFERENCES public.profiles(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- 4. VERIFY TABLE STRUCTURE
-- =====================================================

-- Display updated workflows schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workflows'
ORDER BY ordinal_position;

-- Display updated workflow_stage_history schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'workflow_stage_history'
ORDER BY ordinal_position;

-- =====================================================
-- 5. OPTIONAL: BACKFILL EXAMPLES
-- Uncomment and customize if you need to backfill existing rows
-- =====================================================

-- Example: Set default service_type for existing workflows
-- UPDATE public.workflows
-- SET service_type = 'general'
-- WHERE service_type IS NULL;

-- Example: Assign workflows to a default user
-- UPDATE public.workflows
-- SET assigned_to = (SELECT id FROM public.profiles WHERE job_title = 'Senior Accountant' LIMIT 1)
-- WHERE assigned_to IS NULL AND status = 'active';

-- Example: Set historical entered_by to creator
-- UPDATE public.workflow_stage_history wsh
-- SET entered_by = (
--   SELECT created_by 
--   FROM public.workflows w 
--   WHERE w.id = wsh.workflow_id
-- )
-- WHERE entered_by IS NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify migration success
SELECT 
  'workflows' AS table_name,
  COUNT(*) FILTER (WHERE column_name = 'service_type') AS has_service_type,
  COUNT(*) FILTER (WHERE column_name = 'assigned_to') AS has_assigned_to,
  COUNT(*) FILTER (WHERE column_name = 'due_date') AS has_due_date
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'workflows'
UNION ALL
SELECT 
  'workflow_stage_history' AS table_name,
  0,
  COUNT(*) FILTER (WHERE column_name = 'entered_by') AS has_entered_by,
  0
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'workflow_stage_history';

-- Expected output:
--  table_name              | has_service_type | has_assigned_to | has_due_date
-- -------------------------+------------------+-----------------+--------------
--  workflows               |        1         |        1        |       1
--  workflow_stage_history  |        0         |        1        |       0
