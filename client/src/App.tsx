import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import "./lib/i18n";
import "./lib/suppressWarnings";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Home from "@/pages/Home";
import AppLayout from "@/components/layout/AppLayout";
import ChartOfAccounts from "@/pages/accounting/ChartOfAccounts";
import GeneralLedger from "@/pages/accounting/GeneralLedger";
import AccountsReceivable from "@/pages/accounting/AccountsReceivable";
import AccountsPayable from "@/pages/accounting/AccountsPayable";
import BankReconciliation from "@/pages/accounting/BankReconciliation";
import JournalEntries from "@/pages/accounting/JournalEntriesPage";
import AccountingOperations from "@/pages/accounting/AccountingOperations";
import Sales from "@/pages/accounting/Sales";
import Purchases from "@/pages/accounting/Purchases";
import BankStatementUpload from "@/pages/accounting/BankStatementUpload";
import Invoices from "@/pages/accounting/Invoices";
import FinancialStatements from "@/pages/reports/FinancialStatements";
import UserManagement from "@/pages/admin/UserManagement";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import RoleManagement from "@/pages/admin/RoleManagement";
import GlobalAdministration from "@/pages/admin/GlobalAdministration";
import MSSQLImport from "@/pages/admin/MSSQLImport";
import AccountingHome from "@/pages/accounting/AccountingHome";
import AuditDashboard from "@/pages/audit/AuditDashboard";
import RSIntegrationDashboard from "@/pages/rs/RSIntegrationDashboard";
import ErrorBoundary from "@/components/ErrorBoundary";
import RSAdmin from "@/pages/rs/RSAdmin";
import TestingDashboard from "@/pages/testing/TestingDashboard";
import HandsontableDemo from "@/pages/testing/HandsontableDemo";
import TanStackTableDemo from "@/pages/testing/TanStackTableDemo";
import AgGridDemo from "@/pages/testing/AgGridDemo";
import SyncfusionGridDemo from "@/pages/testing/SyncfusionGridDemo";
import TabulatorDemo from "@/pages/testing/TabulatorDemo";

function ProtectedRoute({ component: Component, hideSidebar = false }: { component: React.ComponentType; hideSidebar?: boolean }) {
  const { user, isLoading } = useAuth();

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

  return (
    <AppLayout hideSidebar={hideSidebar}>
      <ErrorBoundary>
        <Component />
      </ErrorBoundary>
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <ProtectedRoute component={Home} />} />
      <Route path="/home" component={() => <ProtectedRoute component={Home} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/accounting" component={() => <ProtectedRoute component={AccountingHome} />} />
      <Route path="/accounting/chart-of-accounts" component={() => <ProtectedRoute component={ChartOfAccounts} />} />
      <Route path="/accounting/general-ledger" component={() => <ProtectedRoute component={GeneralLedger} />} />
      <Route path="/accounting/accounts-receivable" component={() => <ProtectedRoute component={AccountsReceivable} />} />
      <Route path="/accounting/accounts-payable" component={() => <ProtectedRoute component={AccountsPayable} />} />
      <Route path="/accounting/bank-reconciliation" component={() => <ProtectedRoute component={BankReconciliation} />} />
        <Route path="/accounting/journal-entries" component={() => <ProtectedRoute component={JournalEntries} />} />
      <Route path="/accounting/accounting-operations" component={() => <ProtectedRoute component={AccountingOperations} />} />
      <Route path="/accounting/sales" component={() => <ProtectedRoute component={Sales} />} />
      <Route path="/accounting/purchases" component={() => <ProtectedRoute component={Purchases} />} />
      <Route path="/accounting/bank-statement-upload" component={() => <ProtectedRoute component={BankStatementUpload} />} />
      <Route path="/accounting/invoices" component={() => <ProtectedRoute component={Invoices} />} />
      <Route path="/financial-statements" component={() => <ProtectedRoute component={FinancialStatements} />} />
      <Route path="/user-management" component={() => <ProtectedRoute component={UserManagement} />} />
      <Route path="/role-management" component={() => <ProtectedRoute component={RoleManagement} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/global-administration" component={() => <ProtectedRoute component={GlobalAdministration} />} />
      <Route path="/mssql-import" component={() => <ProtectedRoute component={MSSQLImport} />} />
      <Route path="/audit" component={() => <ProtectedRoute component={AuditDashboard} />} />
      <Route path="/rs-integration" component={() => <ProtectedRoute component={RSIntegrationDashboard} />} />
      <Route path="/rs-admin" component={() => <ProtectedRoute component={RSAdmin} />} />
      <Route path="/testing" component={() => <ProtectedRoute component={TestingDashboard} />} />
      <Route path="/testing/handsontable" component={() => <ProtectedRoute component={HandsontableDemo} hideSidebar={true} />} />
      <Route path="/testing/tanstack" component={() => <ProtectedRoute component={TanStackTableDemo} hideSidebar={true} />} />
      <Route path="/testing/ag-grid" component={() => <ProtectedRoute component={AgGridDemo} hideSidebar={true} />} />
      <Route path="/testing/syncfusion" component={() => <ProtectedRoute component={SyncfusionGridDemo} hideSidebar={true} />} />
      <Route path="/testing/tabulator" component={() => <ProtectedRoute component={TabulatorDemo} hideSidebar={true} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
