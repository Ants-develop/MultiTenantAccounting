-- =====================================================
-- Authorization System - Phase 1: Create Tables
-- Migration: 0020_authorization_system.sql
-- Description: Creates new role-based permission system
-- =====================================================

-- UP

-- 1. Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    scope TEXT NOT NULL CHECK (scope IN ('global', 'client', 'custom')),
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(resource, action)
);

-- 3. Role-Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- 4. User-specific permissions (overrides)
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    is_granted BOOLEAN DEFAULT TRUE,
    granted_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, client_id, permission_id)
);

-- 5. User-Client-Role mapping (replaces user_companies)
CREATE TABLE IF NOT EXISTS user_client_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, client_id, role_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_client ON user_permissions(client_id);
CREATE INDEX IF NOT EXISTS idx_user_client_roles_user ON user_client_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_client_roles_client ON user_client_roles(client_id);
CREATE INDEX IF NOT EXISTS idx_user_client_roles_active ON user_client_roles(is_active);

-- Seed system roles
INSERT INTO roles (name, description, scope, is_system) VALUES
('global_administrator', 'Full system access across all clients', 'global', TRUE),
('client_administrator', 'Full access within assigned client companies', 'client', TRUE),
('accountant', 'Accounting module access with full CRUD', 'client', TRUE),
('auditor', 'Read-only audit and accounting access', 'client', TRUE),
('manager', 'CRM, Tasks, Calendar, Messenger access', 'client', TRUE),
('assistant', 'Limited view/create access to CRM and Tasks', 'client', TRUE),
('client_user', 'Client portal user (read-only)', 'client', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Seed core permissions
INSERT INTO permissions (resource, action, description, is_system) VALUES
-- System
('system', 'admin', 'Global system administration', TRUE),
('system', 'settings', 'Manage system settings', TRUE),
-- CRM
('crm', 'view', 'View CRM module', TRUE),
('crm', 'create', 'Create CRM records', TRUE),
('crm', 'edit', 'Edit CRM records', TRUE),
('crm', 'delete', 'Delete CRM records', TRUE),
('crm', 'assign', 'Assign CRM records to users', TRUE),
('crm', 'settings', 'Manage CRM settings', TRUE),
-- Tasks
('tasks', 'view', 'View tasks module', TRUE),
('tasks', 'create', 'Create tasks', TRUE),
('tasks', 'edit', 'Edit tasks', TRUE),
('tasks', 'delete', 'Delete tasks', TRUE),
('tasks', 'assign', 'Assign tasks to users', TRUE),
('tasks', 'settings', 'Manage task settings', TRUE),
-- Calendar
('calendar', 'view', 'View calendar', TRUE),
('calendar', 'create', 'Create calendar events', TRUE),
('calendar', 'edit', 'Edit calendar events', TRUE),
('calendar', 'delete', 'Delete calendar events', TRUE),
-- Messenger
('messenger', 'view', 'View messenger', TRUE),
('messenger', 'send', 'Send messages', TRUE),
-- Accounting
('accounting', 'view', 'View accounting module', TRUE),
('accounting', 'create', 'Create accounting entries', TRUE),
('accounting', 'edit', 'Edit accounting entries', TRUE),
('accounting', 'delete', 'Delete accounting entries', TRUE),
('accounting', 'reports', 'Generate accounting reports', TRUE),
('accounting', 'settings', 'Manage accounting settings', TRUE),
-- Invoices
('invoices', 'view', 'View invoices', TRUE),
('invoices', 'create', 'Create invoices', TRUE),
('invoices', 'edit', 'Edit invoices', TRUE),
('invoices', 'delete', 'Delete invoices', TRUE),
('invoices', 'approve', 'Approve invoices', TRUE),
-- Bank
('bank', 'view', 'View bank module', TRUE),
('bank', 'import', 'Import bank statements', TRUE),
('bank', 'edit', 'Edit bank transactions', TRUE),
('bank', 'delete', 'Delete bank transactions', TRUE),
('bank', 'reports', 'View bank reports', TRUE),
-- Clients
('clients', 'view', 'View client list', TRUE),
('clients', 'create', 'Create new clients', TRUE),
('clients', 'edit', 'Edit client information', TRUE),
('clients', 'delete', 'Delete clients', TRUE),
-- Audit
('audit', 'view', 'View audit logs', TRUE),
('audit', 'reports', 'Generate audit reports', TRUE),
-- Notifications
('notifications', 'view', 'View notifications', TRUE),
('notifications', 'manage', 'Manage notification settings', TRUE),
-- Feed
('feed', 'view', 'View activity feed', TRUE),
('feed', 'post', 'Create feed posts', TRUE),
('feed', 'comment', 'Comment on posts', TRUE),
-- Reports
('reports', 'view', 'View reports module', TRUE),
('reports', 'export', 'Export reports', TRUE)
ON CONFLICT (resource, action) DO NOTHING;

-- Assign permissions to global_administrator (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'global_administrator'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to client_administrator (all except system)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'client_administrator'
AND p.resource != 'system'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to accountant
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'accountant'
AND (
    (p.resource = 'accounting' AND p.action IN ('view', 'create', 'edit', 'reports', 'settings'))
    OR (p.resource = 'invoices' AND p.action IN ('view', 'create', 'edit', 'approve'))
    OR (p.resource = 'bank' AND p.action IN ('view', 'import', 'edit', 'reports'))
    OR (p.resource = 'clients' AND p.action = 'view')
    OR (p.resource = 'reports' AND p.action IN ('view', 'export'))
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to auditor
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'auditor'
AND (
    (p.resource = 'accounting' AND p.action = 'view')
    OR (p.resource = 'invoices' AND p.action = 'view')
    OR (p.resource = 'bank' AND p.action = 'view')
    OR (p.resource = 'audit' AND p.action IN ('view', 'reports'))
    OR (p.resource = 'clients' AND p.action = 'view')
    OR (p.resource = 'reports' AND p.action IN ('view', 'export'))
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'manager'
AND (
    (p.resource = 'crm' AND p.action IN ('view', 'create', 'edit', 'delete', 'assign'))
    OR (p.resource = 'tasks' AND p.action IN ('view', 'create', 'edit', 'delete', 'assign'))
    OR (p.resource = 'calendar' AND p.action IN ('view', 'create', 'edit', 'delete'))
    OR (p.resource = 'messenger' AND p.action IN ('view', 'send'))
    OR (p.resource = 'feed' AND p.action IN ('view', 'post', 'comment'))
    OR (p.resource = 'clients' AND p.action = 'view')
    OR (p.resource = 'notifications' AND p.action = 'view')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to assistant
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'assistant'
AND (
    (p.resource = 'crm' AND p.action IN ('view', 'create'))
    OR (p.resource = 'tasks' AND p.action IN ('view', 'create', 'edit'))
    OR (p.resource = 'calendar' AND p.action IN ('view', 'create'))
    OR (p.resource = 'messenger' AND p.action IN ('view', 'send'))
    OR (p.resource = 'feed' AND p.action IN ('view', 'comment'))
    OR (p.resource = 'clients' AND p.action = 'view')
    OR (p.resource = 'notifications' AND p.action = 'view')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- DOWN
DROP TABLE IF EXISTS user_client_roles CASCADE;
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
