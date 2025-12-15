-- =====================================================
-- ADD MISSING COLUMNS TO MATCH CLIENT QUERIES
-- =====================================================

-- Add assigned_to column to workflows table
ALTER TABLE public.workflows 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for workflows.assigned_to
CREATE INDEX IF NOT EXISTS idx_workflows_assigned_to ON public.workflows(assigned_to);

-- Add assigned_to column to workflows if it was created by earlier migration
-- (This is safe to run even if column exists due to IF NOT EXISTS)

COMMENT ON COLUMN public.workflows.assigned_to IS 'User assigned to this workflow';
