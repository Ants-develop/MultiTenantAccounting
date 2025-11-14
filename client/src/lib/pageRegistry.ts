import { ComponentType } from "react";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import ChartOfAccounts from "@/pages/accounting/ChartOfAccounts";
import GeneralLedger from "@/pages/accounting/GeneralLedger";
import AccountsReceivable from "@/pages/accounting/AccountsReceivable";
import AccountsPayable from "@/pages/accounting/AccountsPayable";
import BankReconciliation from "@/pages/accounting/BankReconciliation";
import JournalEntries from "@/pages/accounting/JournalEntriesPage";
import JournalEntriesSyncfusion from "@/pages/accounting/JournalEntriesSyncfusionPage";
import AccountingOperations from "@/pages/accounting/AccountingOperations";
import Sales from "@/pages/accounting/Sales";
import Purchases from "@/pages/accounting/Purchases";
import BankStatementUpload from "@/pages/accounting/BankStatementUpload";
import Invoices from "@/pages/accounting/Invoices";
import BankAccounts from "@/pages/bank/BankAccounts";
import ImportStatement from "@/pages/bank/ImportStatement";
import FinancialStatements from "@/pages/reports/FinancialStatements";
import UserManagement from "@/pages/admin/UserManagement";
import Profile from "@/pages/Profile";
import CompanyProfile from "@/pages/CompanyProfile";
import RoleManagement from "@/pages/admin/RoleManagement";
import PermissionsManagement from "@/pages/admin/PermissionsManagement";
import Clients from "@/pages/admin/Clients";
import GlobalAdministration from "@/pages/admin/GlobalAdministration";
import MSSQLImport from "@/pages/admin/MSSQLImport";
import AccountingHome from "@/pages/accounting/AccountingHome";
import AuditDashboard from "@/pages/audit/AuditDashboard";
import RSIntegrationDashboard from "@/pages/rs/RSIntegrationDashboard";
import RSAdmin from "@/pages/rs/RSAdmin";
import TestingDashboard from "@/pages/testing/TestingDashboard";
import TasksDashboard from "@/pages/tasks/TasksDashboard";
import TaskDetail from "@/pages/tasks/TaskDetail";
import PipelinesDashboard from "@/pages/pipelines/PipelinesDashboard";
import PipelineBuilder from "@/pages/pipelines/PipelineBuilder";
import JobsDashboard from "@/pages/jobs/JobsDashboard";
import JobDetail from "@/pages/jobs/JobDetail";
import CalendarPage from "@/pages/calendar/CalendarPage";
import { AutomationsDashboard } from "@/pages/automations/AutomationsDashboard";
import { ClientProfile } from "@/pages/clients/ClientProfile";
import { ClientOnboarding } from "@/pages/clients/ClientOnboarding";
import { EmailInbox } from "@/pages/email/EmailInbox";
import HandsontableDemo from "@/pages/testing/HandsontableDemo";
import TanStackTableDemo from "@/pages/testing/TanStackTableDemo";
import AgGridDemo from "@/pages/testing/AgGridDemo";
import SyncfusionGridDemo from "@/pages/testing/SyncfusionGridDemo";
import TabulatorDemo from "@/pages/testing/TabulatorDemo";

export interface PageMetadata {
  title: string;
  component: ComponentType<any>;
  path: string;
  isDynamic?: boolean;
  defaultParams?: Record<string, any>;
}

export interface PageConfig {
  [path: string]: PageMetadata;
}

// Page registry mapping paths to components
export const pageRegistry: PageConfig = {
  "/": {
    title: "Home",
    component: Home,
    path: "/",
  },
  "/home": {
    title: "Home",
    component: Home,
    path: "/home",
  },
  "/dashboard": {
    title: "Dashboard",
    component: Dashboard,
    path: "/dashboard",
  },
  "/accounting": {
    title: "Accounting",
    component: AccountingHome,
    path: "/accounting",
  },
  "/accounting/chart-of-accounts": {
    title: "Chart of Accounts",
    component: ChartOfAccounts,
    path: "/accounting/chart-of-accounts",
  },
  "/accounting/general-ledger": {
    title: "General Ledger",
    component: GeneralLedger,
    path: "/accounting/general-ledger",
  },
  "/accounting/accounts-receivable": {
    title: "Accounts Receivable",
    component: AccountsReceivable,
    path: "/accounting/accounts-receivable",
  },
  "/accounting/accounts-payable": {
    title: "Accounts Payable",
    component: AccountsPayable,
    path: "/accounting/accounts-payable",
  },
  "/accounting/bank-reconciliation": {
    title: "Bank Reconciliation",
    component: BankReconciliation,
    path: "/accounting/bank-reconciliation",
  },
  "/accounting/journal-entries": {
    title: "Journal Entries",
    component: JournalEntries,
    path: "/accounting/journal-entries",
  },
  "/accounting/journal-entries-syncfusion": {
    title: "Journal Entries (Syncfusion)",
    component: JournalEntriesSyncfusion,
    path: "/accounting/journal-entries-syncfusion",
  },
  "/accounting/accounting-operations": {
    title: "Accounting Operations",
    component: AccountingOperations,
    path: "/accounting/accounting-operations",
  },
  "/accounting/sales": {
    title: "Sales",
    component: Sales,
    path: "/accounting/sales",
  },
  "/accounting/purchases": {
    title: "Purchases",
    component: Purchases,
    path: "/accounting/purchases",
  },
  "/accounting/bank-statement-upload": {
    title: "Bank Statement Upload",
    component: BankStatementUpload,
    path: "/accounting/bank-statement-upload",
  },
  "/accounting/invoices": {
    title: "Invoices",
    component: Invoices,
    path: "/accounting/invoices",
  },
  "/financial-statements": {
    title: "Financial Statements",
    component: FinancialStatements,
    path: "/financial-statements",
  },
  "/user-management": {
    title: "User Management",
    component: UserManagement,
    path: "/user-management",
  },
  "/role-management": {
    title: "Role Management",
    component: RoleManagement,
    path: "/role-management",
  },
  "/permissions-management": {
    title: "Permissions Management",
    component: PermissionsManagement,
    path: "/permissions-management",
  },
  "/clients": {
    title: "Clients",
    component: Clients,
    path: "/clients",
  },
  "/clients/:id/profile": {
    title: "Client Profile",
    component: ClientProfile,
    path: "/clients/:id/profile",
    isDynamic: true,
  },
  "/clients/:id/onboarding": {
    title: "Client Onboarding",
    component: ClientOnboarding,
    path: "/clients/:id/onboarding",
    isDynamic: true,
  },
  "/email": {
    title: "Email Inbox",
    component: EmailInbox,
    path: "/email",
  },
  "/profile": {
    title: "Profile",
    component: Profile,
    path: "/profile",
  },
  "/company-profile": {
    title: "Company Profile",
    component: CompanyProfile,
    path: "/company-profile",
  },
  "/settings": {
    title: "Settings",
    component: CompanyProfile,
    path: "/settings",
  },
  "/global-administration": {
    title: "Global Administration",
    component: GlobalAdministration,
    path: "/global-administration",
  },
  "/mssql-import": {
    title: "MSSQL Import",
    component: MSSQLImport,
    path: "/mssql-import",
  },
  "/audit": {
    title: "Audit",
    component: AuditDashboard,
    path: "/audit",
  },
  "/rs-integration": {
    title: "RS Integration",
    component: RSIntegrationDashboard,
    path: "/rs-integration",
  },
  "/rs-admin": {
    title: "RS Administration",
    component: RSAdmin,
    path: "/rs-admin",
  },
  "/bank/accounts": {
    title: "Bank Accounts",
    component: BankAccounts,
    path: "/bank/accounts",
  },
  "/bank/import": {
    title: "Import Statement",
    component: ImportStatement,
    path: "/bank/import",
  },
  "/tasks": {
    title: "Tasks",
    component: TasksDashboard,
    path: "/tasks",
  },
  "/tasks/:id": {
    title: "Task Detail",
    component: TaskDetail,
    path: "/tasks/:id",
    isDynamic: true,
  },
  "/pipelines": {
    title: "Pipelines",
    component: PipelinesDashboard,
    path: "/pipelines",
  },
  "/pipelines/new": {
    title: "New Pipeline",
    component: PipelineBuilder,
    path: "/pipelines/new",
  },
  "/pipelines/:id": {
    title: "Pipeline",
    component: PipelineBuilder,
    path: "/pipelines/:id",
    isDynamic: true,
  },
  "/jobs": {
    title: "Jobs",
    component: JobsDashboard,
    path: "/jobs",
  },
  "/jobs/new": {
    title: "New Job",
    component: JobDetail,
    path: "/jobs/new",
  },
  "/jobs/:id": {
    title: "Job Detail",
    component: JobDetail,
    path: "/jobs/:id",
    isDynamic: true,
  },
  "/calendar": {
    title: "Calendar",
    component: CalendarPage,
    path: "/calendar",
  },
  "/automations": {
    title: "Automations",
    component: AutomationsDashboard,
    path: "/automations",
  },
  "/testing": {
    title: "Testing Playground",
    component: TestingDashboard,
    path: "/testing",
  },
  "/testing/handsontable": {
    title: "Handsontable Demo",
    component: HandsontableDemo,
    path: "/testing/handsontable",
  },
  "/testing/tanstack": {
    title: "TanStack Table Demo",
    component: TanStackTableDemo,
    path: "/testing/tanstack",
  },
  "/testing/ag-grid": {
    title: "AG Grid Demo",
    component: AgGridDemo,
    path: "/testing/ag-grid",
  },
  "/testing/syncfusion": {
    title: "Syncfusion Grid Demo",
    component: SyncfusionGridDemo,
    path: "/testing/syncfusion",
  },
  "/testing/tabulator": {
    title: "Tabulator Demo",
    component: TabulatorDemo,
    path: "/testing/tabulator",
  },
};

/**
 * Get page metadata by path
 */
export function getPageMetadata(path: string, params?: Record<string, string>): PageMetadata | null {
  // Try exact match first
  if (pageRegistry[path]) {
    return pageRegistry[path];
  }

  // Try dynamic route matching
  for (const [routePath, metadata] of Object.entries(pageRegistry)) {
    if (metadata.isDynamic) {
      const routePattern = routePath.replace(/:(\w+)/g, (_, paramName) => {
        return params?.[paramName] || `:${paramName}`;
      });
      
      // Simple pattern matching
      const routeRegex = new RegExp(
        "^" + routePath.replace(/:(\w+)/g, "([^/]+)") + "$"
      );
      
      if (routeRegex.test(path)) {
        return metadata;
      }
    }
  }

  return null;
}

/**
 * Resolve dynamic path with parameters
 */
export function resolvePath(template: string, params: Record<string, string>): string {
  let resolved = template;
  for (const [key, value] of Object.entries(params)) {
    resolved = resolved.replace(`:${key}`, value);
  }
  return resolved;
}

/**
 * Extract parameters from path using route template
 */
export function extractParams(template: string, path: string): Record<string, string> | null {
  const paramNames: string[] = [];
  const regexPattern = template.replace(/:(\w+)/g, (_, paramName) => {
    paramNames.push(paramName);
    return "([^/]+)";
  });
  
  const regex = new RegExp("^" + regexPattern + "$");
  const match = path.match(regex);
  
  if (!match) return null;
  
  const params: Record<string, string> = {};
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1];
  });
  
  return params;
}

