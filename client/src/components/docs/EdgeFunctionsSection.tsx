import { Badge } from "@/components/ui/badge";
import { Bot, Mail, Bell, ArrowRight } from "lucide-react";

interface EdgeFunctionInfo {
  name: string;
  description: string;
  trigger: string;
  icon: React.ReactNode;
  secrets: string[];
}

const edgeFunctions: EdgeFunctionInfo[] = [
  {
    name: "chat-with-ai",
    description: "AI chat integration via Lovable AI Gateway. Handles conversation context and streams responses.",
    trigger: "User sends message in AI chat widget",
    icon: <Bot className="h-5 w-5 text-purple-500" />,
    secrets: ["LOVABLE_API_KEY"],
  },
  {
    name: "send-portal-invitation",
    description: "Sends portal invitation emails to clients with unique access tokens.",
    trigger: "Staff clicks 'Send Portal Invitation' on client",
    icon: <Mail className="h-5 w-5 text-blue-500" />,
    secrets: ["RESEND_API_KEY"],
  },
  {
    name: "send-event-reminders",
    description: "Sends email reminders for upcoming calendar events to participants.",
    trigger: "Scheduled cron or manual trigger before event",
    icon: <Bell className="h-5 w-5 text-amber-500" />,
    secrets: ["RESEND_API_KEY"],
  },
];

export const EdgeFunctionsSection = () => {
  return (
    <div className="space-y-6">
      {/* Function Cards */}
      <div className="grid gap-4">
        {edgeFunctions.map((func) => (
          <div key={func.name} className="p-4 border rounded-lg">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-muted rounded-lg">
                {func.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <code className="font-mono font-semibold">{func.name}</code>
                  <Badge variant="outline" className="text-xs">Edge Function</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{func.description}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Trigger:</span>
                  <span>{func.trigger}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                  <span className="text-muted-foreground">Secrets:</span>
                  {func.secrets.map((secret) => (
                    <code key={secret} className="bg-muted px-1.5 py-0.5 rounded">{secret}</code>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Chat Flow */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4">AI Chat Integration Flow</h4>
        <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/30 rounded-lg text-sm">
          <div className="px-3 py-1.5 bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-lg">
            User Message
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="px-3 py-1.5 bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-lg">
            chat-with-ai
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="px-3 py-1.5 bg-pink-500/20 text-pink-700 dark:text-pink-300 rounded-lg">
            Lovable AI Gateway
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="px-3 py-1.5 bg-green-500/20 text-green-700 dark:text-green-300 rounded-lg">
            AI Model (Gemini/GPT)
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-lg">
            Streamed Response
          </div>
        </div>
      </div>

      {/* Database Functions */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Key Database Functions</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { name: "has_role(user_id, role)", desc: "Check if user has specific role" },
            { name: "create_notification(...)", desc: "Create user notification" },
            { name: "create_audit_log(...)", desc: "Log action to audit trail" },
            { name: "transition_workflow_stage(...)", desc: "Move job to new stage with history" },
            { name: "copy_pipeline_to_client(...)", desc: "Clone template for client customization" },
            { name: "create_client_from_deal()", desc: "Auto-create client when deal is won" },
            { name: "validate_portal_invitation(token)", desc: "Validate client portal access token" },
            { name: "get_user_with_roles(user_id)", desc: "Get user profile with all roles" },
          ].map((fn) => (
            <div key={fn.name} className="p-3 bg-muted/50 rounded-lg">
              <code className="text-xs font-mono text-primary">{fn.name}</code>
              <p className="text-xs text-muted-foreground mt-1">{fn.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Triggers */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-4">Active Triggers</h4>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { name: "handle_new_user", table: "auth.users", event: "INSERT", desc: "Create profile & assign default role" },
            { name: "sync_user_email", table: "auth.users", event: "UPDATE", desc: "Sync email to profiles table" },
            { name: "log_deal_stage_change", table: "deals", event: "UPDATE", desc: "Create activity log on stage change" },
            { name: "create_client_from_deal", table: "deals", event: "UPDATE", desc: "Auto-create client on deal won" },
            { name: "create_client_password_folder", table: "clients", event: "INSERT", desc: "Create root password folder" },
            { name: "audit_trigger_func", table: "various", event: "*", desc: "Log changes to audit_logs" },
          ].map((trigger) => (
            <div key={trigger.name} className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-xs font-mono font-semibold">{trigger.name}</code>
                <Badge variant="outline" className="text-[10px]">{trigger.event}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{trigger.table}</span> → {trigger.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
