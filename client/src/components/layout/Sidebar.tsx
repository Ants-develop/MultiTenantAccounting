import { Link, useLocation } from "wouter";
import { Calculator, BarChart3, List, Book, File, Receipt, 
         University, Edit, FileText, DollarSign, ChartBar, 
         Scale, PieChart, Users, Settings, Shield, Globe, 
         ChevronLeft, ChevronRight, Database, FileSearch, MessageSquare, 
         CheckSquare, User, Plus, KeyRound, Beaker, Table, Building2, Calendar,
         Mail, CreditCard, FolderOpen, ChevronDown, ChevronUp, Zap } from "lucide-react";
// CompanySwitcher removed - no longer needed in single-company mode
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/hooks/useSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "react-i18next";
import { useState } from "react";

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  permission?: string;
  requiresGlobalAdmin?: boolean;
}

interface NavigationModule {
  id: string;
  name: string;
  icon: any;
  items: NavigationItem[];
  defaultOpen?: boolean;
}

// Dashboard (always visible at top)
const dashboardItem: NavigationItem = {
  name: "navigation.dashboard",
  href: "/home",
  icon: BarChart3,
  permission: "DASHBOARD_VIEW",
};

// Client Management (CRM) Module
const clientManagementSection: NavigationItem[] = [
  {
    name: "Clients",
    href: "/clients",
    icon: Building2,
    permission: "SYSTEM_VIEW_ALL_COMPANIES",
  },
  // Placeholder for future client management features
  // {
  //   name: "Client Documents",
  //   href: "/clients/documents",
  //   icon: FolderOpen,
  // },
  // {
  //   name: "Client Onboarding",
  //   href: "/clients/onboarding",
  //   icon: User,
  // },
];

// Workflow & Tasks Module
const workflowTasksSection: NavigationItem[] = [
  {
    name: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    permission: "TASKS_VIEW",
  },
  {
    name: "Pipelines",
    href: "/pipelines",
    icon: List,
    permission: "TASKS_VIEW",
  },
  {
    name: "Jobs",
    href: "/jobs",
    icon: FileText,
    permission: "TASKS_VIEW",
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: Calendar,
    permission: "TASKS_VIEW",
  },
  {
    name: "Automations",
    href: "/automations",
    icon: Zap,
    permission: "TASKS_VIEW",
  },
];

// Communication Module
const communicationSection: NavigationItem[] = [
  {
    name: "Email Inbox",
    href: "/email",
    icon: Mail,
    permission: "SYSTEM_VIEW_ALL_COMPANIES", // TODO: Add proper email permission
  },
  // Placeholder for future communication features
  // {
  //   name: "Messages",
  //   href: "/messages",
  //   icon: MessageSquare,
  // },
];

// Accounting Module
const accountingSection: NavigationItem[] = [
  {
    name: "navigation.chartOfAccounts",
    href: "/accounting/chart-of-accounts",
    icon: List,
    permission: "ACCOUNTS_VIEW",
  },
  {
    name: "navigation.journalEntries",
    href: "/accounting/journal-entries",
    icon: Book,
    permission: "JOURNAL_VIEW",
  },
  {
    name: "გატარებების ჟურნალი Syncfusion",
    href: "/accounting/journal-entries-syncfusion",
    icon: Book,
    permission: "JOURNAL_VIEW",
  },
  {
    name: "navigation.accountsReceivable",
    href: "/accounting/accounts-receivable",
    icon: File,
    permission: "CUSTOMERS_VIEW",
  },
  {
    name: "navigation.accountsPayable",
    href: "/accounting/accounts-payable",
    icon: Receipt,
    permission: "VENDORS_VIEW",
  },
  {
    name: "navigation.invoices",
    href: "/accounting/invoices",
    icon: File,
    permission: "INVOICES_VIEW",
  },
  {
    name: "Bills",
    href: "/bills",
    icon: FileText,
    permission: "BILLS_VIEW",
  },
];

// Audit Module
const auditSection: NavigationItem[] = [
  {
    name: "navigation.audit",
    href: "/audit",
    icon: FileSearch,
    permission: "AUDIT_VIEW",
  },
];

// RS Integration Module
const rsSection: NavigationItem[] = [
  {
    name: "RS Integration",
    href: "/rs-integration",
    icon: Database,
    permission: "RS_VIEW",
  },
  {
    name: "RS Administration",
    href: "/rs-admin",
    icon: KeyRound,
    requiresGlobalAdmin: true,
  },
];

// Reporting & Analytics Module
const reportingAnalyticsSection: NavigationItem[] = [
  {
    name: "navigation.audit",
    href: "/audit",
    icon: FileSearch,
    permission: "AUDIT_VIEW",
  },
  {
    name: "Trial Balance",
    href: "/trial-balance",
    icon: Scale,
    permission: "REPORTING_VIEW",
  },
  {
    name: "navigation.financialStatements",
    href: "/financial-statements",
    icon: ChartBar,
    permission: "REPORTING_VIEW",
  },
  {
    name: "Custom Reports",
    href: "/custom-reports",
    icon: PieChart,
    permission: "REPORTING_CUSTOM",
  },
];

// Bank Module
const bankSection: NavigationItem[] = [
  {
    name: "Bank Accounts",
    href: "/bank/accounts",
    icon: University,
    permission: "BANK_VIEW",
  },
  {
    name: "Bank Reconciliation",
    href: "/bank/reconciliation",
    icon: Edit,
    permission: "BANK_RECONCILE",
  },
  {
    name: "Import Statement",
    href: "/bank/import",
    icon: Receipt,
    permission: "BANK_IMPORT",
  },
];

// Billing & Payments Module
const billingPaymentsSection: NavigationItem[] = [
  {
    name: "navigation.invoices",
    href: "/accounting/invoices",
    icon: CreditCard,
    permission: "INVOICES_VIEW",
  },
  // Placeholder for future billing features
  // {
  //   name: "Payments",
  //   href: "/billing/payments",
  //   icon: CreditCard,
  // },
  // {
  //   name: "Subscriptions",
  //   href: "/billing/subscriptions",
  //   icon: DollarSign,
  // },
];

// Administration Module
const administrationSection: NavigationItem[] = [
  {
    name: "navigation.globalAdministration",
    href: "/global-administration",
    icon: Globe,
    permission: "SYSTEM_VIEW_ALL_COMPANIES",
  },
  {
    name: "navigation.userManagement",
    href: "/user-management",
    icon: Users,
    permission: "USER_VIEW",
  },
  {
    name: "Permissions",
    href: "/permissions-management",
    icon: Shield,
    permission: "SYSTEM_VIEW_ALL_COMPANIES",
  },
  {
    name: "Company Profile",
    href: "/company-profile",
    icon: Building2,
    permission: "SETTINGS_VIEW",
  },
  {
    name: "MSSQL Import",
    href: "/mssql-import",
    icon: Database,
    permission: "JOURNAL_VIEW",
  },
];

// Module definitions with icons
const MODULES: NavigationModule[] = [
  {
    id: 'client-management',
    name: 'Client Management',
    icon: Building2,
    items: clientManagementSection,
  },
  {
    id: 'workflow-tasks',
    name: 'Workflow & Tasks',
    icon: CheckSquare,
    items: workflowTasksSection,
  },
  {
    id: 'communication',
    name: 'Communication',
    icon: MessageSquare,
    items: communicationSection,
  },
  {
    id: 'accounting',
    name: 'Accounting',
    icon: Book,
    items: accountingSection,
  },
  {
    id: 'billing-payments',
    name: 'Billing & Payments',
    icon: CreditCard,
    items: billingPaymentsSection,
  },
  {
    id: 'reporting-analytics',
    name: 'Reporting & Analytics',
    icon: ChartBar,
    items: reportingAnalyticsSection,
  },
  {
    id: 'administration',
    name: 'Administration',
    icon: Settings,
    items: administrationSection,
  },
];

// Testing Module
const testingSection: NavigationItem[] = [
  {
    name: "Testing Playground",
    href: "/testing",
    icon: Beaker,
    requiresGlobalAdmin: true,
  },
  {
    name: "Handsontable Demo",
    href: "/testing/handsontable",
    icon: Calculator,
    requiresGlobalAdmin: true,
  },
  {
    name: "TanStack Table Demo",
    href: "/testing/tanstack",
    icon: List,
    requiresGlobalAdmin: true,
  },
  {
    name: "AG Grid Demo",
    href: "/testing/ag-grid",
    icon: BarChart3,
    requiresGlobalAdmin: true,
  },
  {
    name: "Syncfusion Grid Demo",
    href: "/testing/syncfusion",
    icon: Table,
    requiresGlobalAdmin: true,
  },
  {
    name: "Tabulator Demo",
    href: "/testing/tabulator",
    icon: FileText,
    requiresGlobalAdmin: true,
  },
];

// Get current module from route
const getCurrentModule = (path: string): string | null => {
  if (path.startsWith('/clients') || path.startsWith('/client')) return 'client-management';
  if (path.startsWith('/tasks') || path.startsWith('/pipelines') || path.startsWith('/jobs') || path.startsWith('/calendar')) return 'workflow-tasks';
  if (path.startsWith('/accounting')) return 'accounting';
  if (path.startsWith('/audit') || path.startsWith('/financial-statements') || path.startsWith('/trial-balance') || path.startsWith('/custom-reports')) return 'reporting-analytics';
  if (path.startsWith('/global-administration') || path.startsWith('/user-management') || path.startsWith('/permissions-management') || path.startsWith('/company-profile') || path.startsWith('/mssql-import')) return 'administration';
  return null;
};

export default function Sidebar() {
  const [location] = useLocation();
  const { can, isGlobalAdministrator } = usePermissions();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { t } = useTranslation();
  const { mainCompany } = useAuth();
  const currentModule = getCurrentModule(location);
  
  // Track which modules are open (default: current module or first module with items)
  const [openModules, setOpenModules] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (currentModule) {
      initial.add(currentModule);
    }
    return initial;
  });

  const toggleModule = (moduleId: string) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const isActive = (href: string) => {
    return location === href || (href !== "/dashboard" && location.startsWith(href));
  };

  const isModuleActive = (moduleId: string) => {
    return currentModule === moduleId;
  };

  const NavItem = ({ item }: { item: NavigationItem }) => {
    const Icon = item.icon;
    
    // Check permissions if permission is specified
    if (item.permission && !can(item.permission as any)) {
      return null;
    }

    if (item.requiresGlobalAdmin && !isGlobalAdministrator()) {
      return null;
    }

    const navItem = (
      <Link href={item.href}>
        <div className={`accounting-nav-item ${isActive(item.href) ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
          <Icon className="w-5 h-5" />
          {!isCollapsed && <span className="ml-3">{t(item.name)}</span>}
        </div>
      </Link>
    );

    // Always wrap in tooltip for better UX, even when expanded
    return (
      <TooltipProvider delayDuration={500}>
        <Tooltip>
          <TooltipTrigger asChild>
            {navItem}
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{t(item.name)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Filter sections based on permissions
  const getVisibleItems = (items: NavigationItem[]) => {
    return items.filter((item) => {
      if (item.requiresGlobalAdmin && !isGlobalAdministrator()) {
        return false;
      }

      if (item.permission && !can(item.permission as any)) {
        return false;
      }

      return true;
    });
  };

  // Module Section Component
  const ModuleSection = ({ module }: { module: NavigationModule }) => {
    const visibleItems = getVisibleItems(module.items);
    if (visibleItems.length === 0) return null;

    const isOpen = openModules.has(module.id);
    const isActive = isModuleActive(module.id);
    const ModuleIcon = module.icon;

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleModule(module.id)}>
        <CollapsibleTrigger asChild>
          <div
            className={`
              flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors
              ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}
              ${isCollapsed ? 'justify-center px-2' : ''}
            `}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <ModuleIcon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-sm font-medium truncate">{module.name}</span>
              )}
            </div>
            {!isCollapsed && (
              isOpen ? <ChevronUp className="w-4 h-4 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 flex-shrink-0" />
            )}
          </div>
        </CollapsibleTrigger>
        {!isCollapsed && (
          <CollapsibleContent>
            <div className="ml-7 mt-1 space-y-1">
              {visibleItems.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    );
  };

  return (
    <div className={`flex flex-col h-full accounting-sidebar transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo & Company Switcher - Fixed Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'mb-4'}`}>
          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center cursor-pointer">
                  <Calculator className="text-primary-foreground text-sm" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{mainCompany?.name || 'AccountFlow Pro'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {!isCollapsed && (
            <>
              <h1 className="text-lg font-semibold text-foreground ml-3 truncate">
                {mainCompany?.name || 'AccountFlow Pro'}
              </h1>
            </>
          )}
        </div>
      </div>

      {/* Scrollable Navigation Menu */}
      <ScrollArea className="flex-1">
        <nav className={`px-4 py-4 space-y-2 pb-6 ${isCollapsed ? 'px-2' : ''}`}>
          <div className="space-y-1">
            {/* Dashboard - Always at top */}
            {can('DASHBOARD_VIEW' as any) && (
              <NavItem item={dashboardItem} />
            )}

            {/* Module Sections */}
            <div className="space-y-1 mt-4">
              {MODULES.map((module) => (
                <ModuleSection key={module.id} module={module} />
              ))}
            </div>

            {/* Bank Module (standalone for now) */}
            {getVisibleItems(bankSection).length > 0 && (
              <div className="mt-4">
                {!isCollapsed && <p className="accounting-nav-section text-xs font-semibold text-muted-foreground uppercase mb-2">Bank</p>}
                {getVisibleItems(bankSection).map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            )}

            {/* RS Integration Module (standalone for now) */}
            {getVisibleItems(rsSection).length > 0 && (
              <div className="mt-4">
                {!isCollapsed && <p className="accounting-nav-section text-xs font-semibold text-muted-foreground uppercase mb-2">RS Integration</p>}
                {getVisibleItems(rsSection).map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            )}

            {/* Testing Section */}
            {getVisibleItems(testingSection).length > 0 && (
              <div className="mt-4">
                {!isCollapsed && <p className="accounting-nav-section text-xs font-semibold text-muted-foreground uppercase mb-2">Testing</p>}
                {getVisibleItems(testingSection).map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            )}
          </div>
        </nav>
      </ScrollArea>

      {/* Collapse Button */}
      <div className="flex-shrink-0 p-4 border-t border-border">
        <TooltipProvider delayDuration={500}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className={`w-full ${isCollapsed ? 'px-2' : ''}`}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    {t('sidebar.collapsed')}
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{isCollapsed ? t('sidebar.expanded') : t('sidebar.collapsed')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
