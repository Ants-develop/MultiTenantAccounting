import {
    LayoutDashboard,
    Activity,
    Building2,
    CheckSquare,
    List,
    FileText,
    Calendar,
    Zap,
    Mail,
    Book,
    File,
    University,
    Scale,
    ChartBar,
    Settings,
    Globe,
    Users,
    Shield,
    MessageSquare,
    Database,
    Upload,
    Bell,
    Link,
    Archive,
    HardDrive,
    Lock,
    CreditCard,
    FileCheck,
    FileBarChart,
    Landmark
} from "lucide-react";

export interface NavigationItem {
    name: string;
    href: string;
    icon: any;
    permission?: string;
    requiresGlobalAdmin?: boolean;
}

export const topLevelNavigation: NavigationItem[] = [
    {
        name: "Dashboard",
        href: "/home",
        icon: LayoutDashboard,
        permission: "DASHBOARD_VIEW",
    },
];

export const practiceManagementNavigation: NavigationItem[] = [
    {
        name: "Feed",
        href: "/feed",
        icon: Activity,
        permission: "SYSTEM_VIEW_ALL_COMPANIES",
    },
    {
        name: "Feed (Bitrix24)",
        href: "/feed-bitrix",
        icon: Activity,
        permission: "SYSTEM_VIEW_ALL_COMPANIES",
    },
    {
        name: "CRM",
        href: "/crm",
        icon: Users,
        permission: "SYSTEM_VIEW_ALL_COMPANIES",
    },
    {
        name: "Clients",
        href: "/clients",
        icon: Building2,
        permission: "SYSTEM_VIEW_ALL_COMPANIES",
    },
    {
        name: "Workflows",
        href: "/workflows",
        icon: List,
        permission: "TASKS_VIEW",
    },
    {
        name: "Tasks",
        href: "/tasks",
        icon: CheckSquare,
        permission: "TASKS_VIEW",
    },
    {
        name: "Messages",
        href: "/messages",
        icon: MessageSquare,
        permission: "SYSTEM_VIEW_ALL_COMPANIES",
    },
    {
        name: "Calendar",
        href: "/calendar",
        icon: Calendar,
        permission: "TASKS_VIEW",
    },
    {
        name: "Passwords",
        href: "/passwords",
        icon: Lock,
        permission: "SYSTEM_VIEW_ALL_COMPANIES",
    },
    {
        name: "Billing",
        href: "/billing",
        icon: CreditCard,
        permission: "SYSTEM_VIEW_ALL_COMPANIES",
    },
];

export const aiBookkeepingNavigation: NavigationItem[] = [
    {
        name: "Journal Entries",
        href: "/accounting/journal-entries",
        icon: Book,
        permission: "JOURNAL_VIEW",
    },
    {
        name: "Chart of Accounts",
        href: "/accounting/chart-of-accounts",
        icon: List,
        permission: "ACCOUNTS_VIEW",
    },
];

export const dataWarehouseNavigation: NavigationItem[] = [
    {
        name: "Bank Data",
        href: "/bank/accounts",
        icon: University,
        permission: "BANK_VIEW",
    },
    {
        name: "rs.ge Data",
        href: "/rs-data",
        icon: Database,
        permission: "SYSTEM_VIEW_ALL_COMPANIES",
    },
    {
        name: "Documents",
        href: "/documents",
        icon: File,
        permission: "SYSTEM_VIEW_ALL_COMPANIES",
    },
];

export const reportingNavigation: NavigationItem[] = [
    {
        name: "Financial Reports",
        href: "/financial-statements",
        icon: ChartBar,
        permission: "REPORTING_VIEW",
    },
    {
        name: "Managerial Reports",
        href: "/reporting/managerial-reports",
        icon: ChartBar,
        permission: "REPORTING_VIEW",
    },
    {
        name: "Tax Declarations",
        href: "/reporting/tax-declarations",
        icon: FileCheck,
        permission: "REPORTING_VIEW",
    },
];

export const auditNavigation: NavigationItem[] = [
    {
        name: "Check Bank",
        href: "/audit/bank-transactions",
        icon: Shield,
        permission: "SYSTEM_VIEW_ALL_COMPANIES",
    },
    {
        name: "Check Rs.ge",
        href: "/audit/rs-ge",
        icon: Shield,
        permission: "SYSTEM_VIEW_ALL_COMPANIES",
    },
    {
        name: "Check Journals",
        href: "/audit/journal-entries",
        icon: Shield,
        permission: "SYSTEM_VIEW_ALL_COMPANIES",
    },
];

export const bottomNavigation: NavigationItem[] = [
    {
        name: "Settings",
        href: "/settings",
        icon: Settings,
        permission: "SETTINGS_VIEW",
    },
];

export const adminNavigation: NavigationItem[] = [
    {
        name: "Global Admin",
        href: "/global-administration",
        icon: Globe,
        requiresGlobalAdmin: true,
    },
    {
        name: "User Management",
        href: "/user-management",
        icon: Users,
        permission: "USER_VIEW",
    },
    {
        name: "Permissions",
        href: "/permissions-management",
        icon: Shield,
        requiresGlobalAdmin: true,
    },
    {
        name: "Supabase Status",
        href: "/admin/supabase-status",
        icon: Database,
        requiresGlobalAdmin: true,
    },
];

export const additionalPagesNavigation: NavigationItem[] = [
    {
        name: "Jobs",
        href: "/jobs",
        icon: FileText,
        permission: "TASKS_VIEW",
    },
    {
        name: "Automations",
        href: "/automations",
        icon: Zap,
        permission: "TASKS_VIEW",
    },
    {
        name: "MSSQL Import",
        href: "/mssql-import",
        icon: Database,
        requiresGlobalAdmin: true,
    },
    {
        name: "Backup Restore",
        href: "/backup-restore",
        icon: Archive,
        requiresGlobalAdmin: true,
    },
    {
        name: "Storage",
        href: "/storage",
        icon: HardDrive,
        requiresGlobalAdmin: true,
    },
    {
        name: "Testing",
        href: "/testing",
        icon: Activity,
        requiresGlobalAdmin: true,
    }
];

// Combined navigation for search and quick access
export const allNavigation: NavigationItem[] = [
    ...topLevelNavigation,
    ...practiceManagementNavigation,
    ...aiBookkeepingNavigation,
    ...dataWarehouseNavigation,
    ...reportingNavigation,
    ...auditNavigation,
    ...bottomNavigation,
    ...adminNavigation,
    ...additionalPagesNavigation,
];
