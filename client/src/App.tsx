import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { MessengerProvider } from "@/contexts/MessengerContext";
import { ThemeProvider } from "next-themes";
import { useLayoutPreference } from "@/hooks/useLayoutPreference";
import "./lib/i18n";
import "./lib/suppressWarnings";
import Login from "@/pages/Login";
import Setup from "@/pages/Setup";
import AppLayout from "@/components/layout/AppLayout";
import SimplePageLayout from "@/components/layout/SimplePageLayout";
import NotFound from "@/pages/not-found";
import Profile from "@/pages/Profile";
import CompanyProfile from "@/pages/CompanyProfile";
import { ClientPortalLogin } from "@/pages/client-portal/ClientPortalLogin";
import { ClientPortalDashboard } from "@/pages/client-portal/ClientPortalDashboard";
import { ClientPortalDocuments } from "@/pages/client-portal/ClientPortalDocuments";
import { ClientPortalTasks } from "@/pages/client-portal/ClientPortalTasks";
import { ClientPortalForms } from "@/pages/client-portal/ClientPortalForms";
import { ClientPortalMessages } from "@/pages/client-portal/ClientPortalMessages";
import { ClientPortalInvoices } from "@/pages/client-portal/ClientPortalInvoices";

// Top Level & Practice Management
import Home from "@/pages/Home";
import CRM from "@/pages/CRM";
import Clients from "@/pages/admin/Clients";
import PipelinesDashboard from "@/pages/pipelines/PipelinesDashboard";
import TasksDashboard from "@/pages/tasks/TasksDashboard";
import Messages from "@/pages/Messages";
import Calendar from "@/pages/Calendar";

// Data Warehouse
import ChartOfAccounts from "@/pages/accounting/ChartOfAccounts";
import JournalEntriesPage from "@/pages/accounting/JournalEntriesPage";
import BankAccounts from "@/pages/bank/BankAccounts";
import FinancialStatements from "@/pages/reports/FinancialStatements";
import AuditDashboard from "@/pages/audit/AuditDashboard";

// Admin
import GlobalAdministration from "@/pages/admin/GlobalAdministration";
import UserManagement from "@/pages/admin/UserManagement";
import RoleManagement from "@/pages/admin/RoleManagement";
import PermissionsManagement from "@/pages/admin/PermissionsManagement";

// Additional Pages
import JobsDashboard from "@/pages/jobs/JobsDashboard";
// import Automations from "@/pages/Automations"; // TODO: Create this page
// import EmailInbox from "@/pages/EmailInbox"; // TODO: Create this page
import MSSQLImport from "@/pages/admin/MSSQLImport";
import ClientImport from "@/pages/admin/ClientImport";
import ImportStatement from "@/pages/bank/ImportStatement";
import RSIntegrationDashboard from "@/pages/rs/RSIntegrationDashboard";
import RSAdmin from "@/pages/rs/RSAdmin";
import Notifications from "@/pages/Notifications";
import Storage from "@/pages/admin/Storage";
import BackupRestore from "@/pages/admin/BackupRestore";
import TestingDashboard from "@/pages/testing/TestingDashboard";

// Extra pages (not in sidebar but accessible)
import BankReconciliation from "@/pages/accounting/BankReconciliation";
import Invoices from "@/pages/accounting/Invoices";
import Sales from "@/pages/accounting/Sales";
import Purchases from "@/pages/accounting/Purchases";
import AccountsReceivable from "@/pages/accounting/AccountsReceivable";
import AccountsPayable from "@/pages/accounting/AccountsPayable";

function ProtectedApp() {
  const { user, isLoading, needsSetup } = useAuth();
  const [location] = useLocation();
  const { useFlexLayout } = useLayoutPreference();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // If setup is needed, redirect to setup page
  if (needsSetup) {
    return <Setup />;
  }

  // Profile and Settings pages should always render outside FlexLayout
  if (location === "/profile") {
    return (
      <SimplePageLayout>
        <Profile />
      </SimplePageLayout>
    );
  }

  if (location === "/settings") {
    return (
      <SimplePageLayout>
        <CompanyProfile />
      </SimplePageLayout>
    );
  }

  // If user prefers simple layout, render all pages in SimplePageLayout
  if (!useFlexLayout) {
    return (
      <SimplePageLayout>
        <Switch>
          {/* Home */}
          <Route path="/" component={Home} />
          <Route path="/home" component={Home} />

          {/* Practice Management */}
          <Route path="/crm" component={CRM} />
          <Route path="/clients" component={Clients} />
          <Route path="/pipelines" component={PipelinesDashboard} />
          <Route path="/tasks" component={TasksDashboard} />
          <Route path="/messages" component={Messages} />
          <Route path="/calendar" component={Calendar} />

          {/* Data Warehouse - Using CORRECT paths from navigation.ts */}
          <Route path="/accounting/chart-of-accounts" component={ChartOfAccounts} />
          <Route path="/accounting/journal-entries" component={JournalEntriesPage} />
          <Route path="/bank/accounts" component={BankAccounts} />
          <Route path="/financial-statements" component={FinancialStatements} />
          <Route path="/audit" component={AuditDashboard} />

          {/* Admin - Using CORRECT paths from navigation.ts */}
          <Route path="/global-administration" component={GlobalAdministration} />
          <Route path="/user-management" component={UserManagement} />
          <Route path="/permissions-management" component={PermissionsManagement} />
          <Route path="/admin/import-clients" component={ClientImport} />

          {/* Additional Pages */}
          <Route path="/jobs" component={JobsDashboard} />
          {/* <Route path="/automations" component={Automations} /> */}
          {/* <Route path="/email" component={EmailInbox} /> */}
          <Route path="/mssql-import" component={MSSQLImport} />
          <Route path="/bank/import" component={ImportStatement} />
          <Route path="/rs-integration" component={RSIntegrationDashboard} />
          <Route path="/rs-admin" component={RSAdmin} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/storage" component={Storage} />
          <Route path="/backup-restore" component={BackupRestore} />
          <Route path="/testing" component={TestingDashboard} />

          {/* Extra pages (not in sidebar but accessible) */}
          <Route path="/bank-reconciliation" component={BankReconciliation} />
          <Route path="/invoices" component={Invoices} />
          <Route path="/sales" component={Sales} />
          <Route path="/purchases" component={Purchases} />
          <Route path="/accounts-receivable" component={AccountsReceivable} />
          <Route path="/accounts-payable" component={AccountsPayable} />
          <Route path="/roles-management" component={RoleManagement} />

          {/* 404 */}
          <Route component={NotFound} />
        </Switch>
      </SimplePageLayout>
    );
  }

  // All other protected routes are handled by FlexLayout tabs
  // Use current location as default path, or /home as fallback
  const defaultPath = location && location !== "/" && location !== "/login" && location !== "/setup"
    ? location
    : "/home";

  return <AppLayout defaultPath={defaultPath} />;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/setup" component={Setup} />

      {/* Client Portal Routes (no auth required - uses client portal auth) */}
      <Route path="/client-portal/login" component={ClientPortalLogin} />
      <Route path="/client-portal/dashboard" component={ClientPortalDashboard} />
      <Route path="/client-portal/documents" component={ClientPortalDocuments} />
      <Route path="/client-portal/tasks" component={ClientPortalTasks} />
      <Route path="/client-portal/forms" component={ClientPortalForms} />
      <Route path="/client-portal/messages" component={ClientPortalMessages} />
      <Route path="/client-portal/invoices" component={ClientPortalInvoices} />

      {/* All other routes are protected and handled by Golden Layout */}
      <Route path="/:rest*" component={ProtectedApp} />
      <Route component={ProtectedApp} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <MessengerProvider>
            <Toaster />
            <Router />
          </MessengerProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
