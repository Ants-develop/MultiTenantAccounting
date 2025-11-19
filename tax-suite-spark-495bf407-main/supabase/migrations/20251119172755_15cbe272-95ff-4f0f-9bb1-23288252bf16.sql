-- ================================================================
-- Phase 5: RLS Policies for Workflow Management
-- ================================================================
-- This migration adds comprehensive RLS policies to ensure:
-- 1. Clients can view their own jobs (read-only)
-- 2. Accountants can manage jobs assigned to them
-- 3. Staff can manage jobs for their assigned clients
-- 4. Admins have full access
-- 5. Only admins can delete workflows/templates
-- ================================================================

-- ================================================================
-- PART 1: Update Workflows SELECT Policy
-- ================================================================
-- Drop existing policy
DROP POLICY IF EXISTS "Staff can view workflows for their clients" ON public.workflows;

-- Create enhanced policy that includes direct job assignment
CREATE POLICY "Staff can view workflows they have access to"
  ON public.workflows
  FOR SELECT
  USING (
    -- Admins and managers see everything
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    -- Accountants assigned to the specific workflow
    OR auth.uid() = workflows.assigned_to
    -- Staff assigned to the client
    OR EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = workflows.client_id
      AND (
        auth.uid() = assigned_owner_id
        OR auth.uid() = assigned_accountant_id
        OR auth.uid() = assigned_reviewer_id
      )
    )
  );

-- ================================================================
-- PART 2: Add Client Read Access to Workflows
-- ================================================================
-- Allow clients to view their own workflows (read-only)
CREATE POLICY "Clients can view their own workflows"
  ON public.workflows
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.client_id = workflows.client_id
        AND has_role(auth.uid(), 'client'::app_role)
    )
  );

-- ================================================================
-- PART 3: Update Workflows UPDATE Policy
-- ================================================================
-- Drop existing policy
DROP POLICY IF EXISTS "Staff can update workflows for their clients" ON public.workflows;

-- Create enhanced policy that includes direct job assignment
CREATE POLICY "Staff and assigned users can update workflows"
  ON public.workflows
  FOR UPDATE
  USING (
    -- Admins and managers can update all
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    -- Accountants assigned to the specific workflow can update
    OR auth.uid() = workflows.assigned_to
    -- Staff assigned to the client can update
    OR EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = workflows.client_id
      AND (
        auth.uid() = assigned_owner_id
        OR auth.uid() = assigned_accountant_id
      )
    )
  );

-- ================================================================
-- PART 4: Add DELETE Policy for Workflows
-- ================================================================
-- Only admins can delete workflows
CREATE POLICY "Admins can delete workflows"
  ON public.workflows
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- ================================================================
-- PART 5: Add DELETE Policy for Workflow Templates
-- ================================================================
-- Only admins can delete workflow templates
CREATE POLICY "Admins can delete templates"
  ON public.workflow_templates
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- ================================================================
-- PART 6: Add DELETE Policy for Workflow Stages
-- ================================================================
-- Only admins can delete workflow stages
CREATE POLICY "Admins can delete stages"
  ON public.workflow_stages
  FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- ================================================================
-- Verification Comments
-- ================================================================
-- After this migration:
-- ✓ Clients can view their jobs (workflows) via client_id
-- ✓ Clients cannot edit or delete jobs
-- ✓ Accountants assigned to a job (assigned_to) can update it
-- ✓ Accountants assigned to a client can view/update all client jobs
-- ✓ Managers can view/update all jobs
-- ✓ Admins have full CRUD access
-- ✓ Reviewers can view jobs but not edit them
-- ✓ Only admins can delete workflows, templates, and stages
-- ✓ Stage history cannot be deleted (no DELETE policy = audit protection)
-- ================================================================