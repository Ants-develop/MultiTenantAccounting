import {
    LayoutDashboard,
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
    HardDrive
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
        href: "/pipelines",
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
];

export const dataWarehouseNavigation: NavigationItem[] = [
    {
        name: "Chart of Accounts",
        href: "/accounting/chart-of-accounts",
        icon: List,
        permission: "ACCOUNTS_VIEW",
    },
    {
        name: "Journal Entries",
        href: "/accounting/journal-entries",
        icon: Book,
        permission: "JOURNAL_VIEW",
    },
    {
        name: "Bank Accounts",
        href: "/bank/accounts",
        icon: University,
        permission: "BANK_VIEW",
    },
    {
        name: "Financial Statements",
        href: "/financial-statements",
        icon: ChartBar,
        permission: "REPORTING_VIEW",
    },
    {
        name: "Audit",
        href: "/audit",
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
        name: "Email Inbox",
        href: "/email",
        icon: Mail,
        permission: "SYSTEM_VIEW_ALL_COMPANIES",
    },
    {
        name: "MSSQL Import",
        href: "/mssql-import",
        icon: Database,
        requiresGlobalAdmin: true,
    },
    {
        name: "Backup & Restore",
        href: "/backup-restore",
        icon: Archive,
        requiresGlobalAdmin: true,
    },
    {
        name: "Bank Import",
        href: "/bank/import",
        icon: Upload,
        permission: "BANK_VIEW",
    },
    {
        name: "RS Integration",
        href: "/rs-integration",
        icon: Link,
        permission: "SYSTEM_VIEW_ALL_COMPANIES",
    },
    {
        name: "RS Admin",
        href: "/rs-admin",
        icon: Shield,
        requiresGlobalAdmin: true,
    },
    {
        name: "Notifications",
        href: "/notifications",
        icon: Bell,
        permission: "SYSTEM_VIEW_ALL_COMPANIES",
    },
    {
        name: "Storage",
        href: "/storage",
        icon: HardDrive,
        permission: "STORAGE_VIEW",
    },
    {
        name: "Testing",
        href: "/testing",
        icon: Building2,
        requiresGlobalAdmin: true,
    },
];

export const allNavigation = [
    ...topLevelNavigation,
    ...practiceManagementNavigation,
    ...dataWarehouseNavigation,
    ...bottomNavigation,
    ...adminNavigation,
];
