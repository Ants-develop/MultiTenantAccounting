import { Link, useLocation } from "wouter";
import { Calculator, BarChart3, List, Book, File, Receipt, 
         University, Edit, FileText, DollarSign, ChartBar, 
         Scale, PieChart, Users, Settings, Shield, Globe, 
         ChevronLeft, ChevronRight, Database, FileSearch, MessageSquare, 
         CheckSquare, User, Plus, KeyRound, Beaker, Table } from "lucide-react";
// CompanySwitcher removed - no longer needed in single-company mode
import { usePermissions } from "@/hooks/usePermissions";
import { useSidebar } from "@/hooks/useSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  permission?: string;
  requiresGlobalAdmin?: boolean;
}

const navigation: NavigationItem[] = [
  {
    name: "navigation.globalAdministration",
    href: "/global-administration",
    icon: Globe,
    permission: "SYSTEM_VIEW_ALL_COMPANIES",
  },
  {
    name: "Company Profile",
    href: "/company-profile",
    icon: Building2,
    permission: "SETTINGS_VIEW",
  },
  {
    name: "navigation.dashboard",
    href: "/home",
    icon: BarChart3,
    permission: "DASHBOARD_VIEW",
  },
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

// Reporting Module
const reportingSection: NavigationItem[] = [
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

// Messenger Module
const messengerSection: NavigationItem[] = [
  {
    name: "Messages",
    href: "/chat",
    icon: MessageSquare,
    permission: "CHAT_VIEW",
  },
];

// Tasks Module
const tasksSection: NavigationItem[] = [
  {
    name: "My Tasks",
    href: "/tasks/my",
    icon: User,
    permission: "TASKS_VIEW",
  },
  {
    name: "All Tasks",
    href: "/tasks",
    icon: CheckSquare,
    permission: "TASKS_VIEW",
  },
  {
    name: "Create Task",
    href: "/tasks/new",
    icon: Plus,
    permission: "TASKS_CREATE",
  },
];

// Administration Section
const adminSection: NavigationItem[] = [
  {
    name: "navigation.userManagement",
    href: "/user-management",
    icon: Users,
    permission: "USER_VIEW",
  },
  {
    name: "navigation.roleManagement",
    href: "/role-management",
    icon: Shield,
    permission: "USER_VIEW",
  },
  {
    name: "MSSQL Import",
    href: "/mssql-import",
    icon: Database,
    permission: "JOURNAL_VIEW",
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

export default function Sidebar() {
  const [location] = useLocation();
  const { can, isGlobalAdministrator } = usePermissions();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { t } = useTranslation();

  const isActive = (href: string) => {
    return location === href || (href !== "/dashboard" && location.startsWith(href));
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
                <p>AccountFlow Pro</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {!isCollapsed && (
            <>
              <h1 className="text-lg font-semibold text-foreground ml-3">AccountFlow Pro</h1>
            </>
          )}
        </div>
      </div>

      {/* Scrollable Navigation Menu */}
      <ScrollArea className="flex-1">
        <nav className={`px-4 py-4 space-y-2 pb-6 ${isCollapsed ? 'px-2' : ''}`}>
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
            
            {/* Accounting Module */}
            {getVisibleItems(accountingSection).length > 0 && (
              <div className="mt-6">
                {!isCollapsed && <p className="accounting-nav-section">{t('sidebar.accounting')}</p>}
                {getVisibleItems(accountingSection).map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            )}

            {/* Audit Module */}
            {getVisibleItems(auditSection).length > 0 && (
              <div className="mt-6">
                {!isCollapsed && <p className="accounting-nav-section">Audit</p>}
                {getVisibleItems(auditSection).map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            )}

            {/* RS Integration Module */}
            {getVisibleItems(rsSection).length > 0 && (
              <div className="mt-6">
                {!isCollapsed && <p className="accounting-nav-section">RS Integration</p>}
                {getVisibleItems(rsSection).map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            )}

            {/* Reporting Module */}
            {getVisibleItems(reportingSection).length > 0 && (
              <div className="mt-6">
                {!isCollapsed && <p className="accounting-nav-section">Reporting</p>}
                {getVisibleItems(reportingSection).map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            )}

            {/* Bank Module */}
            {getVisibleItems(bankSection).length > 0 && (
              <div className="mt-6">
                {!isCollapsed && <p className="accounting-nav-section">Bank</p>}
                {getVisibleItems(bankSection).map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            )}

            {/* Messenger Module */}
            {getVisibleItems(messengerSection).length > 0 && (
              <div className="mt-6">
                {!isCollapsed && <p className="accounting-nav-section">Messenger</p>}
                {getVisibleItems(messengerSection).map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            )}

            {/* Tasks Module */}
            {getVisibleItems(tasksSection).length > 0 && (
              <div className="mt-6">
                {!isCollapsed && <p className="accounting-nav-section">Tasks</p>}
                {getVisibleItems(tasksSection).map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            )}

            {/* Administration Section */}
            {getVisibleItems(adminSection).length > 0 && (
              <div className="mt-6">
                {!isCollapsed && <p className="accounting-nav-section">{t('sidebar.administration')}</p>}
                {getVisibleItems(adminSection).map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </div>
            )}

            {/* Testing Section */}
            {getVisibleItems(testingSection).length > 0 && (
              <div className="mt-6">
                {!isCollapsed && <p className="accounting-nav-section">Testing</p>}
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
