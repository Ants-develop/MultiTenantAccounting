import { Badge } from "@/components/ui/badge";

interface TableInfo {
  name: string;
  category: string;
  description: string;
  keyColumns: string[];
  relationships?: string[];
}

const tables: TableInfo[] = [
  // Core
  { name: "profiles", category: "Core", description: "User profile information", keyColumns: ["id", "full_name", "email", "client_id"], relationships: ["→ auth.users", "→ clients"] },
  { name: "user_roles", category: "Core", description: "User role assignments", keyColumns: ["user_id", "role"], relationships: ["→ profiles"] },
  { name: "user_module_permissions", category: "Core", description: "Per-user permission overrides", keyColumns: ["user_id", "module", "permission_level"], relationships: ["→ profiles"] },
  
  // Clients
  { name: "clients", category: "Clients", description: "Client organizations", keyColumns: ["id", "name", "status", "portal_enabled"], relationships: ["→ profiles (assigned_*)"] },
  { name: "client_contacts", category: "Clients", description: "Client contact persons", keyColumns: ["client_id", "name", "email"], relationships: ["→ clients"] },
  { name: "client_team_assignments", category: "Clients", description: "Staff assigned to clients", keyColumns: ["client_id", "user_id", "role_type"], relationships: ["→ clients", "→ profiles"] },
  
  // Workflows
  { name: "workflow_templates", category: "Workflows", description: "Reusable pipeline templates", keyColumns: ["id", "name", "recurrence_settings"] },
  { name: "workflow_stages", category: "Workflows", description: "Stages within templates", keyColumns: ["template_id", "name", "order_position"], relationships: ["→ workflow_templates"] },
  { name: "task_templates", category: "Workflows", description: "Task blueprints per stage", keyColumns: ["stage_id", "title", "priority"], relationships: ["→ workflow_stages"] },
  { name: "client_pipelines", category: "Workflows", description: "Client-specific pipeline copies", keyColumns: ["client_id", "source_template_id"], relationships: ["→ clients", "→ workflow_templates"] },
  { name: "client_services", category: "Workflows", description: "Services subscribed by clients", keyColumns: ["client_id", "workflow_template_id", "frequency"], relationships: ["→ clients", "→ workflow_templates"] },
  { name: "workflows", category: "Workflows", description: "Active job instances", keyColumns: ["id", "name", "current_stage_id", "status"], relationships: ["→ clients", "→ workflow_templates"] },
  
  // Tasks
  { name: "tasks", category: "Tasks", description: "Individual work items", keyColumns: ["id", "title", "status", "workflow_id", "assigned_to"], relationships: ["→ workflows", "→ profiles"] },
  { name: "checklists", category: "Tasks", description: "Task checklist items", keyColumns: ["task_id", "title", "is_completed"], relationships: ["→ tasks"] },
  
  // CRM
  { name: "deal_stages", category: "CRM", description: "Sales pipeline stages", keyColumns: ["id", "name", "probability", "is_won"] },
  { name: "deals", category: "CRM", description: "Sales opportunities", keyColumns: ["id", "name", "stage_id", "deal_value"], relationships: ["→ deal_stages", "→ clients"] },
  { name: "deal_activities", category: "CRM", description: "Deal activity log", keyColumns: ["deal_id", "activity_type", "subject"], relationships: ["→ deals"] },
  
  // Bookkeeping
  { name: "chart_of_accounts", category: "Bookkeeping", description: "Account hierarchy", keyColumns: ["client_id", "account_code", "account_name"], relationships: ["→ clients"] },
  { name: "journal_entries", category: "Bookkeeping", description: "Accounting entries", keyColumns: ["client_id", "entry_date", "debit_account", "credit_account"], relationships: ["→ clients", "→ chart_of_accounts"] },
  { name: "bank_accounts", category: "Bookkeeping", description: "Client bank accounts", keyColumns: ["client_id", "bank_name", "account_number"], relationships: ["→ clients"] },
  { name: "bank_transactions", category: "Bookkeeping", description: "Bank statement lines", keyColumns: ["bank_account_id", "transaction_date", "amount"], relationships: ["→ bank_accounts"] },
  
  // Documents & Communication
  { name: "documents", category: "Documents", description: "Uploaded files", keyColumns: ["client_id", "name", "file_path", "status"], relationships: ["→ clients"] },
  { name: "conversations", category: "Messages", description: "Message threads", keyColumns: ["id", "type", "client_id"], relationships: ["→ clients"] },
  { name: "messages", category: "Messages", description: "Individual messages", keyColumns: ["conversation_id", "sender_id", "content"], relationships: ["→ conversations", "→ profiles"] },
  
  // Calendar & Feed
  { name: "calendar_events", category: "Calendar", description: "Scheduled events", keyColumns: ["id", "title", "start_time", "end_time"], relationships: ["→ profiles (created_by)"] },
  { name: "feed_posts", category: "Feed", description: "Internal feed posts", keyColumns: ["id", "author_id", "content"], relationships: ["→ profiles"] },
  
  // Security
  { name: "passwords", category: "Security", description: "Encrypted credentials", keyColumns: ["folder_id", "title", "password_encrypted"], relationships: ["→ password_folders"] },
  { name: "audit_logs", category: "Security", description: "System activity log", keyColumns: ["user_id", "action", "entity_type", "entity_id"] },
  { name: "notifications", category: "Notifications", description: "User notifications", keyColumns: ["user_id", "type", "title", "is_read"] },
];

const categoryColors: Record<string, string> = {
  Core: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  Clients: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Workflows: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Tasks: "bg-green-500/10 text-green-600 border-green-500/20",
  CRM: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Bookkeeping: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Documents: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Messages: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  Calendar: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  Feed: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  Security: "bg-red-500/10 text-red-600 border-red-500/20",
  Notifications: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

export const DatabaseSchema = () => {
  const groupedTables = tables.reduce((acc, table) => {
    if (!acc[table.category]) acc[table.category] = [];
    acc[table.category].push(table);
    return acc;
  }, {} as Record<string, TableInfo[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedTables).map(([category, categoryTables]) => (
        <div key={category}>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs ${categoryColors[category]}`}>
              {category}
            </span>
            <span className="text-xs text-muted-foreground">({categoryTables.length} tables)</span>
          </h4>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryTables.map((table) => (
              <div
                key={table.name}
                className={`p-3 rounded-lg border ${categoryColors[category]}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <code className="font-mono text-sm font-semibold">{table.name}</code>
                </div>
                <p className="text-xs opacity-80 mb-2">{table.description}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {table.keyColumns.map((col) => (
                    <Badge key={col} variant="outline" className="text-[10px] px-1.5 py-0">
                      {col}
                    </Badge>
                  ))}
                </div>
                {table.relationships && (
                  <div className="text-[10px] opacity-60 space-x-1">
                    {table.relationships.map((rel) => (
                      <span key={rel}>{rel}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
