import { useAuth } from './useAuth';
import { 
  hasPermission, 
  hasEffectivePermission,
  hasGlobalPermission,
  type Role, 
  type GlobalRole,
  PERMISSIONS, 
  getRolePermissions, 
  canAssignRole,
  isGlobalAdmin
} from '@shared/permissions';

export function usePermissions() {
  const { companies, user } = useAuth();
  const currentCompany = companies?.[0] || null;

  // Get current user's global role
  const globalRole: GlobalRole = (user as any)?.globalRole || 'user';

  // Get current user's role for the selected company
  const getCurrentRole = (): Role | null => {
    if (!currentCompany || !companies) return null;
    
    const userCompany = companies.find(uc => uc.id === currentCompany.id);
    return userCompany?.role as Role || null;
  };

  const currentRole = getCurrentRole();

  // Check if user has a specific permission (considers global role)
  const can = (permission: keyof typeof PERMISSIONS): boolean => {
    return hasEffectivePermission(globalRole, currentRole, permission);
  };

  // Check if user can perform multiple permissions (OR logic)
  const canAny = (permissions: (keyof typeof PERMISSIONS)[]): boolean => {
    return permissions.some(permission => can(permission));
  };

  // Check if user can perform all permissions (AND logic)
  const canAll = (permissions: (keyof typeof PERMISSIONS)[]): boolean => {
    return permissions.every(permission => can(permission));
  };

  // Check if user can assign a specific role
  const canAssign = (targetRole: Role): boolean => {
    // Global administrators can assign any role
    if (isGlobalAdmin(globalRole)) return true;
    
    if (!currentRole) return false;
    return canAssignRole(currentRole, targetRole);
  };

  // Get all permissions for current role
  const getPermissions = () => {
    if (!currentRole) return [];
    return getRolePermissions(currentRole);
  };

  // Helper functions for common permission checks
  const permissions = {
    // User Management
    canViewUsers: () => can('USER_VIEW'),
    canCreateUsers: () => can('USER_CREATE'),
    canEditUsers: () => can('USER_EDIT'),
    canDeleteUsers: () => can('USER_DELETE'),
    canAssignRoles: () => can('USER_ASSIGN_ROLES'),

    // Company Management
    canViewCompanies: () => can('COMPANY_VIEW'),
    canCreateCompanies: () => can('COMPANY_CREATE'),
    canEditCompanies: () => can('COMPANY_EDIT'),
    canDeleteCompanies: () => can('COMPANY_DELETE'),

    // Chart of Accounts
    canViewAccounts: () => can('ACCOUNTS_VIEW'),
    canCreateAccounts: () => can('ACCOUNTS_CREATE'),
    canEditAccounts: () => can('ACCOUNTS_EDIT'),
    canDeleteAccounts: () => can('ACCOUNTS_DELETE'),

    // Journal Entries
    canViewJournal: () => can('JOURNAL_VIEW'),
    canCreateJournal: () => can('JOURNAL_CREATE'),
    canEditJournal: () => can('JOURNAL_EDIT'),
    canDeleteJournal: () => can('JOURNAL_DELETE'),
    canPostJournal: () => can('JOURNAL_POST'),
    canUnpostJournal: () => can('JOURNAL_UNPOST'),

    // Customers & Vendors
    canViewCustomers: () => can('CUSTOMERS_VIEW'),
    canCreateCustomers: () => can('CUSTOMERS_CREATE'),
    canEditCustomers: () => can('CUSTOMERS_EDIT'),
    canDeleteCustomers: () => can('CUSTOMERS_DELETE'),

    canViewVendors: () => can('VENDORS_VIEW'),
    canCreateVendors: () => can('VENDORS_CREATE'),
    canEditVendors: () => can('VENDORS_EDIT'),
    canDeleteVendors: () => can('VENDORS_DELETE'),

    // Invoices & Bills
    canViewInvoices: () => can('INVOICES_VIEW'),
    canCreateInvoices: () => can('INVOICES_CREATE'),
    canEditInvoices: () => can('INVOICES_EDIT'),
    canDeleteInvoices: () => can('INVOICES_DELETE'),
    canSendInvoices: () => can('INVOICES_SEND'),

    canViewBills: () => can('BILLS_VIEW'),
    canCreateBills: () => can('BILLS_CREATE'),
    canEditBills: () => can('BILLS_EDIT'),
    canDeleteBills: () => can('BILLS_DELETE'),
    canPayBills: () => can('BILLS_PAY'),

    // Reports
    canViewReports: () => can('REPORTS_VIEW'),
    canExportReports: () => can('REPORTS_EXPORT'),
    canCreateCustomReports: () => can('REPORTS_CUSTOM'),

    // Settings
    canViewSettings: () => can('SETTINGS_VIEW'),
    canEditSettings: () => can('SETTINGS_EDIT'),

    // Dashboard
    canViewDashboard: () => can('DASHBOARD_VIEW'),

    // Global role checks
    isGlobalAdministrator: () => isGlobalAdmin(globalRole),

    // Sales & Purchases
    canViewSales: () => can('SALES_VIEW'),
    canCreateSales: () => can('SALES_CREATE'),
    canEditSales: () => can('SALES_EDIT'),
    canDeleteSales: () => can('SALES_DELETE'),

    canViewPurchases: () => can('PURCHASES_VIEW'),
    canCreatePurchases: () => can('PURCHASES_CREATE'),
    canEditPurchases: () => can('PURCHASES_EDIT'),
    canDeletePurchases: () => can('PURCHASES_DELETE'),

    // Bank & Banking
    canViewBank: () => can('BANK_VIEW'),
    canUploadBankStatements: () => can('BANK_UPLOAD'),
    canReconcileBank: () => can('BANK_RECONCILE'),

    // Global system permissions
    canViewAllCompanies: () => hasGlobalPermission(globalRole, 'SYSTEM_VIEW_ALL_COMPANIES'),
    canCreateCompaniesGlobal: () => hasGlobalPermission(globalRole, 'SYSTEM_CREATE_COMPANIES'),
    canDeleteCompaniesGlobal: () => hasGlobalPermission(globalRole, 'SYSTEM_DELETE_COMPANIES'),
    canManageGlobalUsers: () => hasGlobalPermission(globalRole, 'SYSTEM_MANAGE_GLOBAL_USERS'),
    canViewSystemLogs: () => hasGlobalPermission(globalRole, 'SYSTEM_VIEW_SYSTEM_LOGS'),
    canBackupRestore: () => hasGlobalPermission(globalRole, 'SYSTEM_BACKUP_RESTORE'),
    canAccessAllData: () => hasGlobalPermission(globalRole, 'SYSTEM_ACCESS_ALL_DATA'),
  };

  return {
    currentRole,
    globalRole,
    can,
    canAny,
    canAll,
    canAssign,
    getPermissions,
    ...permissions,
  };
}