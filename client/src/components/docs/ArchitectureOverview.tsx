import { ArrowRight, ArrowDown, Database, Globe, Server, Shield, Users } from "lucide-react";

export const ArchitectureOverview = () => {
  return (
    <div className="space-y-8">
      {/* Main Architecture Flow */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 p-6 bg-muted/30 rounded-xl">
        {/* Frontend */}
        <div className="flex flex-col items-center p-6 bg-background rounded-xl border shadow-sm min-w-[200px]">
          <Globe className="h-10 w-10 text-blue-500 mb-3" />
          <h3 className="font-semibold text-foreground">Frontend</h3>
          <p className="text-sm text-muted-foreground text-center mt-1">React + Vite</p>
          <div className="mt-3 text-xs text-muted-foreground space-y-1">
            <p>• React Components</p>
            <p>• TanStack Query</p>
            <p>• React Router</p>
          </div>
        </div>

        <ArrowRight className="h-8 w-8 text-muted-foreground hidden lg:block" />
        <ArrowDown className="h-8 w-8 text-muted-foreground lg:hidden" />

        {/* Supabase Client */}
        <div className="flex flex-col items-center p-6 bg-background rounded-xl border shadow-sm min-w-[200px]">
          <Server className="h-10 w-10 text-green-500 mb-3" />
          <h3 className="font-semibold text-foreground">Supabase Client</h3>
          <p className="text-sm text-muted-foreground text-center mt-1">API Layer</p>
          <div className="mt-3 text-xs text-muted-foreground space-y-1">
            <p>• Auth Management</p>
            <p>• Realtime Subscriptions</p>
            <p>• Storage Client</p>
          </div>
        </div>

        <ArrowRight className="h-8 w-8 text-muted-foreground hidden lg:block" />
        <ArrowDown className="h-8 w-8 text-muted-foreground lg:hidden" />

        {/* RLS */}
        <div className="flex flex-col items-center p-6 bg-background rounded-xl border shadow-sm min-w-[200px]">
          <Shield className="h-10 w-10 text-amber-500 mb-3" />
          <h3 className="font-semibold text-foreground">Row Level Security</h3>
          <p className="text-sm text-muted-foreground text-center mt-1">Access Control</p>
          <div className="mt-3 text-xs text-muted-foreground space-y-1">
            <p>• Policy Evaluation</p>
            <p>• Role Validation</p>
            <p>• Data Filtering</p>
          </div>
        </div>

        <ArrowRight className="h-8 w-8 text-muted-foreground hidden lg:block" />
        <ArrowDown className="h-8 w-8 text-muted-foreground lg:hidden" />

        {/* Database */}
        <div className="flex flex-col items-center p-6 bg-background rounded-xl border shadow-sm min-w-[200px]">
          <Database className="h-10 w-10 text-purple-500 mb-3" />
          <h3 className="font-semibold text-foreground">PostgreSQL</h3>
          <p className="text-sm text-muted-foreground text-center mt-1">Database</p>
          <div className="mt-3 text-xs text-muted-foreground space-y-1">
            <p>• Tables & Relations</p>
            <p>• Functions & Triggers</p>
            <p>• Stored Procedures</p>
          </div>
        </div>
      </div>

      {/* Dual Portal System */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 bg-blue-500/5 rounded-xl border border-blue-500/20">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-6 w-6 text-blue-500" />
            <h3 className="font-semibold text-foreground">Staff Portal</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Full-featured dashboard for internal team members
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Role-based module access (Admin, Manager, Accountant, Reviewer)</li>
            <li>• Practice management & CRM</li>
            <li>• Workflow automation</li>
            <li>• AI bookkeeping tools</li>
          </ul>
        </div>

        <div className="p-6 bg-green-500/5 rounded-xl border border-green-500/20">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-6 w-6 text-green-500" />
            <h3 className="font-semibold text-foreground">Client Portal</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Self-service portal for external clients
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Scoped access to own data only</li>
            <li>• Document upload & viewing</li>
            <li>• Task visibility & messaging</li>
            <li>• Workflow progress tracking</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
