import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { MessengerProvider } from "@/contexts/MessengerContext";
import "./lib/i18n";
import "./lib/suppressWarnings";
import Login from "@/pages/Login";
import Setup from "@/pages/Setup";
import AppLayout from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import { ClientPortalLogin } from "@/pages/client-portal/ClientPortalLogin";
import { ClientPortalDashboard } from "@/pages/client-portal/ClientPortalDashboard";
import { ClientPortalDocuments } from "@/pages/client-portal/ClientPortalDocuments";
import { ClientPortalTasks } from "@/pages/client-portal/ClientPortalTasks";
import { ClientPortalForms } from "@/pages/client-portal/ClientPortalForms";
import { ClientPortalMessages } from "@/pages/client-portal/ClientPortalMessages";
import { ClientPortalInvoices } from "@/pages/client-portal/ClientPortalInvoices";

function ProtectedApp() {
  const { user, isLoading, needsSetup } = useAuth();
  const [location] = useLocation();

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

  // All protected routes are handled by Golden Layout tabs
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
      <TooltipProvider>
        <MessengerProvider>
          <Toaster />
          <Router />
        </MessengerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
