-- =====================================================
-- Tasks/Workflows Module Migration
-- Schema: tasks
-- Description: TaxDome-style practice management - workspaces, pipelines, jobs, tasks, events, automations
-- =====================================================

-- UP
-- Create tasks schema and tables

CREATE SCHEMA IF NOT EXISTS tasks;

-- =====================================================
-- Workspaces Table
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks.workspaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    client_id INTEGER REFERENCES public.clients(id) ON DELETE CASCADE,
    plan VARCHAR(50) DEFAULT 'standard',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_client_id ON tasks.workspaces(client_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_code ON tasks.workspaces(code);

COMMENT ON TABLE tasks.workspaces IS 'Multi-tenant organizations for TaxDome-style system';

-- =====================================================
-- Pipelines Table
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks.pipelines (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES tasks.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stages JSONB NOT NULL, -- Array of stage objects: [{id, name, order, taskTemplates: [...]}]
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipelines_workspace_id ON tasks.pipelines(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_created_by ON tasks.pipelines(created_by);

COMMENT ON TABLE tasks.pipelines IS 'Reusable workflow templates with stages and task templates';
COMMENT ON COLUMN tasks.pipelines.stages IS 'JSONB array of stage definitions with task templates';

-- =====================================================
-- Jobs Table
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks.jobs (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES tasks.workspaces(id) ON DELETE CASCADE,
    pipeline_id INTEGER REFERENCES tasks.pipelines(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES public.clients(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, cancelled, on_hold
    current_stage VARCHAR(100), -- Current stage ID from pipeline
    metadata JSONB, -- Additional flexible data
    matrix_room_id VARCHAR(255), -- Matrix room ID for chat
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_workspace_id ON tasks.jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_jobs_pipeline_id ON tasks.jobs(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON tasks.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON tasks.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON tasks.jobs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON tasks.jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_matrix_room_id ON tasks.jobs(matrix_room_id);

COMMENT ON TABLE tasks.jobs IS 'Work items (cases) created from pipelines, e.g., "2024 Tax Return"';
COMMENT ON COLUMN tasks.jobs.metadata IS 'JSONB for flexible additional data storage';

-- =====================================================
-- Tasks Table
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks.tasks (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES tasks.workspaces(id) ON DELETE CASCADE,
    job_id INTEGER REFERENCES tasks.jobs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo', -- todo, in_progress, done, cancelled, blocked
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    assignee_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    reporter_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    due_date TIMESTAMP,
    start_date TIMESTAMP,
    completed_at TIMESTAMP,
    recurrence JSONB, -- Recurrence pattern (legacy)
    recurrence_pattern JSONB, -- JSON object for recurrence: {frequency, interval, daysOfWeek, dayOfMonth}
    recurrence_end_date TIMESTAMP, -- When recurring task generation should stop
    sla_due_date TIMESTAMP, -- SLA-based due date
    sla_priority VARCHAR(50), -- SLA priority level
    depends_on_task_id INTEGER REFERENCES tasks.tasks(id) ON DELETE SET NULL, -- Task dependency
    matrix_room_id VARCHAR(255), -- Matrix room ID for chat
    metadata JSONB, -- Additional flexible data
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_job_id ON tasks.tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reporter_id ON tasks.tasks(reporter_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_matrix_room_id ON tasks.tasks(matrix_room_id);
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_end_date ON tasks.tasks(recurrence_end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_sla_due_date ON tasks.tasks(sla_due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_depends_on_task_id ON tasks.tasks(depends_on_task_id);

COMMENT ON TABLE tasks.tasks IS 'Actionable items with assignments, due dates, and priority';
COMMENT ON COLUMN tasks.tasks.recurrence_pattern IS 'JSONB recurrence pattern for repeating tasks';

-- =====================================================
-- Task Assignments Table (Many-to-Many)
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks.task_assignments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('assignee', 'reviewer', 'watcher')),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    UNIQUE(task_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON tasks.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON tasks.task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_role ON tasks.task_assignments(role);

COMMENT ON TABLE tasks.task_assignments IS 'Many-to-many relationship for task assignments with roles';
COMMENT ON COLUMN tasks.task_assignments.role IS 'Role: assignee (works on task), reviewer (reviews work), watcher (receives updates)';

-- =====================================================
-- Subtasks Table
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks.subtasks (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks.tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    done BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON tasks.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_done ON tasks.subtasks(done);

COMMENT ON TABLE tasks.subtasks IS 'Checklist items within tasks';

-- =====================================================
-- Events Table (Calendar)
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks.events (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES tasks.workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start TIMESTAMP NOT NULL,
    "end" TIMESTAMP NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    owner_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    related_task_id INTEGER REFERENCES tasks.tasks(id) ON DELETE SET NULL,
    related_job_id INTEGER REFERENCES tasks.jobs(id) ON DELETE SET NULL,
    matrix_room_id VARCHAR(255), -- Matrix room ID for chat
    location VARCHAR(255),
    is_all_day BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_workspace_id ON tasks.events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_events_owner_id ON tasks.events(owner_id);
CREATE INDEX IF NOT EXISTS idx_events_start ON tasks.events(start);
CREATE INDEX IF NOT EXISTS idx_events_end ON tasks.events("end");
CREATE INDEX IF NOT EXISTS idx_events_related_task_id ON tasks.events(related_task_id);
CREATE INDEX IF NOT EXISTS idx_events_related_job_id ON tasks.events(related_job_id);
CREATE INDEX IF NOT EXISTS idx_events_matrix_room_id ON tasks.events(matrix_room_id);

COMMENT ON TABLE tasks.events IS 'Calendar events (meetings, deadlines)';
COMMENT ON COLUMN tasks.events."end" IS 'End timestamp (end is a reserved word, quoted)';

-- =====================================================
-- Automations Table
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks.automations (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES tasks.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL, -- job.stage_entered, task.completed, task.overdue, task.assigned
    trigger_config JSONB NOT NULL, -- Trigger-specific configuration
    actions JSONB NOT NULL, -- Array of actions: [{type: 'create_task'|'send_message'|'update_status', config: {...}}]
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automations_workspace_id ON tasks.automations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_automations_trigger_type ON tasks.automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automations_is_active ON tasks.automations(is_active);

COMMENT ON TABLE tasks.automations IS 'Automation rules with triggers and actions';
COMMENT ON COLUMN tasks.automations.trigger_config IS 'JSONB trigger-specific configuration';
COMMENT ON COLUMN tasks.automations.actions IS 'JSONB array of action definitions';

-- =====================================================
-- Activity Log Table
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks.activity_log (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES tasks.workspaces(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL, -- task.created, task.updated, job.stage_changed, etc.
    target_type VARCHAR(50) NOT NULL, -- task, job, pipeline, event, automation
    target_id INTEGER NOT NULL,
    payload JSONB, -- Additional context data
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id ON tasks.activity_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON tasks.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON tasks.activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_target_type ON tasks.activity_log(target_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_target_id ON tasks.activity_log(target_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON tasks.activity_log(created_at);

COMMENT ON TABLE tasks.activity_log IS 'Comprehensive audit trail for all system activities';

-- =====================================================
-- Checklist Templates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks.checklist_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- e.g., 'onboarding', 'monthly_close', 'tax_prep'
    items JSONB NOT NULL, -- Array of items with conditions
    is_client_facing BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_checklist_templates_category ON tasks.checklist_templates(category);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_is_active ON tasks.checklist_templates(is_active);

COMMENT ON TABLE tasks.checklist_templates IS 'Reusable checklist templates';
COMMENT ON COLUMN tasks.checklist_templates.items IS 'JSON array: [{title, description, required, condition: {type, field, value}}]';
COMMENT ON COLUMN tasks.checklist_templates.is_client_facing IS 'Whether clients can see this checklist in portal';

-- =====================================================
-- Trigger Functions
-- =====================================================
CREATE OR REPLACE FUNCTION tasks.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Triggers
-- =====================================================
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON tasks.workspaces
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

CREATE TRIGGER pipelines_updated_at BEFORE UPDATE ON tasks.pipelines
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON tasks.jobs
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks.tasks
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

CREATE TRIGGER subtasks_updated_at BEFORE UPDATE ON tasks.subtasks
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

CREATE TRIGGER events_updated_at BEFORE UPDATE ON tasks.events
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

CREATE TRIGGER automations_updated_at BEFORE UPDATE ON tasks.automations
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

CREATE TRIGGER checklist_templates_updated_at BEFORE UPDATE ON tasks.checklist_templates
    FOR EACH ROW EXECUTE FUNCTION tasks.update_updated_at_column();

-- DOWN
-- Drop tasks module schema and related objects

DROP TRIGGER IF EXISTS checklist_templates_updated_at ON tasks.checklist_templates;
DROP TRIGGER IF EXISTS automations_updated_at ON tasks.automations;
DROP TRIGGER IF EXISTS events_updated_at ON tasks.events;
DROP TRIGGER IF EXISTS subtasks_updated_at ON tasks.subtasks;
DROP TRIGGER IF EXISTS tasks_updated_at ON tasks.tasks;
DROP TRIGGER IF EXISTS jobs_updated_at ON tasks.jobs;
DROP TRIGGER IF EXISTS pipelines_updated_at ON tasks.pipelines;
DROP TRIGGER IF EXISTS workspaces_updated_at ON tasks.workspaces;

DROP FUNCTION IF EXISTS tasks.update_updated_at_column();

DROP SCHEMA IF EXISTS tasks CASCADE;

