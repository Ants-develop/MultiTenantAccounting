-- Migration: Remove old tasks and chat modules
-- Description: Drop tables from old task and chat implementations to prepare for fresh TaxDome-style implementation
-- Date: 2025-01-XX

-- UP
-- Drop old tasks and chat tables

-- Drop foreign key constraints first
ALTER TABLE IF EXISTS task_comments DROP CONSTRAINT IF EXISTS task_comments_task_id_fkey;
ALTER TABLE IF EXISTS task_attachments DROP CONSTRAINT IF EXISTS task_attachments_task_id_fkey;
ALTER TABLE IF EXISTS chat_channel_members DROP CONSTRAINT IF EXISTS chat_channel_members_channel_id_fkey;
ALTER TABLE IF EXISTS chat_channel_members DROP CONSTRAINT IF EXISTS chat_channel_members_user_id_fkey;
ALTER TABLE IF EXISTS chat_messages DROP CONSTRAINT IF EXISTS chat_messages_channel_id_fkey;
ALTER TABLE IF EXISTS chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;

-- Drop indexes
DROP INDEX IF EXISTS idx_tasks_assignee_id;
DROP INDEX IF EXISTS idx_tasks_reporter_id;
DROP INDEX IF EXISTS idx_tasks_status;
DROP INDEX IF EXISTS idx_tasks_priority;
DROP INDEX IF EXISTS idx_task_comments_task_id;
DROP INDEX IF EXISTS idx_task_attachments_task_id;
DROP INDEX IF EXISTS idx_chat_channels_company_id;
DROP INDEX IF EXISTS idx_chat_channels_created_by;
DROP INDEX IF EXISTS idx_chat_messages_channel_id;
DROP INDEX IF EXISTS idx_chat_messages_user_id;
DROP INDEX IF EXISTS idx_chat_channel_members_channel_user;

-- Drop tables
DROP TABLE IF EXISTS task_attachments;
DROP TABLE IF EXISTS task_comments;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS chat_channel_members;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_channels;

-- Note: This migration removes the old implementations.
-- New TaxDome-style tables will be created in migration 009_taxdome_foundation.sql

-- DOWN
-- Recreate old tasks and chat tables (for rollback - not recommended, but included for completeness)
-- Note: This is a destructive migration. Rollback will not restore data, only schema.
-- Schema matches migrations 004_chat_module.sql and 005_tasks_module.sql

-- Tasks Table (from 005_tasks_module.sql)
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date DATE,
    created_by INTEGER NOT NULL REFERENCES users(id),
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Task Comments Table
CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);

-- Task Attachments Table
CREATE TABLE IF NOT EXISTS task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON task_attachments(uploaded_by);

-- Chat Channels Table (from 004_chat_module.sql)
CREATE TABLE IF NOT EXISTS chat_channels (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT false,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_client_id ON chat_channels(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_is_private ON chat_channels(is_private);
CREATE INDEX IF NOT EXISTS idx_chat_channels_created_by ON chat_channels(created_by);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_deleted ON chat_messages(is_deleted);

-- Chat Channel Members Table
CREATE TABLE IF NOT EXISTS chat_channel_members (
    channel_id INTEGER NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    last_read_at TIMESTAMP,
    PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user_id ON chat_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_channel_id ON chat_channel_members(channel_id);
