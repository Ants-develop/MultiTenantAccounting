-- =====================================================
-- Migration 012: Task System Enhancements
-- =====================================================
-- This migration enhances the tasks table with:
-- - Recurring task support
-- - Task dependencies
-- - SLA settings
-- - Multiple assignees (many-to-many)

-- UP
-- =====================================================
-- Add columns to tasks table
-- =====================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sla_due_date TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sla_priority VARCHAR(50);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS depends_on_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_end_date ON tasks(recurrence_end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_sla_due_date ON tasks(sla_due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_depends_on_task_id ON tasks(depends_on_task_id);

COMMENT ON COLUMN tasks.recurrence_pattern IS 'JSON object for recurrence: {frequency: "monthly|quarterly|annual", interval: number, daysOfWeek: [], dayOfMonth: number}';
COMMENT ON COLUMN tasks.recurrence_end_date IS 'When recurring task generation should stop';
COMMENT ON COLUMN tasks.sla_due_date IS 'SLA-based due date (calculated from priority and creation date)';
COMMENT ON COLUMN tasks.sla_priority IS 'SLA priority level for calculating due dates';
COMMENT ON COLUMN tasks.depends_on_task_id IS 'Task that must be completed before this task can start';

-- =====================================================
-- Table: task_assignments (many-to-many)
-- =====================================================
CREATE TABLE IF NOT EXISTS task_assignments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('assignee', 'reviewer', 'watcher')),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(task_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_role ON task_assignments(role);

COMMENT ON TABLE task_assignments IS 'Many-to-many relationship for task assignments with roles';
COMMENT ON COLUMN task_assignments.role IS 'Role: assignee (works on task), reviewer (reviews work), watcher (receives updates)';

-- =====================================================
-- Table: checklist_templates
-- =====================================================
CREATE TABLE IF NOT EXISTS checklist_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- e.g., 'onboarding', 'monthly_close', 'tax_prep'
    items JSONB NOT NULL, -- Array of items with conditions
    is_client_facing BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_checklist_templates_category ON checklist_templates(category);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_is_active ON checklist_templates(is_active);

COMMENT ON TABLE checklist_templates IS 'Reusable checklist templates';
COMMENT ON COLUMN checklist_templates.items IS 'JSON array: [{title, description, required, condition: {type, field, value}}]';
COMMENT ON COLUMN checklist_templates.is_client_facing IS 'Whether clients can see this checklist in portal';

-- =====================================================
-- Table: client_checklists
-- =====================================================
CREATE TABLE IF NOT EXISTS client_checklists (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES checklist_templates(id) ON DELETE SET NULL,
    items JSONB NOT NULL, -- Checklist items with completion status
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'archived')),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_checklists_client_id ON client_checklists(client_id);
CREATE INDEX IF NOT EXISTS idx_client_checklists_template_id ON client_checklists(template_id);
CREATE INDEX IF NOT EXISTS idx_client_checklists_status ON client_checklists(status);

COMMENT ON TABLE client_checklists IS 'Client-specific checklists (can be from template or custom)';
COMMENT ON COLUMN client_checklists.items IS 'JSON array: [{title, description, done: boolean, completedAt: timestamp}]';

-- =====================================================
-- Create trigger function for auto-updating updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_task_enhancements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER checklist_templates_updated_at BEFORE UPDATE ON checklist_templates
    FOR EACH ROW EXECUTE FUNCTION update_task_enhancements_updated_at();

CREATE TRIGGER client_checklists_updated_at BEFORE UPDATE ON client_checklists
    FOR EACH ROW EXECUTE FUNCTION update_task_enhancements_updated_at();

-- DOWN
-- =====================================================
-- Drop triggers first
-- =====================================================
DROP TRIGGER IF EXISTS client_checklists_updated_at ON client_checklists;
DROP TRIGGER IF EXISTS checklist_templates_updated_at ON checklist_templates;

DROP FUNCTION IF EXISTS update_task_enhancements_updated_at();

-- =====================================================
-- Drop tables
-- =====================================================
DROP TABLE IF EXISTS client_checklists;
DROP TABLE IF EXISTS checklist_templates;
DROP TABLE IF EXISTS task_assignments;

-- =====================================================
-- Remove columns from tasks table
-- =====================================================
ALTER TABLE tasks DROP COLUMN IF EXISTS depends_on_task_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS sla_priority;
ALTER TABLE tasks DROP COLUMN IF EXISTS sla_due_date;
ALTER TABLE tasks DROP COLUMN IF EXISTS recurrence_end_date;
ALTER TABLE tasks DROP COLUMN IF EXISTS recurrence_pattern;

