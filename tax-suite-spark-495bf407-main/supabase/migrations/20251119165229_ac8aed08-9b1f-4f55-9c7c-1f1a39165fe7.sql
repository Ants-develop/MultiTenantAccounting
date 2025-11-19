-- Phase 1B: Populate Default Workflow Templates and Stages

-- =====================================================
-- POPULATE DEFAULT WORKFLOW STAGES
-- =====================================================

DO $$
DECLARE
  v_monthly_bookkeeping_id UUID;
  v_vat_return_id UUID;
  v_payroll_id UUID;
  v_annual_fs_id UUID;
  v_admin_id UUID;
BEGIN
  -- Get admin user ID (first admin user)
  SELECT user_id INTO v_admin_id
  FROM public.user_roles
  WHERE role = 'admin'
  LIMIT 1;

  -- If no admin found, use first user with any role
  IF v_admin_id IS NULL THEN
    SELECT user_id INTO v_admin_id
    FROM public.user_roles
    LIMIT 1;
  END IF;

  -- =====================================================
  -- 1. MONTHLY BOOKKEEPING TEMPLATE & STAGES
  -- =====================================================
  
  -- Create or get Monthly Bookkeeping Template
  INSERT INTO public.workflow_templates (name, type, description, estimated_duration_days, is_active, created_by)
  VALUES (
    'Monthly Bookkeeping',
    'monthly_bookkeeping'::workflow_template_type,
    'Standard monthly bookkeeping workflow for recurring clients',
    15,
    true,
    v_admin_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_monthly_bookkeeping_id;

  -- Get existing template if insert was skipped
  IF v_monthly_bookkeeping_id IS NULL THEN
    SELECT id INTO v_monthly_bookkeeping_id
    FROM public.workflow_templates
    WHERE type = 'monthly_bookkeeping'::workflow_template_type
    LIMIT 1;
  END IF;

  -- Create stages for Monthly Bookkeeping
  IF v_monthly_bookkeeping_id IS NOT NULL THEN
    INSERT INTO public.workflow_stages (template_id, name, description, order_position, color, automation_rules)
    VALUES
      (v_monthly_bookkeeping_id, 'Planned', 'Job scheduled and planned', 1, '#94a3b8', '{"auto_create_tasks": false}'::jsonb),
      (v_monthly_bookkeeping_id, 'Waiting for Documents', 'Waiting for client to provide documents', 2, '#f59e0b', '{"auto_create_tasks": true, "send_client_reminder": true}'::jsonb),
      (v_monthly_bookkeeping_id, 'Bookkeeping in Progress', 'Accountant working on bookkeeping', 3, '#3b82f6', '{"auto_create_tasks": true, "assign_to_accountant": true}'::jsonb),
      (v_monthly_bookkeeping_id, 'Manager Review', 'Manager reviewing completed work', 4, '#8b5cf6', '{"auto_create_tasks": true, "assign_to_manager": true}'::jsonb),
      (v_monthly_bookkeeping_id, 'Completed', 'Job completed successfully', 5, '#10b981', '{"auto_create_tasks": false, "send_completion_notification": true}'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =====================================================
  -- 2. MONTHLY VAT RETURN TEMPLATE & STAGES
  -- =====================================================
  
  -- Create or get Monthly VAT Return Template
  INSERT INTO public.workflow_templates (name, type, description, estimated_duration_days, is_active, created_by)
  VALUES (
    'Monthly VAT Return',
    'vat_return'::workflow_template_type,
    'Monthly VAT return preparation and filing',
    10,
    true,
    v_admin_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_vat_return_id;

  IF v_vat_return_id IS NULL THEN
    SELECT id INTO v_vat_return_id
    FROM public.workflow_templates
    WHERE type = 'vat_return'::workflow_template_type
    LIMIT 1;
  END IF;

  -- Create stages for VAT Return
  IF v_vat_return_id IS NOT NULL THEN
    INSERT INTO public.workflow_stages (template_id, name, description, order_position, color, automation_rules)
    VALUES
      (v_vat_return_id, 'Planned', 'VAT return scheduled', 1, '#94a3b8', '{"auto_create_tasks": false}'::jsonb),
      (v_vat_return_id, 'Data Collection', 'Collecting invoices and data', 2, '#f59e0b', '{"auto_create_tasks": true, "send_client_reminder": true}'::jsonb),
      (v_vat_return_id, 'VAT Calculation', 'Calculating VAT amounts', 3, '#3b82f6', '{"auto_create_tasks": true}'::jsonb),
      (v_vat_return_id, 'Review & Approval', 'Manager review and approval', 4, '#8b5cf6', '{"auto_create_tasks": true, "assign_to_manager": true}'::jsonb),
      (v_vat_return_id, 'Submitted', 'VAT return filed with authorities', 5, '#10b981', '{"auto_create_tasks": false, "send_completion_notification": true}'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =====================================================
  -- 3. MONTHLY PAYROLL TEMPLATE & STAGES
  -- =====================================================
  
  -- Create or get Payroll Template
  INSERT INTO public.workflow_templates (name, type, description, estimated_duration_days, is_active, created_by)
  VALUES (
    'Monthly Payroll',
    'payroll'::workflow_template_type,
    'Monthly payroll processing workflow',
    7,
    true,
    v_admin_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_payroll_id;

  IF v_payroll_id IS NULL THEN
    SELECT id INTO v_payroll_id
    FROM public.workflow_templates
    WHERE type = 'payroll'::workflow_template_type
    LIMIT 1;
  END IF;

  -- Create stages for Payroll
  IF v_payroll_id IS NOT NULL THEN
    INSERT INTO public.workflow_stages (template_id, name, description, order_position, color, automation_rules)
    VALUES
      (v_payroll_id, 'Planned', 'Payroll cycle scheduled', 1, '#94a3b8', '{"auto_create_tasks": false}'::jsonb),
      (v_payroll_id, 'Data Collection', 'Collecting timesheets and data', 2, '#f59e0b', '{"auto_create_tasks": true, "send_client_reminder": true}'::jsonb),
      (v_payroll_id, 'Payroll Processing', 'Processing payroll calculations', 3, '#3b82f6', '{"auto_create_tasks": true}'::jsonb),
      (v_payroll_id, 'Review & Approval', 'Manager review before submission', 4, '#8b5cf6', '{"auto_create_tasks": true, "assign_to_manager": true}'::jsonb),
      (v_payroll_id, 'Submitted', 'Payroll submitted and payments made', 5, '#10b981', '{"auto_create_tasks": false, "send_completion_notification": true}'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

  -- =====================================================
  -- 4. ANNUAL FINANCIAL STATEMENTS TEMPLATE & STAGES
  -- =====================================================
  
  -- Create or get Annual FS Template
  INSERT INTO public.workflow_templates (name, type, description, estimated_duration_days, is_active, created_by)
  VALUES (
    'Annual Financial Statements',
    'annual_financials'::workflow_template_type,
    'Annual financial statements preparation (IFRS for SMEs)',
    45,
    true,
    v_admin_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_annual_fs_id;

  IF v_annual_fs_id IS NULL THEN
    SELECT id INTO v_annual_fs_id
    FROM public.workflow_templates
    WHERE type = 'annual_financials'::workflow_template_type
    LIMIT 1;
  END IF;

  -- Create stages for Annual FS
  IF v_annual_fs_id IS NOT NULL THEN
    INSERT INTO public.workflow_stages (template_id, name, description, order_position, color, automation_rules)
    VALUES
      (v_annual_fs_id, 'Planned', 'Annual FS project scheduled', 1, '#94a3b8', '{"auto_create_tasks": false}'::jsonb),
      (v_annual_fs_id, 'Data Preparation', 'Gathering and preparing year-end data', 2, '#f59e0b', '{"auto_create_tasks": true}'::jsonb),
      (v_annual_fs_id, 'Statement Preparation', 'Preparing financial statements', 3, '#3b82f6', '{"auto_create_tasks": true}'::jsonb),
      (v_annual_fs_id, 'Manager Review', 'Manager review of statements', 4, '#8b5cf6', '{"auto_create_tasks": true, "assign_to_manager": true}'::jsonb),
      (v_annual_fs_id, 'Partner Review', 'Partner final review', 5, '#ec4899', '{"auto_create_tasks": true, "assign_to_partner": true}'::jsonb),
      (v_annual_fs_id, 'Client Review', 'Client review and feedback', 6, '#f59e0b', '{"auto_create_tasks": false, "send_client_notification": true}'::jsonb),
      (v_annual_fs_id, 'Finalized', 'Financial statements finalized', 7, '#10b981', '{"auto_create_tasks": false, "send_completion_notification": true}'::jsonb)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;