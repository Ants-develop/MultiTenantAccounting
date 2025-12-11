import { Shield, Crown, Users, Eye, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RoleInfo {
  name: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  permissions: string[];
  description: string;
}

const roles: RoleInfo[] = [
  {
    name: "admin",
    label: "Admin",
    icon: <Crown className="h-5 w-5" />,
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    description: "Full system access with user management capabilities",
    permissions: ["Full access to all modules", "User & role management", "System configuration", "Audit log access"],
  },
  {
    name: "manager",
    label: "Manager",
    icon: <Shield className="h-5 w-5" />,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    description: "Team oversight with management permissions",
    permissions: ["Manage workflows & clients", "Review & approve work", "Team assignment", "Report generation"],
  },
  {
    name: "accountant",
    label: "Accountant",
    icon: <UserCheck className="h-5 w-5" />,
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    description: "Core bookkeeping and client work execution",
    permissions: ["Execute bookkeeping tasks", "Manage journal entries", "Client communication", "Document management"],
  },
  {
    name: "reviewer",
    label: "Reviewer",
    icon: <Eye className="h-5 w-5" />,
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    description: "Quality control and review access",
    permissions: ["View all work items", "Add review comments", "Approve/reject entries", "Limited edit access"],
  },
  {
    name: "client",
    label: "Client",
    icon: <Users className="h-5 w-5" />,
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    description: "External client with portal access only",
    permissions: ["View own data only", "Upload documents", "Message staff", "Track workflow progress"],
  },
];

const permissionLevels = [
  { level: "none", label: "No Access", description: "Module is hidden" },
  { level: "view", label: "View Only", description: "Read-only access" },
  { level: "edit", label: "Edit", description: "Create and modify records" },
  { level: "manage", label: "Manage", description: "Full CRUD + assignments" },
  { level: "full", label: "Full Access", description: "All permissions + admin" },
];

export const UserRolesDiagram = () => {
  return (
    <div className="space-y-8">
      {/* Role Hierarchy */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Role Hierarchy</h4>
        <div className="flex flex-wrap gap-4">
          {roles.map((role, index) => (
            <div key={role.name} className="flex items-center gap-2">
              <div className={`p-4 rounded-xl border ${role.color} min-w-[180px]`}>
                <div className="flex items-center gap-2 mb-2">
                  {role.icon}
                  <span className="font-semibold">{role.label}</span>
                </div>
                <p className="text-xs opacity-80 mb-3">{role.description}</p>
                <ul className="text-xs space-y-1">
                  {role.permissions.map((perm) => (
                    <li key={perm} className="flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>
              {index < roles.length - 1 && (
                <span className="text-muted-foreground hidden lg:block">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Permission Levels */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Permission Levels</h4>
        <div className="flex flex-wrap gap-3">
          {permissionLevels.map((level, index) => (
            <div key={level.level} className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: `hsl(${index * 40}, 70%, 50%)` 
                    }}
                  />
                  <span className="font-medium">{level.label}</span>
                </div>
              </Badge>
              <span className="text-xs text-muted-foreground">{level.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Security Note */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-2">Security Implementation</h4>
        <ul className="text-sm text-amber-700/80 dark:text-amber-400/80 space-y-1">
          <li>• Roles stored in separate <code className="bg-amber-500/20 px-1 rounded">user_roles</code> table (not in profiles)</li>
          <li>• Row Level Security (RLS) policies enforce access at database level</li>
          <li>• <code className="bg-amber-500/20 px-1 rounded">has_role()</code> function with SECURITY DEFINER for policy checks</li>
          <li>• Per-user permission overrides via <code className="bg-amber-500/20 px-1 rounded">user_module_permissions</code></li>
        </ul>
      </div>
    </div>
  );
};
