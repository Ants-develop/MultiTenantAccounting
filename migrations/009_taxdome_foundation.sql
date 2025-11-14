-- TaxDome Foundation Schema
-- Migration: 009_taxdome_foundation.sql
-- Description: Create tables for TaxDome-style practice management system (Tasks, Workflows, Calendar, Messaging)
-- Date: 2025-01-XX

-- UP
-- Create TaxDome foundation tables

-- =====================================================
-- Table 1: workspaces
-- Multi-tenant organizations (extend existing clients concept)
-- =====================================================
CREATE TABLE IF NOT EXISTS workspaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE, -- Link to existing clients table
    plan VARCHAR(50) DEFAULT 'standard',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_client_id ON workspaces(client_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_code ON workspaces(code);

COMMENT ON TABLE workspaces IS 'Multi-tenant organizations for TaxDome-style system';

-- =====================================================
-- Table 2: pipelines
-- Workflow templates with stages (JSONB for flexibility)
-- =====================================================
CREATE TABLE IF NOT EXISTS pipelines (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stages JSONB NOT NULL, -- Array of stage objects: [{id, name, order, taskTemplates: [...]}]
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipelines_workspace_id ON pipelines(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_created_by ON pipelines(created_by);

COMMENT ON TABLE pipelines IS 'Reusable workflow templates with stages and task templates';
COMMENT ON COLUMN pipelines.stages IS 'JSONB array of stage definitions with task templates';

-- =====================================================
-- Table 3: jobs
-- Work items (cases) created from pipelines
-- =====================================================
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    pipeline_id INTEGER REFERENCES pipelines(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL, -- Link to client
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, cancelled, on_hold
    current_stage VARCHAR(100), -- Current stage ID from pipeline
    metadata JSONB, -- Additional flexible data
    matrix_room_id VARCHAR(255), -- Matrix room ID for chat
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_workspace_id ON jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_jobs_pipeline_id ON jobs(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON jobs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_matrix_room_id ON jobs(matrix_room_id);

COMMENT ON TABLE jobs IS 'Work items (cases) created from pipelines, e.g., "2024 Tax Return"';
COMMENT ON COLUMN jobs.metadata IS 'JSONB for flexible additional data storage';

-- =====================================================
-- Table 4: tasks
-- Actionable items with assignments, due dates, priority
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'todo', -- todo, in_progress, done, cancelled, blocked
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    due_date TIMESTAMP,
    start_date TIMESTAMP,
    completed_at TIMESTAMP,
    recurrence JSONB, -- Recurrence pattern: {type: 'daily'|'weekly'|'monthly', interval: number, endDate: date}
    matrix_room_id VARCHAR(255), -- Matrix room ID for chat
    metadata JSONB, -- Additional flexible data
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_job_id ON tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reporter_id ON tasks(reporter_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_matrix_room_id ON tasks(matrix_room_id);

COMMENT ON TABLE tasks IS 'Actionable items with assignments, due dates, and priority';
COMMENT ON COLUMN tasks.recurrence IS 'JSONB recurrence pattern for repeating tasks';

-- =====================================================
-- Table 5: subtasks
-- Checklist items within tasks
-- =====================================================
CREATE TABLE IF NOT EXISTS subtasks (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    done BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_done ON subtasks(done);

COMMENT ON TABLE subtasks IS 'Checklist items within tasks';

-- =====================================================
-- Table 6: events
-- Calendar events (meetings, deadlines)
-- =====================================================
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start TIMESTAMP NOT NULL,
    "end" TIMESTAMP NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    related_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    related_job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
    matrix_room_id VARCHAR(255), -- Matrix room ID for chat
    location VARCHAR(255),
    is_all_day BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_workspace_id ON events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_events_owner_id ON events(owner_id);
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start);
CREATE INDEX IF NOT EXISTS idx_events_end ON events("end");
CREATE INDEX IF NOT EXISTS idx_events_related_task_id ON events(related_task_id);
CREATE INDEX IF NOT EXISTS idx_events_related_job_id ON events(related_job_id);
CREATE INDEX IF NOT EXISTS idx_events_matrix_room_id ON events(matrix_room_id);

COMMENT ON TABLE events IS 'Calendar events (meetings, deadlines)';
COMMENT ON COLUMN events."end" IS 'End timestamp (end is a reserved word, quoted)';

-- =====================================================
-- Table 7: automations
-- Automation rules (triggers + actions as JSONB)
-- =====================================================
CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL, -- job.stage_entered, task.completed, task.overdue, task.assigned
    trigger_config JSONB NOT NULL, -- Trigger-specific configuration
    actions JSONB NOT NULL, -- Array of actions: [{type: 'create_task'|'send_message'|'update_status', config: {...}}]
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automations_workspace_id ON automations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_automations_trigger_type ON automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automations_is_active ON automations(is_active);

COMMENT ON TABLE automations IS 'Automation rules with triggers and actions';
COMMENT ON COLUMN automations.trigger_config IS 'JSONB trigger-specific configuration';
COMMENT ON COLUMN automations.actions IS 'JSONB array of action definitions';

-- =====================================================
-- Table 8: activity_log
-- Comprehensive audit trail
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL, -- task.created, task.updated, job.stage_changed, etc.
    target_type VARCHAR(50) NOT NULL, -- task, job, pipeline, event, automation
    target_id INTEGER NOT NULL,
    payload JSONB, -- Additional context data
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id ON activity_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_target_type ON activity_log(target_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_target_id ON activity_log(target_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

COMMENT ON TABLE activity_log IS 'Comprehensive audit trail for all system activities';

-- =====================================================
-- Add matrix_id to users table for Matrix integration
-- =====================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS matrix_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_users_matrix_id ON users(matrix_id);

COMMENT ON COLUMN users.matrix_id IS 'Matrix user ID for messaging integration';

-- =====================================================
-- Create trigger function for auto-updating updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER pipelines_updated_at BEFORE UPDATE ON pipelines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER subtasks_updated_at BEFORE UPDATE ON subtasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER automations_updated_at BEFORE UPDATE ON automations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- DOWN
-- Drop TaxDome foundation tables and related objects

-- Drop triggers first
DROP TRIGGER IF EXISTS workspaces_updated_at ON workspaces;
DROP TRIGGER IF EXISTS pipelines_updated_at ON pipelines;
DROP TRIGGER IF EXISTS jobs_updated_at ON jobs;
DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS subtasks_updated_at ON subtasks;
DROP TRIGGER IF EXISTS events_updated_at ON events;
DROP TRIGGER IF EXISTS automations_updated_at ON automations;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS automations;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS subtasks;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS pipelines;
DROP TABLE IF EXISTS workspaces;

-- Remove matrix_id column from users (if it exists)
ALTER TABLE users DROP COLUMN IF EXISTS matrix_id;
DROP INDEX IF EXISTS idx_users_matrix_id;

