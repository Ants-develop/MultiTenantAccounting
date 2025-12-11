import { 
  LayoutDashboard, Users, Briefcase, CheckSquare, Calendar, MessageSquare, 
  FileText, Sparkles, Database, BarChart3, ClipboardCheck, Settings, 
  Building2, Target, Rss, Key, Bell
} from "lucide-react";

interface ModuleItem {
  name: string;
  icon: React.ReactNode;
  route: string;
  children?: ModuleItem[];
}

const modules: ModuleItem[] = [
  {
    name: "Practice Management",
    icon: <Building2 className="h-4 w-4" />,
    route: "",
    children: [
      { name: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, route: "/dashboard" },
      { name: "Feed", icon: <Rss className="h-4 w-4" />, route: "/feed" },
      { name: "CRM", icon: <Target className="h-4 w-4" />, route: "/crm" },
      { name: "Clients", icon: <Users className="h-4 w-4" />, route: "/clients" },
      { name: "Workflows", icon: <Briefcase className="h-4 w-4" />, route: "/workflows" },
      { name: "Tasks", icon: <CheckSquare className="h-4 w-4" />, route: "/tasks" },
      { name: "Calendar", icon: <Calendar className="h-4 w-4" />, route: "/calendar" },
      { name: "Messages", icon: <MessageSquare className="h-4 w-4" />, route: "/messages" },
      { name: "Documents", icon: <FileText className="h-4 w-4" />, route: "/documents" },
      { name: "Passwords", icon: <Key className="h-4 w-4" />, route: "/passwords" },
    ],
  },
  {
    name: "AI Bookkeeping",
    icon: <Sparkles className="h-4 w-4" />,
    route: "",
    children: [
      { name: "Journal Entries", icon: <FileText className="h-4 w-4" />, route: "/ai-bookkeeping/journal-entries" },
      { name: "Chart of Accounts", icon: <Database className="h-4 w-4" />, route: "/ai-bookkeeping/chart-of-accounts" },
    ],
  },
  {
    name: "Data Warehouse",
    icon: <Database className="h-4 w-4" />,
    route: "",
    children: [
      { name: "Bank Data", icon: <Database className="h-4 w-4" />, route: "/data-warehouse/bank" },
      { name: "Rs.ge Data", icon: <Database className="h-4 w-4" />, route: "/data-warehouse/rs-ge" },
    ],
  },
  {
    name: "Reporting",
    icon: <BarChart3 className="h-4 w-4" />,
    route: "",
    children: [
      { name: "Financial Reports", icon: <BarChart3 className="h-4 w-4" />, route: "/reporting/financial" },
      { name: "Managerial Reports", icon: <BarChart3 className="h-4 w-4" />, route: "/reporting/managerial" },
      { name: "Tax Declarations", icon: <FileText className="h-4 w-4" />, route: "/reporting/tax" },
    ],
  },
  {
    name: "Audit",
    icon: <ClipboardCheck className="h-4 w-4" />,
    route: "",
    children: [
      { name: "Check Bank Transactions", icon: <ClipboardCheck className="h-4 w-4" />, route: "/audit/bank-transactions" },
      { name: "Check Rs.ge", icon: <ClipboardCheck className="h-4 w-4" />, route: "/audit/rs-ge" },
      { name: "Check Journal Entries", icon: <ClipboardCheck className="h-4 w-4" />, route: "/audit/journal-entries" },
    ],
  },
  {
    name: "Administration",
    icon: <Settings className="h-4 w-4" />,
    route: "",
    children: [
      { name: "Admin Panel", icon: <Settings className="h-4 w-4" />, route: "/admin" },
      { name: "Notifications", icon: <Bell className="h-4 w-4" />, route: "/notifications" },
      { name: "Settings", icon: <Settings className="h-4 w-4" />, route: "/settings" },
    ],
  },
];

const ModuleNode = ({ module, level = 0 }: { module: ModuleItem; level?: number }) => {
  const hasChildren = module.children && module.children.length > 0;
  
  return (
    <div className={level === 0 ? "mb-4" : ""}>
      <div 
        className={`
          flex items-center gap-2 p-2 rounded-lg
          ${level === 0 
            ? "bg-primary/10 text-primary font-medium" 
            : "bg-muted/50 text-foreground hover:bg-muted"
          }
        `}
        style={{ marginLeft: level > 0 ? `${level * 16}px` : 0 }}
      >
        {module.icon}
        <span className="text-sm">{module.name}</span>
        {module.route && level > 0 && (
          <span className="text-xs text-muted-foreground ml-auto font-mono">{module.route}</span>
        )}
      </div>
      {hasChildren && (
        <div className="mt-1 space-y-1">
          {module.children?.map((child) => (
            <ModuleNode key={child.name} module={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const ModulesHierarchy = () => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {modules.map((module) => (
        <div key={module.name} className="space-y-2">
          <ModuleNode module={module} />
        </div>
      ))}
    </div>
  );
};
