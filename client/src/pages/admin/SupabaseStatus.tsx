import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface TableStatus {
  table: string;
  category: string;
  status: 'ok' | 'error' | 'loading';
  message?: string;
  count?: number | null;
}

interface TableConfig {
  name: string;
  category: string;
}

// Comprehensive table list organized by functional area
const TABLES_TO_CHECK: TableConfig[] = [
  // Core System
  { name: 'profiles', category: 'Core' },
  { name: 'user_roles', category: 'Core' },
  { name: 'user_invitations', category: 'Core' },
  { name: 'audit_logs', category: 'Core' },
  
  // Client Management
  { name: 'clients', category: 'Clients' },
  { name: 'client_contacts', category: 'Clients' },
  { name: 'client_team_assignments', category: 'Clients' },
  { name: 'client_services', category: 'Clients' },
  
  // Practice Management - Workflows
  { name: 'workflow_templates', category: 'Workflows' },
  { name: 'workflow_stages', category: 'Workflows' },
  { name: 'workflows', category: 'Workflows' },
  { name: 'workflow_stage_history', category: 'Workflows' },
  
  // Practice Management - Tasks
  { name: 'tasks', category: 'Tasks' },
  { name: 'task_templates', category: 'Tasks' },
  { name: 'task_comments', category: 'Tasks' },
  { name: 'checklists', category: 'Tasks' },
  
  // CRM & Deals
  { name: 'deals', category: 'CRM' },
  { name: 'deal_stages', category: 'CRM' },
  { name: 'deal_activities', category: 'CRM' },
  { name: 'deal_contacts', category: 'CRM' },
  
  // Client Pipelines
  { name: 'client_pipelines', category: 'Pipelines' },
  { name: 'client_pipeline_stages', category: 'Pipelines' },
  { name: 'client_task_templates', category: 'Pipelines' },
  
  // Communications
  { name: 'conversations', category: 'Messaging' },
  { name: 'conversation_participants', category: 'Messaging' },
  { name: 'messages', category: 'Messaging' },
  { name: 'notifications', category: 'Messaging' },
  { name: 'email_templates', category: 'Messaging' },
  
  // Feed/Social
  { name: 'feed_profiles', category: 'Feed' },
  { name: 'feed_posts', category: 'Feed' },
  { name: 'feed_likes', category: 'Feed' },
  { name: 'feed_comments', category: 'Feed' },
  
  // Calendar
  { name: 'calendar_events', category: 'Calendar' },
  { name: 'calendar_event_participants', category: 'Calendar' },
  
  // Documents
  { name: 'documents', category: 'Documents' },
  { name: 'document_categories', category: 'Documents' },
  { name: 'document_access_log', category: 'Documents' },
  
  // Passwords
  { name: 'passwords', category: 'Passwords' },
  { name: 'password_folders', category: 'Passwords' },
  { name: 'password_access_log', category: 'Passwords' },
  
  // Banking
  { name: 'bank_accounts', category: 'Banking' },
  { name: 'bank_transactions', category: 'Banking' },
];

export default function SupabaseStatus() {
  const [statuses, setStatuses] = useState<TableStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('GET', '/api/global-admin/supabase-status');
      const data = (await res.json()) as TableStatus[];
      setStatuses(data);
    } catch (err: any) {
      setStatuses([
        {
          table: 'supabase-status',
          category: 'Core',
          status: 'error',
          message: err?.message || 'Failed to fetch status',
          count: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              Supabase Not Configured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Supabase environment variables are not configured. Please set up the following in <code className="px-2 py-1 bg-muted rounded">client/.env</code>:
              </p>
              <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-1">
                <div>VITE_SUPABASE_URL="https://your-project.supabase.co"</div>
                <div>VITE_SUPABASE_ANON_KEY="your-anon-key"</div>
              </div>
              <p className="text-sm text-muted-foreground">
                See <code className="px-2 py-1 bg-muted rounded">client/.env.example</code> for reference.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">Supabase Table Status</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Checking {TABLES_TO_CHECK.length} tables across all modules
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          {statuses.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {statuses.filter(s => s.status === 'ok').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Tables OK</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">
                    {statuses.filter(s => s.status === 'error').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {statuses.reduce((sum, s) => sum + (s.count || 0), 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Rows</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tables by Category */}
          <div className="space-y-6">
            {Array.from(new Set(TABLES_TO_CHECK.map(t => t.category))).map(category => {
              const categoryStatuses = statuses.filter(s => s.category === category);
              if (categoryStatuses.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3">{category}</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Table Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryStatuses.map((status) => (
                          <TableRow key={status.table}>
                            <TableCell className="font-medium">{status.table}</TableCell>
                            <TableCell>
                              {status.status === 'ok' ? (
                                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  OK
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Error
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {status.count !== undefined && status.count !== null
                                ? status.count.toLocaleString()
                                : '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm max-w-md truncate">
                              {status.message || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Loading State */}
          {statuses.length === 0 && loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Checking {TABLES_TO_CHECK.length} tables...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
