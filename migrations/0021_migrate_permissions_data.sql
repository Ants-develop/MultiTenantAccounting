-- =====================================================
-- Authorization System - Phase 2: Migrate Data
-- Migration: 0021_migrate_permissions_data.sql
-- Description: Migrates existing user_companies and user_client_modules to new system
-- =====================================================

-- UP

-- 1. Migrate user_companies.role to user_client_roles
-- Maps old role strings to new role IDs
INSERT INTO user_client_roles (user_id, client_id, role_id, is_active, assigned_at)
SELECT 
    uc.user_id,
    uc.client_id,
    r.id as role_id,
    uc.is_active,
    uc.created_at
FROM user_companies uc
JOIN roles r ON (
    CASE 
        WHEN uc.role = 'administrator' THEN r.name = 'client_administrator'
        WHEN uc.role = 'manager' THEN r.name = 'manager'
        WHEN uc.role = 'accountant' THEN r.name = 'accountant'
        WHEN uc.role = 'assistant' THEN r.name = 'assistant'
        WHEN uc.role = 'auditor' THEN r.name = 'auditor'
        ELSE r.name = 'assistant' -- Default fallback for unknown roles
    END
)
WHERE NOT EXISTS (
    -- Prevent duplicates if migration is run multiple times
    SELECT 1 FROM user_client_roles ucr
    WHERE ucr.user_id = uc.user_id 
    AND ucr.client_id = uc.client_id 
    AND ucr.role_id = r.id
);

-- 2. Migrate user_client_modules (convert boolean perms to new model)
-- This creates user-specific permission overrides for any custom permissions
INSERT INTO user_permissions (user_id, client_id, permission_id, is_granted)
SELECT DISTINCT
    ucm.user_id,
    ucm.client_id,
    p.id as permission_id,
    TRUE
FROM user_client_modules ucm
JOIN permissions p ON p.resource = ucm.module
WHERE (
    (ucm.can_view = TRUE AND p.action = 'view')
    OR (ucm.can_create = TRUE AND p.action = 'create')
    OR (ucm.can_edit = TRUE AND p.action = 'edit')
    OR (ucm.can_delete = TRUE AND p.action = 'delete')
)
AND NOT EXISTS (
    -- Only migrate if user doesn't already have this permission through roles
    SELECT 1 FROM user_client_roles ucr
    JOIN role_permissions rp ON ucr.role_id = rp.role_id
    WHERE ucr.user_id = ucm.user_id
    AND ucr.client_id = ucm.client_id
    AND rp.permission_id = p.id
    AND ucr.is_active = TRUE
)
AND NOT EXISTS (
    -- Prevent duplicates
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = ucm.user_id
    AND up.client_id = ucm.client_id
    AND up.permission_id = p.id
);

-- 3. Migrate user_client_features (feature-specific permissions)
-- Similar to modules, but for granular features
INSERT INTO user_permissions (user_id, client_id, permission_id, is_granted)
SELECT DISTINCT
    ucf.user_id,
    ucf.client_id,
    p.id as permission_id,
    TRUE
FROM user_client_features ucf
JOIN permissions p ON p.resource = ucf.feature
WHERE (
    (ucf.can_view = TRUE AND p.action = 'view')
    OR (ucf.can_create = TRUE AND p.action = 'create')
    OR (ucf.can_edit = TRUE AND p.action = 'edit')
    OR (ucf.can_delete = TRUE AND p.action = 'delete')
)
AND NOT EXISTS (
    SELECT 1 FROM user_client_roles ucr
    JOIN role_permissions rp ON ucr.role_id = rp.role_id
    WHERE ucr.user_id = ucf.user_id
    AND ucr.client_id = ucf.client_id
    AND rp.permission_id = p.id
    AND ucr.is_active = TRUE
)
AND NOT EXISTS (
    SELECT 1 FROM user_permissions up
    WHERE up.user_id = ucf.user_id
    AND up.client_id = ucf.client_id
    AND up.permission_id = p.id
);

-- DOWN

-- Remove migrated data (keep old tables intact for rollback)
DELETE FROM user_client_roles 
WHERE assigned_at >= (SELECT MIN(created_at) FROM user_companies);

DELETE FROM user_permissions 
WHERE created_at >= (SELECT MIN(created_at) FROM user_client_modules);
