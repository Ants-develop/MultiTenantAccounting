-- Add indexes for task management tables to improve query performance

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks.tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_template_id ON tasks.tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks.tasks(created_by);

-- Task checklists indexes
CREATE INDEX IF NOT EXISTS idx_task_checklists_task_id ON tasks.task_checklists(task_id);
CREATE INDEX IF NOT EXISTS idx_task_checklists_assigned_to ON tasks.task_checklists(assigned_to);

-- Task comments indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON tasks.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON tasks.task_comments(user_id);

-- Task attachments indexes
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON tasks.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON tasks.task_attachments(uploaded_by);

-- Task dependencies indexes
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON tasks.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON tasks.task_dependencies(depends_on);

-- Task templates indexes
CREATE INDEX IF NOT EXISTS idx_task_templates_client_id ON tasks.task_templates(client_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_created_by ON tasks.task_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_task_templates_is_public ON tasks.task_templates(is_public);

