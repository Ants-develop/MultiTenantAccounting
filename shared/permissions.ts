// Role-based permissions system
export type Role = 'assistant' | 'accountant' | 'manager' | 'administrator';
export type GlobalRole = 'global_administrator' | 'user';

export interface Permission {
  module: string;
  action: string;
  description: string;
}

// Define all available permissions
export const PERMISSIONS = {
  // User Management
  USER_VIEW: { module: 'users', action: 'view', description: 'View user list' },
  USER_CREATE: { module: 'users', action: 'create', description: 'Create new users' },
  USER_EDIT: { module: 'users', action: 'edit', description: 'Edit user details' },
  USER_DELETE: { module: 'users', action: 'delete', description: 'Delete users' },
  USER_ASSIGN_ROLES: { module: 'users', action: 'assign_roles', description: 'Assign roles to users' },
  
  // Company Management
  COMPANY_VIEW: { module: 'companies', action: 'view', description: 'View company list' },
  COMPANY_CREATE: { module: 'companies', action: 'create', description: 'Create new companies' },
  COMPANY_EDIT: { module: 'companies', action: 'edit', description: 'Edit company details' },
  COMPANY_DELETE: { module: 'companies', action: 'delete', description: 'Delete companies' },
  
  // Chart of Accounts
  ACCOUNTS_VIEW: { module: 'accounts', action: 'view', description: 'View chart of accounts' },
  ACCOUNTS_CREATE: { module: 'accounts', action: 'create', description: 'Create new accounts' },
  ACCOUNTS_EDIT: { module: 'accounts', action: 'edit', description: 'Edit account details' },
  ACCOUNTS_DELETE: { module: 'accounts', action: 'delete', description: 'Delete accounts' },
  
  // Journal Entries
  JOURNAL_VIEW: { module: 'journal', action: 'view', description: 'View journal entries' },
  JOURNAL_CREATE: { module: 'journal', action: 'create', description: 'Create journal entries' },
  JOURNAL_EDIT: { module: 'journal', action: 'edit', description: 'Edit journal entries' },
  JOURNAL_DELETE: { module: 'journal', action: 'delete', description: 'Delete journal entries' },
  JOURNAL_POST: { module: 'journal', action: 'post', description: 'Post journal entries' },
  JOURNAL_UNPOST: { module: 'journal', action: 'unpost', description: 'Unpost journal entries' },
  
  // Customers & Vendors
  CUSTOMERS_VIEW: { module: 'customers', action: 'view', description: 'View customers' },
  CUSTOMERS_CREATE: { module: 'customers', action: 'create', description: 'Create customers' },
  CUSTOMERS_EDIT: { module: 'customers', action: 'edit', description: 'Edit customers' },
  CUSTOMERS_DELETE: { module: 'customers', action: 'delete', description: 'Delete customers' },
  
  VENDORS_VIEW: { module: 'vendors', action: 'view', description: 'View vendors' },
  VENDORS_CREATE: { module: 'vendors', action: 'create', description: 'Create vendors' },
  VENDORS_EDIT: { module: 'vendors', action: 'edit', description: 'Edit vendors' },
  VENDORS_DELETE: { module: 'vendors', action: 'delete', description: 'Delete vendors' },
  
  // Invoices & Bills
  INVOICES_VIEW: { module: 'invoices', action: 'view', description: 'View invoices' },
  INVOICES_CREATE: { module: 'invoices', action: 'create', description: 'Create invoices' },
  INVOICES_EDIT: { module: 'invoices', action: 'edit', description: 'Edit invoices' },
  INVOICES_DELETE: { module: 'invoices', action: 'delete', description: 'Delete invoices' },
  INVOICES_SEND: { module: 'invoices', action: 'send', description: 'Send invoices to customers' },
  
  BILLS_VIEW: { module: 'bills', action: 'view', description: 'View bills' },
  BILLS_CREATE: { module: 'bills', action: 'create', description: 'Create bills' },
  BILLS_EDIT: { module: 'bills', action: 'edit', description: 'Edit bills' },
  BILLS_DELETE: { module: 'bills', action: 'delete', description: 'Delete bills' },
  BILLS_PAY: { module: 'bills', action: 'pay', description: 'Mark bills as paid' },
  
  // Reports
  REPORTS_VIEW: { module: 'reports', action: 'view', description: 'View financial reports' },
  REPORTS_EXPORT: { module: 'reports', action: 'export', description: 'Export reports' },
  REPORTS_CUSTOM: { module: 'reports', action: 'custom', description: 'Create custom reports' },
  
  // Settings
  SETTINGS_VIEW: { module: 'settings', action: 'view', description: 'View company settings' },
  SETTINGS_EDIT: { module: 'settings', action: 'edit', description: 'Edit company settings' },
  
  // Dashboard
  DASHBOARD_VIEW: { module: 'dashboard', action: 'view', description: 'View dashboard' },
  
  // Sales & Purchases
  SALES_VIEW: { module: 'sales', action: 'view', description: 'View sales documents' },
  SALES_CREATE: { module: 'sales', action: 'create', description: 'Create sales documents' },
  SALES_EDIT: { module: 'sales', action: 'edit', description: 'Edit sales documents' },
  SALES_DELETE: { module: 'sales', action: 'delete', description: 'Delete sales documents' },
  
  PURCHASES_VIEW: { module: 'purchases', action: 'view', description: 'View purchase documents' },
  PURCHASES_CREATE: { module: 'purchases', action: 'create', description: 'Create purchase documents' },
  PURCHASES_EDIT: { module: 'purchases', action: 'edit', description: 'Edit purchase documents' },
  PURCHASES_DELETE: { module: 'purchases', action: 'delete', description: 'Delete purchase documents' },
  
  // Bank & Banking
  BANK_VIEW: { module: 'bank', action: 'view', description: 'View bank accounts' },
  BANK_CREATE: { module: 'bank', action: 'create', description: 'Create bank accounts' },
  BANK_EDIT: { module: 'bank', action: 'edit', description: 'Edit bank accounts' },
  BANK_DELETE: { module: 'bank', action: 'delete', description: 'Delete bank accounts' },
  BANK_UPLOAD: { module: 'bank', action: 'upload', description: 'Upload bank statements' },
  BANK_IMPORT: { module: 'bank', action: 'import', description: 'Import bank statements' },
  BANK_RECONCILE: { module: 'bank', action: 'reconcile', description: 'Reconcile bank statements' },
  BANK_EXPORT: { module: 'bank', action: 'export', description: 'Export bank data' },
  
  // Audit Module
  AUDIT_VIEW: { module: 'audit', action: 'view', description: 'View audit reports' },
  AUDIT_EXPORT: { module: 'audit', action: 'export', description: 'Export audit data' },
  
  // Reporting Module
  REPORTING_VIEW: { module: 'reporting', action: 'view', description: 'View financial reports' },
  REPORTING_EXPORT: { module: 'reporting', action: 'export', description: 'Export reports' },
  REPORTING_CUSTOM: { module: 'reporting', action: 'custom', description: 'Create custom reports' },
  REPORTING_SCHEDULE: { module: 'reporting', action: 'schedule', description: 'Schedule automated reports' },
  
  // Chat Module
  CHAT_VIEW: { module: 'chat', action: 'view', description: 'View chat messages' },
  CHAT_SEND: { module: 'chat', action: 'send', description: 'Send chat messages' },
  CHAT_EDIT: { module: 'chat', action: 'edit', description: 'Edit own messages' },
  CHAT_DELETE: { module: 'chat', action: 'delete', description: 'Delete messages' },
  CHAT_ADMIN: { module: 'chat', action: 'admin', description: 'Manage chat channels' },
  
  // Tasks Module
  TASKS_VIEW: { module: 'tasks', action: 'view', description: 'View tasks' },
  TASKS_CREATE: { module: 'tasks', action: 'create', description: 'Create tasks' },
  TASKS_EDIT: { module: 'tasks', action: 'edit', description: 'Edit tasks' },
  TASKS_DELETE: { module: 'tasks', action: 'delete', description: 'Delete tasks' },
  TASKS_ASSIGN: { module: 'tasks', action: 'assign', description: 'Assign tasks to users' },
  TASKS_COMPLETE: { module: 'tasks', action: 'complete', description: 'Complete tasks' },
  
  // RS Integration Module
  RS_VIEW: { module: 'rs', action: 'view', description: 'View RS integration data' },
  RS_EXPORT: { module: 'rs', action: 'export', description: 'Export RS data' },
} as const;

// Role permissions mapping
export const ROLE_PERMISSIONS: Record<Role, (keyof typeof PERMISSIONS)[]> = {
  // Assistant Accountant - Limited data entry and basic reporting
  assistant: [
    'DASHBOARD_VIEW',
    'ACCOUNTS_VIEW',
    'CUSTOMERS_VIEW',
    'CUSTOMERS_CREATE',
    'CUSTOMERS_EDIT',
    'VENDORS_VIEW',
    'VENDORS_CREATE',
    'VENDORS_EDIT',
    'JOURNAL_VIEW',
    'JOURNAL_CREATE',
    'INVOICES_VIEW',
    'INVOICES_CREATE',
    'BILLS_VIEW',
    'BILLS_CREATE',
    'SALES_VIEW',
    'SALES_CREATE',
    'PURCHASES_VIEW',
    'PURCHASES_CREATE',
    'BANK_VIEW',
    'REPORTS_VIEW',
    'REPORTING_VIEW',
    'AUDIT_VIEW',
    'CHAT_VIEW',
    'CHAT_SEND',
    'CHAT_EDIT',
    'TASKS_VIEW',
    'TASKS_CREATE',
    'TASKS_EDIT',
    'TASKS_COMPLETE',
    'RS_VIEW',
  ],
  
  // Accountant - Full accounting operations except user/company management
  accountant: [
    'DASHBOARD_VIEW',
    'ACCOUNTS_VIEW',
    'ACCOUNTS_CREATE',
    'ACCOUNTS_EDIT',
    'CUSTOMERS_VIEW',
    'CUSTOMERS_CREATE',
    'CUSTOMERS_EDIT',
    'CUSTOMERS_DELETE',
    'VENDORS_VIEW',
    'VENDORS_CREATE',
    'VENDORS_EDIT',
    'VENDORS_DELETE',
    'JOURNAL_VIEW',
    'JOURNAL_CREATE',
    'JOURNAL_EDIT',
    'JOURNAL_POST',
    'JOURNAL_UNPOST',
    'INVOICES_VIEW',
    'INVOICES_CREATE',
    'INVOICES_EDIT',
    'INVOICES_SEND',
    'BILLS_VIEW',
    'BILLS_CREATE',
    'BILLS_EDIT',
    'BILLS_PAY',
    'SALES_VIEW',
    'SALES_CREATE',
    'SALES_EDIT',
    'PURCHASES_VIEW',
    'PURCHASES_CREATE',
    'PURCHASES_EDIT',
    'BANK_VIEW',
    'BANK_CREATE',
    'BANK_EDIT',
    'BANK_UPLOAD',
    'BANK_IMPORT',
    'BANK_RECONCILE',
    'BANK_EXPORT',
    'REPORTS_VIEW',
    'REPORTS_EXPORT',
    'REPORTING_VIEW',
    'REPORTING_EXPORT',
    'AUDIT_VIEW',
    'AUDIT_EXPORT',
    'CHAT_VIEW',
    'CHAT_SEND',
    'CHAT_EDIT',
    'CHAT_DELETE',
    'TASKS_VIEW',
    'TASKS_CREATE',
    'TASKS_EDIT',
    'TASKS_DELETE',
    'TASKS_ASSIGN',
    'TASKS_COMPLETE',
    'RS_VIEW',
    'RS_EXPORT',
    'SETTINGS_VIEW',
  ],
  
  // Manager - Full accounting + company management
  manager: [
    'DASHBOARD_VIEW',
    'ACCOUNTS_VIEW',
    'ACCOUNTS_CREATE',
    'ACCOUNTS_EDIT',
    'ACCOUNTS_DELETE',
    'CUSTOMERS_VIEW',
    'CUSTOMERS_CREATE',
    'CUSTOMERS_EDIT',
    'CUSTOMERS_DELETE',
    'VENDORS_VIEW',
    'VENDORS_CREATE',
    'VENDORS_EDIT',
    'VENDORS_DELETE',
    'JOURNAL_VIEW',
    'JOURNAL_CREATE',
    'JOURNAL_EDIT',
    'JOURNAL_DELETE',
    'JOURNAL_POST',
    'JOURNAL_UNPOST',
    'INVOICES_VIEW',
    'INVOICES_CREATE',
    'INVOICES_EDIT',
    'INVOICES_DELETE',
    'INVOICES_SEND',
    'BILLS_VIEW',
    'BILLS_CREATE',
    'BILLS_EDIT',
    'BILLS_DELETE',
    'BILLS_PAY',
    'SALES_VIEW',
    'SALES_CREATE',
    'SALES_EDIT',
    'SALES_DELETE',
    'PURCHASES_VIEW',
    'PURCHASES_CREATE',
    'PURCHASES_EDIT',
    'PURCHASES_DELETE',
    'BANK_VIEW',
    'BANK_CREATE',
    'BANK_EDIT',
    'BANK_DELETE',
    'BANK_UPLOAD',
    'BANK_IMPORT',
    'BANK_RECONCILE',
    'BANK_EXPORT',
    'REPORTS_VIEW',
    'REPORTS_EXPORT',
    'REPORTS_CUSTOM',
    'REPORTING_VIEW',
    'REPORTING_EXPORT',
    'REPORTING_CUSTOM',
    'REPORTING_SCHEDULE',
    'AUDIT_VIEW',
    'AUDIT_EXPORT',
    'CHAT_VIEW',
    'CHAT_SEND',
    'CHAT_EDIT',
    'CHAT_DELETE',
    'CHAT_ADMIN',
    'TASKS_VIEW',
    'TASKS_CREATE',
    'TASKS_EDIT',
    'TASKS_DELETE',
    'TASKS_ASSIGN',
    'TASKS_COMPLETE',
    'RS_VIEW',
    'RS_EXPORT',
    'SETTINGS_VIEW',
    'SETTINGS_EDIT',
    'USER_VIEW',
    'USER_CREATE',
    'USER_EDIT',
    'USER_ASSIGN_ROLES',
    'COMPANY_VIEW',
    'COMPANY_EDIT',
  ],
  
  // Administrator - Full system access
  administrator: [
    'DASHBOARD_VIEW',
    'ACCOUNTS_VIEW',
    'ACCOUNTS_CREATE',
    'ACCOUNTS_EDIT',
    'ACCOUNTS_DELETE',
    'CUSTOMERS_VIEW',
    'CUSTOMERS_CREATE',
    'CUSTOMERS_EDIT',
    'CUSTOMERS_DELETE',
    'VENDORS_VIEW',
    'VENDORS_CREATE',
    'VENDORS_EDIT',
    'VENDORS_DELETE',
    'JOURNAL_VIEW',
    'JOURNAL_CREATE',
    'JOURNAL_EDIT',
    'JOURNAL_DELETE',
    'JOURNAL_POST',
    'JOURNAL_UNPOST',
    'INVOICES_VIEW',
    'INVOICES_CREATE',
    'INVOICES_EDIT',
    'INVOICES_DELETE',
    'INVOICES_SEND',
    'BILLS_VIEW',
    'BILLS_CREATE',
    'BILLS_EDIT',
    'BILLS_DELETE',
    'BILLS_PAY',
    'SALES_VIEW',
    'SALES_CREATE',
    'SALES_EDIT',
    'SALES_DELETE',
    'PURCHASES_VIEW',
    'PURCHASES_CREATE',
    'PURCHASES_EDIT',
    'PURCHASES_DELETE',
    'BANK_VIEW',
    'BANK_CREATE',
    'BANK_EDIT',
    'BANK_DELETE',
    'BANK_UPLOAD',
    'BANK_IMPORT',
    'BANK_RECONCILE',
    'BANK_EXPORT',
    'REPORTS_VIEW',
    'REPORTS_EXPORT',
    'REPORTS_CUSTOM',
    'REPORTING_VIEW',
    'REPORTING_EXPORT',
    'REPORTING_CUSTOM',
    'REPORTING_SCHEDULE',
    'AUDIT_VIEW',
    'AUDIT_EXPORT',
    'CHAT_VIEW',
    'CHAT_SEND',
    'CHAT_EDIT',
    'CHAT_DELETE',
    'CHAT_ADMIN',
    'TASKS_VIEW',
    'TASKS_CREATE',
    'TASKS_EDIT',
    'TASKS_DELETE',
    'TASKS_ASSIGN',
    'TASKS_COMPLETE',
    'RS_VIEW',
    'RS_EXPORT',
    'SETTINGS_VIEW',
    'SETTINGS_EDIT',
    'USER_VIEW',
    'USER_CREATE',
    'USER_EDIT',
    'USER_DELETE',
    'USER_ASSIGN_ROLES',
    'COMPANY_VIEW',
    'COMPANY_CREATE',
    'COMPANY_EDIT',
    'COMPANY_DELETE',
  ],
};

// Helper functions
export function hasPermission(userRole: Role, permission: keyof typeof PERMISSIONS): boolean {
  return ROLE_PERMISSIONS[userRole].includes(permission);
}

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role].map(permissionKey => PERMISSIONS[permissionKey]);
}

export function getAllPermissions(): Permission[] {
  return Object.values(PERMISSIONS);
}

export function getRoleDescription(role: Role): string {
  switch (role) {
    case 'assistant':
      return 'Limited data entry and basic reporting access. Can create customers, vendors, and basic transactions but cannot modify system settings or manage users.';
    case 'accountant':
      return 'Full accounting operations including journal entries, invoices, bills, and financial reporting. Cannot manage users or companies.';
    case 'manager':
      return 'Complete accounting access plus company management. Can manage users within their company and modify company settings.';
    case 'administrator':
      return 'Full system access including user management, company creation, and all accounting operations across all companies.';
    default:
      return 'Unknown role';
  }
}

export function getRoleHierarchy(): Role[] {
  return ['assistant', 'accountant', 'manager', 'administrator'];
}

export function canAssignRole(assignerRole: Role, targetRole: Role): boolean {
  const hierarchy = getRoleHierarchy();
  const assignerLevel = hierarchy.indexOf(assignerRole);
  const targetLevel = hierarchy.indexOf(targetRole);
  
  // Administrators can assign any role
  if (assignerRole === 'administrator') return true;
  
  // Managers can assign assistant and accountant roles
  if (assignerRole === 'manager') return ['assistant', 'accountant'].includes(targetRole);
  
  // Others cannot assign roles
  return false;
}

// Add global permissions
export const GLOBAL_PERMISSIONS = {
  // System Administration
  SYSTEM_VIEW_ALL_COMPANIES: { module: 'system', action: 'view_all_companies', description: 'View all companies in system' },
  SYSTEM_CREATE_COMPANIES: { module: 'system', action: 'create_companies', description: 'Create companies' },
  SYSTEM_DELETE_COMPANIES: { module: 'system', action: 'delete_companies', description: 'Delete companies' },
  SYSTEM_MANAGE_GLOBAL_USERS: { module: 'system', action: 'manage_global_users', description: 'Manage global user roles' },
  SYSTEM_VIEW_SYSTEM_LOGS: { module: 'system', action: 'view_system_logs', description: 'View system logs' },
  SYSTEM_BACKUP_RESTORE: { module: 'system', action: 'backup_restore', description: 'Backup and restore system' },
  SYSTEM_ACCESS_ALL_DATA: { module: 'system', action: 'access_all_data', description: 'Access data across all companies' },
  
  // Testing Module
  TESTING_VIEW: { module: 'testing', action: 'view', description: 'Access testing playground module' },
} as const;

// Global role permissions mapping
export const GLOBAL_ROLE_PERMISSIONS: Record<GlobalRole, (keyof typeof GLOBAL_PERMISSIONS)[]> = {
  // Global Administrator - Full system access across all companies
  global_administrator: [
    'SYSTEM_VIEW_ALL_COMPANIES',
    'SYSTEM_CREATE_COMPANIES', 
    'SYSTEM_DELETE_COMPANIES',
    'SYSTEM_MANAGE_GLOBAL_USERS',
    'SYSTEM_VIEW_SYSTEM_LOGS',
    'SYSTEM_BACKUP_RESTORE',
    'SYSTEM_ACCESS_ALL_DATA',
    'TESTING_VIEW',
  ],
  
  // Regular User - Standard access, must be assigned to companies
  user: [],
};

// Helper function to check global permissions
export function hasGlobalPermission(globalRole: GlobalRole, permission: keyof typeof GLOBAL_PERMISSIONS): boolean {
  return GLOBAL_ROLE_PERMISSIONS[globalRole].includes(permission);
}

// Helper function to check if user has global admin access
export function isGlobalAdmin(globalRole: GlobalRole): boolean {
  return globalRole === 'global_administrator';
}

// Updated permission checking that considers global roles first
export function hasEffectivePermission(
  globalRole: GlobalRole, 
  companyRole: Role | null, 
  permission: keyof typeof PERMISSIONS
): boolean {
  // Global administrators have all permissions
  if (isGlobalAdmin(globalRole)) {
    return true;
  }
  
  // Otherwise check company-specific role
  if (!companyRole) return false;
  return hasPermission(companyRole, permission);
}