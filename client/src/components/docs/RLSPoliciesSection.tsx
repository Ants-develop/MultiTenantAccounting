import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Eye, Pencil, Trash2, Plus } from "lucide-react";

interface RLSPolicy {
  table: string;
  policies: {
    name: string;
    operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "ALL";
    description: string;
    using?: string;
    withCheck?: string;
  }[];
}

const rlsPolicies: RLSPolicy[] = [
  {
    table: "profiles",
    policies: [
      { name: "Users can view all profiles", operation: "SELECT", description: "All authenticated users can see profiles for collaboration", using: "auth.uid() IS NOT NULL" },
      { name: "Users can update own profile", operation: "UPDATE", description: "Users can only edit their own profile", using: "auth.uid() = id" },
    ],
  },
  {
    table: "user_roles",
    policies: [
      { name: "Admins can manage roles", operation: "ALL", description: "Only admins can CRUD user roles", using: "has_role(auth.uid(), 'admin')" },
      { name: "Users can view roles", operation: "SELECT", description: "Authenticated users can see role assignments", using: "auth.uid() IS NOT NULL" },
    ],
  },
  {
    table: "clients",
    policies: [
      { name: "Staff can view all clients", operation: "SELECT", description: "Non-client staff can see all clients", using: "NOT has_role(auth.uid(), 'client')" },
      { name: "Clients view own record", operation: "SELECT", description: "Client users see only their linked client", using: "id = (SELECT client_id FROM profiles WHERE id = auth.uid())" },
      { name: "Staff can create clients", operation: "INSERT", description: "Staff members can add new clients", withCheck: "NOT has_role(auth.uid(), 'client')" },
    ],
  },
  {
    table: "tasks",
    policies: [
      { name: "Staff can view tasks", operation: "SELECT", description: "Staff see all tasks, clients see assigned only", using: "NOT has_role(auth.uid(), 'client') OR assigned_to = auth.uid()" },
      { name: "Assigned users can update", operation: "UPDATE", description: "Task assignee or admin can modify", using: "assigned_to = auth.uid() OR has_role(auth.uid(), 'admin')" },
    ],
  },
  {
    table: "documents",
    policies: [
      { name: "Client-scoped access", operation: "SELECT", description: "Users see documents for their assigned clients", using: "client_id IN (SELECT client_id FROM client_team_assignments WHERE user_id = auth.uid())" },
      { name: "Uploader can manage", operation: "ALL", description: "Document uploader has full control", using: "uploaded_by = auth.uid()" },
    ],
  },
  {
    table: "messages",
    policies: [
      { name: "Participants can view", operation: "SELECT", description: "Only conversation participants see messages", using: "is_conversation_participant(conversation_id, auth.uid())" },
      { name: "Participants can send", operation: "INSERT", description: "Participants can add messages to conversation", withCheck: "is_conversation_participant(conversation_id, auth.uid())" },
    ],
  },
  {
    table: "passwords",
    policies: [
      { name: "Staff access via folder", operation: "SELECT", description: "Access controlled through folder's client assignment", using: "folder_id IN (SELECT id FROM password_folders WHERE client_id IN (...))" },
    ],
  },
  {
    table: "audit_logs",
    policies: [
      { name: "Admins only", operation: "SELECT", description: "Only admins can view audit trail", using: "has_role(auth.uid(), 'admin')" },
      { name: "System insert only", operation: "INSERT", description: "Logs created via security definer functions", withCheck: "auth.uid() IS NOT NULL" },
    ],
  },
];

const operationIcons: Record<string, React.ReactNode> = {
  SELECT: <Eye className="h-3 w-3" />,
  INSERT: <Plus className="h-3 w-3" />,
  UPDATE: <Pencil className="h-3 w-3" />,
  DELETE: <Trash2 className="h-3 w-3" />,
  ALL: <Lock className="h-3 w-3" />,
};

const operationColors: Record<string, string> = {
  SELECT: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  INSERT: "bg-green-500/10 text-green-600 border-green-500/20",
  UPDATE: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
  ALL: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

export const RLSPoliciesSection = () => {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">Row Level Security (RLS)</h4>
            <p className="text-sm text-muted-foreground">
              RLS policies enforce data access at the database level. Every query is automatically filtered based on the authenticated user's identity and roles. This ensures security even if frontend code is bypassed.
            </p>
          </div>
        </div>
      </div>

      {/* Security Pattern */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Security Definer Pattern</h4>
        <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
          <p className="text-sm">
            To avoid infinite recursion when policies reference the same table (e.g., checking roles in user_roles), 
            we use <code className="bg-muted px-1.5 py-0.5 rounded text-xs">SECURITY DEFINER</code> functions:
          </p>
          <div className="bg-background p-3 rounded border font-mono text-xs overflow-x-auto">
            <pre className="text-muted-foreground">{`-- Function runs with owner privileges, bypassing RLS
CREATE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;`}</pre>
          </div>
        </div>
      </div>

      {/* Policy Breakdown by Table */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Policies by Table</h4>
        <div className="space-y-4">
          {rlsPolicies.map((tablePolicy) => (
            <div key={tablePolicy.table} className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <code className="font-mono font-semibold">{tablePolicy.table}</code>
                <Badge variant="outline" className="text-xs ml-auto">
                  {tablePolicy.policies.length} {tablePolicy.policies.length === 1 ? "policy" : "policies"}
                </Badge>
              </div>
              <div className="divide-y">
                {tablePolicy.policies.map((policy, idx) => (
                  <div key={idx} className="p-3 flex items-start gap-3">
                    <div className={`p-1.5 rounded ${operationColors[policy.operation]}`}>
                      {operationIcons[policy.operation]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{policy.name}</span>
                        <Badge variant="outline" className={`text-[10px] ${operationColors[policy.operation]}`}>
                          {policy.operation}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{policy.description}</p>
                      {policy.using && (
                        <code className="text-[10px] font-mono text-muted-foreground block mt-1 truncate">
                          USING: {policy.using}
                        </code>
                      )}
                      {policy.withCheck && (
                        <code className="text-[10px] font-mono text-muted-foreground block mt-1 truncate">
                          WITH CHECK: {policy.withCheck}
                        </code>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Patterns */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Common RLS Patterns</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { pattern: "Owner-based", example: "auth.uid() = user_id", desc: "User owns the row" },
            { pattern: "Role-based", example: "has_role(auth.uid(), 'admin')", desc: "User has specific role" },
            { pattern: "Client-scoped", example: "client_id IN (assigned clients)", desc: "User assigned to client" },
            { pattern: "Participant-based", example: "is_conversation_participant(...)", desc: "User is participant in entity" },
            { pattern: "Hierarchical", example: "folder.client_id check", desc: "Access via parent entity" },
            { pattern: "Public read", example: "true (SELECT only)", desc: "Anyone can read, write restricted" },
          ].map((item) => (
            <div key={item.pattern} className="p-3 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{item.pattern}</span>
              </div>
              <code className="text-[10px] font-mono text-primary block mb-1">{item.example}</code>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
