import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { PortalLayout } from "./components/layout/PortalLayout";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import DealDetail from "./pages/DealDetail";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Workflows from "./pages/Workflows";
import Tasks from "./pages/Tasks";
import Documents from "./pages/Documents";
import Messages from "./pages/Messages";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import DataWarehouse from "./pages/DataWarehouse";
import BankData from "./pages/data-warehouse/BankData";
import JournalEntries from "./pages/data-warehouse/JournalEntries";
import RsGeData from "./pages/data-warehouse/RsGeData";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import Calendar from "./pages/Calendar";
import { PortalAuth } from "./pages/portal/PortalAuth";
import { PortalSetup } from "./pages/portal/PortalSetup";
import { PortalDashboard } from "./pages/portal/PortalDashboard";
import { PortalMessages } from "./pages/portal/PortalMessages";
import { PortalTasks } from "./pages/portal/PortalTasks";
import { PortalDocuments } from "./pages/portal/PortalDocuments";
import { PortalBilling } from "./pages/portal/PortalBilling";
import { PortalReporting } from "./pages/portal/PortalReporting";
import { PortalTaxReport } from "./pages/portal/PortalTaxReport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Staff Authentication */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Portal Authentication (Public) */}
            <Route path="/portal/auth" element={<PortalAuth />} />
            <Route path="/portal/setup/:token" element={<PortalSetup />} />
            
            {/* Staff Routes (Protected) */}
            <Route
              element={
                <ProtectedRoute requireStaffRole={true}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/crm/deals/:id" element={<DealDetail />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/data-warehouse" element={<DataWarehouse />} />
              <Route path="/data-warehouse/bank-data" element={<BankData />} />
              <Route path="/data-warehouse/journal-entries" element={<JournalEntries />} />
              <Route path="/data-warehouse/rs-ge-data" element={<RsGeData />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>
            
            {/* Client Portal Routes (Protected) */}
            <Route
              element={
                <ProtectedRoute requireClientRole={true}>
                  <PortalLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/portal/dashboard" element={<PortalDashboard />} />
              <Route path="/portal/messages" element={<PortalMessages />} />
              <Route path="/portal/tasks" element={<PortalTasks />} />
              <Route path="/portal/documents" element={<PortalDocuments />} />
              <Route path="/portal/billing" element={<PortalBilling />} />
              <Route path="/portal/reporting" element={<PortalReporting />} />
              <Route path="/portal/tax-report" element={<PortalTaxReport />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
