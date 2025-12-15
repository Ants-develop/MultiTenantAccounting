# Database Schema Verification Report

**Date:** 2024-12-XX  
**Purpose:** Verify Supabase database schema matches requirements for new workflow/task components

---

## ✅ VERIFIED: Core Tables Exist

### 1. `workflow_templates` Table
**Location:** `supabase/migrations/20251214210200_create_workflow_task_tables.sql`

```sql
CREATE TABLE public.workflow_templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT, -- 'onboarding', 'monthly_close', etc.
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```
**Status:** ✅ Complete

---

### 2. `workflow_stages` Table
**Location:** `supabase/migrations/20251214210200_create_workflow_task_tables.sql`

```sql
CREATE TABLE public.workflow_stages (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES workflow_templates(id),
  name TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL,
  color TEXT,  -- ✅ PRESENT
  created_at TIMESTAMP
);
```
**Status:** ✅ Complete - includes `color` column required by PipelineCard

---

### 3. `workflows` Table
**Location:** `supabase/migrations/20251214210200_create_workflow_task_tables.sql`

```sql
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY,
  template_id UUID REFERENCES workflow_templates(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  name TEXT NOT NULL,
  current_stage_id UUID REFERENCES workflow_stages(id),
  status TEXT DEFAULT 'active',
  started_at TIMESTAMP DEFAULT NOW(),  -- ✅ PRESENT
  completed_at TIMESTAMP,              -- ✅ PRESENT
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```
**Status:** ✅ Complete - includes `started_at` and `completed_at` required by JobDetailsDrawer

---

### 4. `workflow_stage_history` Table
**Location:** `supabase/migrations/20251214210200_create_workflow_task_tables.sql`

```sql
CREATE TABLE public.workflow_stage_history (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  stage_id UUID NOT NULL REFERENCES workflow_stages(id),
  entered_at TIMESTAMP DEFAULT NOW(),
  exited_at TIMESTAMP,
  notes TEXT
);
```
**Status:** ✅ Complete - required by StageHistoryTimeline

**Indexes:**
- `idx_workflow_stage_history_workflow_id` on `workflow_id`

---

### 5. `tasks` Table
**Location:** `supabase/migrations/20251214210200_create_workflow_task_tables.sql`

```sql
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES clients(id),
  workflow_id UUID REFERENCES workflows(id),
  assigned_to UUID REFERENCES profiles(id),  -- ✅ PRESENT
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date TIMESTAMP,                        -- ✅ PRESENT
  completed_at TIMESTAMP,
  tags JSONB,
  metadata JSONB,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```
**Status:** ✅ Complete - includes `assigned_to` and `due_date` required by TaskDetailsDrawer

**Indexes:**
- `idx_tasks_workflow_id` on `workflow_id`
- `idx_tasks_assigned_to` on `assigned_to`
- `idx_tasks_due_date` on `due_date`
- `idx_tasks_status` on `status`

---

### 6. `profiles` Table
**Location:** Multiple migrations (core auth schema)

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,  -- ✅ PRESENT
  avatar_url TEXT,
  job_title TEXT,
  client_id UUID REFERENCES clients(id),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```
**Status:** ✅ Complete - includes `full_name` required by all components

---

## ❌ MISSING: Enhanced Workflow Columns

### Issue: Missing Analytics & Assignment Fields on `workflows`

**Required by:** WorkflowAnalyticsDashboard, reference implementation

**Missing Columns:**
1. `service_type` TEXT - Required for analytics grouping
2. `assigned_to` UUID - Required for team workload analysis  
3. `due_date` TIMESTAMP - Required for overdue calculations

**Found in Reference Implementation:**
`tax-suite-spark-495bf407/supabase/migrations/20251119165149_a5e82bb2-7602-48dc-b4c3-894b0b35e7e3.sql`

```sql
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS service_type TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_workflows_service ON public.workflows(service_type);
CREATE INDEX IF NOT EXISTS idx_workflows_assigned ON public.workflows(assigned_to);
```

---

## ❌ MISSING: Enhanced History Tracking

### Issue: Missing `entered_by` Column on `workflow_stage_history`

**Required by:** StageHistoryTimeline (shows who made each transition)

**Current Schema:**
```sql
CREATE TABLE public.workflow_stage_history (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL,
  stage_id UUID NOT NULL,
  entered_at TIMESTAMP,
  exited_at TIMESTAMP,
  notes TEXT
);
```

**Expected by Component:**
```typescript
.select(`
  *,
  entered_by_user:profiles!workflow_stage_history_entered_by_fkey(id, full_name)
`)
```

**Missing:**
- `entered_by` UUID REFERENCES profiles(id) - FK to profiles table
- Foreign key constraint: `workflow_stage_history_entered_by_fkey`

**Found in Reference Implementation:**
`tax-suite-spark-495bf407/supabase/migrations/20251119165149_a5e82bb2-7602-48dc-b4c3-894b0b35e7e3.sql`

```sql
CREATE TABLE IF NOT EXISTS public.workflow_stage_history (
  ...
  entered_by UUID REFERENCES public.profiles(id),
  ...
);
```

---

## 🔧 Required Migration Script

### Migration: Add Missing Workflow Columns

**File:** `supabase/migrations/20251215220000_add_workflow_analytics_columns.sql`

```sql
-- =====================================================
-- ADD MISSING ANALYTICS COLUMNS TO WORKFLOWS
-- Required by WorkflowAnalyticsDashboard
-- =====================================================

-- Add service_type for categorization
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS service_type TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_service_type ON public.workflows(service_type);
CREATE INDEX IF NOT EXISTS idx_workflows_assigned_to ON public.workflows(assigned_to);
CREATE INDEX IF NOT EXISTS idx_workflows_due_date ON public.workflows(due_date);

-- Add entered_by to stage history
ALTER TABLE public.workflow_stage_history
  ADD COLUMN IF NOT EXISTS entered_by UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_workflow_stage_history_entered_by ON public.workflow_stage_history(entered_by);

COMMENT ON COLUMN public.workflows.service_type IS 'Type of service: monthly_bookkeeping, vat_return, payroll, tax_return, etc.';
COMMENT ON COLUMN public.workflows.assigned_to IS 'Primary accountant assigned to this workflow job';
COMMENT ON COLUMN public.workflows.due_date IS 'Deadline for workflow completion';
COMMENT ON COLUMN public.workflow_stage_history.entered_by IS 'User who transitioned the workflow to this stage';
```

---

## 📋 Verification Summary

### ✅ **Tables Present (6/6)**
- workflow_templates
- workflow_stages
- workflows
- workflow_stage_history
- tasks
- profiles

### ✅ **Core Columns Present**
- workflows.started_at
- workflows.completed_at
- workflow_stages.color
- tasks.assigned_to
- tasks.due_date
- profiles.full_name

### ❌ **Missing Columns (4)**
1. workflows.service_type
2. workflows.assigned_to
3. workflows.due_date
4. workflow_stage_history.entered_by

---

## 🚀 Next Steps

### 1. **Apply Migration** (Required)
```bash
# Navigate to Supabase dashboard or run via CLI
psql $DATABASE_URL -f supabase/migrations/20251215220000_add_workflow_analytics_columns.sql
```

### 2. **Verify in Supabase Dashboard**
- Table Editor → workflows → Check columns: service_type, assigned_to, due_date
- Table Editor → workflow_stage_history → Check column: entered_by

### 3. **Update RLS Policies** (If Needed)
Ensure new columns are accessible by existing RLS policies:
```sql
-- Check workflow policies allow access to new columns
SELECT * FROM pg_policies WHERE tablename = 'workflows';
```

### 4. **Test Components**
- StageHistoryTimeline: Verify entered_by user names display
- WorkflowAnalyticsDashboard: Verify analytics load without errors
- JobDetailsDrawer: Verify assigned user and due date display

---

## 🎯 Component Impact Analysis

### **Without Migration (Current State):**
- ❌ StageHistoryTimeline: Will error on `entered_by_user` join
- ❌ WorkflowAnalyticsDashboard: Missing data for service_type, assigned_to filters
- ⚠️ JobDetailsDrawer: Works but missing assignment/due date display
- ✅ PipelineList: Fully functional
- ✅ TaskDetailsDrawer: Fully functional

### **After Migration:**
- ✅ All components fully functional
- ✅ Complete audit trail with user tracking
- ✅ Full analytics capabilities
- ✅ Team workload distribution visible

---

## 📝 Notes

1. **Backward Compatibility:** Migration uses `ADD COLUMN IF NOT EXISTS` - safe to run multiple times
2. **NULL Values:** New columns will be NULL for existing rows - consider backfilling if needed
3. **RLS Policies:** Existing policies should automatically cover new columns (same table)
4. **Indexes:** Added for performance on filter/sort operations

---

## ✅ Verification Checklist

- [x] All 6 core tables exist in schema
- [x] workflow_stages has `color` column
- [x] workflows has `started_at`, `completed_at` columns
- [x] tasks has `assigned_to`, `due_date` columns
- [x] profiles has `full_name` column
- [ ] **TODO:** workflows has `service_type`, `assigned_to`, `due_date` columns
- [ ] **TODO:** workflow_stage_history has `entered_by` column
- [ ] **TODO:** Foreign key constraint `workflow_stage_history_entered_by_fkey` exists
- [ ] **TODO:** Indexes created for new columns

**Status:** Ready for migration - 4 columns need to be added.
