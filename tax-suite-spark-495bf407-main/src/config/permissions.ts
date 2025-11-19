import { RolePermissions, PermissionLevel } from "@/types/user";

const PERMISSION_LEVELS = {
  none: { level: 'none', description: 'No access', icon: '🚫' } as PermissionLevel,
  view: { level: 'view', description: 'Read-only access', icon: '👁️' } as PermissionLevel,
  edit: { level: 'edit', description: 'View + Modify', icon: '✏️' } as PermissionLevel,
  manage: { level: 'manage', description: 'View + Edit + Delete', icon: '🗑️' } as PermissionLevel,
  full: { level: 'full', description: 'Complete control', icon: '👑' } as PermissionLevel,
};

export const ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: 'admin',
    label: 'Admin',
    color: 'destructive',
    modules: {
      dashboard: PERMISSION_LEVELS.full,
      clients: PERMISSION_LEVELS.manage,
      workflows: PERMISSION_LEVELS.manage,
      tasks: PERMISSION_LEVELS.manage,
      documents: PERMISSION_LEVELS.manage,
      messages: PERMISSION_LEVELS.full,
      billing: PERMISSION_LEVELS.full,
      settings: PERMISSION_LEVELS.full,
      admin: PERMISSION_LEVELS.full,
    },
  },
  {
    role: 'manager',
    label: 'Manager',
    color: 'secondary',
    modules: {
      dashboard: PERMISSION_LEVELS.full,
      clients: PERMISSION_LEVELS.manage,
      workflows: PERMISSION_LEVELS.manage,
      tasks: PERMISSION_LEVELS.manage,
      documents: PERMISSION_LEVELS.manage,
      messages: PERMISSION_LEVELS.full,
      billing: PERMISSION_LEVELS.view,
      settings: PERMISSION_LEVELS.edit,
      admin: PERMISSION_LEVELS.none,
    },
  },
  {
    role: 'accountant',
    label: 'Accountant',
    color: 'default',
    modules: {
      dashboard: PERMISSION_LEVELS.view,
      clients: PERMISSION_LEVELS.edit,
      workflows: PERMISSION_LEVELS.edit,
      tasks: PERMISSION_LEVELS.manage,
      documents: PERMISSION_LEVELS.edit,
      messages: PERMISSION_LEVELS.full,
      billing: PERMISSION_LEVELS.none,
      settings: PERMISSION_LEVELS.view,
      admin: PERMISSION_LEVELS.none,
    },
  },
  {
    role: 'reviewer',
    label: 'Reviewer',
    color: 'outline',
    modules: {
      dashboard: PERMISSION_LEVELS.view,
      clients: PERMISSION_LEVELS.view,
      workflows: PERMISSION_LEVELS.view,
      tasks: PERMISSION_LEVELS.edit,
      documents: PERMISSION_LEVELS.view,
      messages: PERMISSION_LEVELS.view,
      billing: PERMISSION_LEVELS.none,
      settings: PERMISSION_LEVELS.none,
      admin: PERMISSION_LEVELS.none,
    },
  },
  {
    role: 'client',
    label: 'Client',
    color: 'outline',
    modules: {
      dashboard: PERMISSION_LEVELS.view,
      clients: PERMISSION_LEVELS.view,
      workflows: PERMISSION_LEVELS.view,
      tasks: PERMISSION_LEVELS.edit,
      documents: PERMISSION_LEVELS.edit,
      messages: PERMISSION_LEVELS.edit,
      billing: PERMISSION_LEVELS.none,
      settings: PERMISSION_LEVELS.view,
      admin: PERMISSION_LEVELS.none,
    },
  },
];

export const getRolePermissions = (role: string): RolePermissions | undefined => {
  return ROLE_PERMISSIONS.find((r) => r.role === role);
};

export const getModulePermission = (role: string, module: string): PermissionLevel => {
  const rolePerms = getRolePermissions(role);
  return rolePerms?.modules[module] || PERMISSION_LEVELS.none;
};

export const MODULE_NAMES: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  workflows: 'Workflows',
  tasks: 'Tasks',
  documents: 'Documents',
  messages: 'Messages',
  billing: 'Billing',
  settings: 'Settings',
  admin: 'Admin Panel',
};
