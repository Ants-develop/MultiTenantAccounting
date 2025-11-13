import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database, Upload, RefreshCw, AlertTriangle, CheckCircle, XCircle,
  Download, Info, Play, Pause, Square, Clock, BarChart3, ArrowUpCircle, Search,
  ChevronDown, ChevronRight, X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface TenantCode {
  tenantCode: number;
  recordCount: number;
  tenantName?: string;
}

interface AuditTable {
  tableName: string;
  recordCount: number;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
}

interface ErrorDetail {
  timestamp: string;
  message: string;
  recordId?: string | number;
  recordData?: Record<string, any>;
  stack?: string;
}

interface MigrationStatus {
  id?: string;
  migrationId?: string; // Backend uses migrationId
  type?: string; // Migration type: 'general-ledger', 'audit', 'rs', 'update'
  tenantCode?: number | null;
  tableName?: string | null;
  companyId?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  progress: number | string; // Can be number or string from database
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  startTime?: string | Date;
  endTime?: string | Date | null;
  errorMessage?: string | null;
  duplicateCount?: number;
  newRecordsCount?: number;
  logs?: LogEntry[];
  errors?: ErrorDetail[];
}

interface MigrationResult {
  success: boolean;
  message: string;
  migrationId?: string;
  totalRecords?: number;
  estimatedTime?: string;
}

interface AuditMigrationResult {
  success: boolean;
  message: string;
  migrationId?: string;
  totalTables?: number;
  tablesCompleted?: number;
  estimatedTime?: string;
}

const migrationFormSchema = z.object({
  batchSize: z.number().min(1).max(1000).default(100),
});

const auditMigrationFormSchema = z.object({
  selectedTables: z.array(z.string()).min(1, "Select at least one table"),
  batchSize: z.number().min(1).max(5000).default(1000),
});

type MigrationForm = z.infer<typeof migrationFormSchema>;
type AuditMigrationForm = z.infer<typeof auditMigrationFormSchema>;

// Logs Display Component
function LogsDisplay({ logs }: { logs: LogEntry[] }) {
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const logsEndRef = React.useRef<HTMLDivElement>(null);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter(log => filter === 'all' || log.level === filter);

  React.useEffect(() => {
    // Only scroll within the ScrollArea container, not the entire page
    if (logsEndRef.current && scrollAreaRef.current) {
      // Find the scrollable container within ScrollArea (Radix UI structure)
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollContainer && logsEndRef.current) {
        // Scroll the container directly to the bottom, not the page
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [logs.length]);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    } catch {
      return timestamp;
    }
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({logs.length})
        </Button>
        <Button
          variant={filter === 'info' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('info')}
        >
          Info ({logs.filter(l => l.level === 'info').length})
        </Button>
        <Button
          variant={filter === 'warn' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('warn')}
        >
          Warnings ({logs.filter(l => l.level === 'warn').length})
        </Button>
        <Button
          variant={filter === 'error' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('error')}
        >
          Errors ({logs.filter(l => l.level === 'error').length})
        </Button>
      </div>

      <ScrollArea ref={scrollAreaRef} className="h-96 w-full border rounded-md p-4">
        <div className="space-y-2">
          {filteredLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No logs to display</p>
          ) : (
            filteredLogs.map((log, idx) => (
              <div
                key={idx}
                className={`p-2 rounded border text-sm ${getLogColor(log.level)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-mono text-muted-foreground min-w-[80px]">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span className="font-semibold uppercase text-xs min-w-[60px]">{log.level}</span>
                  <span className="flex-1">{log.message}</span>
                </div>
                {log.context && Object.keys(log.context).length > 0 && (
                  <details className="mt-2 ml-[148px]">
                    <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                      Show context
                    </summary>
                    <pre className="mt-2 text-xs bg-black/5 p-2 rounded overflow-x-auto">
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
}

// Errors Display Component
function ErrorsDisplay({ errors }: { errors: ErrorDetail[] }) {
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  const toggleExpand = (idx: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedErrors(newExpanded);
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', { hour12: false });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="space-y-4">
      <ScrollArea className="h-96 w-full">
        {errors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No errors to display</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Record ID</TableHead>
                <TableHead>Error Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.map((error, idx) => (
                <React.Fragment key={idx}>
                  <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(idx)}>
                    <TableCell>
                      {expandedErrors.has(idx) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatTimestamp(error.timestamp)}
                    </TableCell>
                    <TableCell>
                      {error.recordId ? (
                        <Badge variant="outline">{String(error.recordId)}</Badge>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">{error.message}</TableCell>
                  </TableRow>
                  {expandedErrors.has(idx) && (
                    <TableRow>
                      <TableCell colSpan={4} className="bg-muted/30">
                        <div className="space-y-2 p-4">
                          {error.stack && (
                            <div>
                              <p className="text-xs font-semibold mb-1">Stack Trace:</p>
                              <pre className="text-xs bg-black/5 p-2 rounded overflow-x-auto font-mono">
                                {error.stack}
                              </pre>
                            </div>
                          )}
                          {error.recordData && Object.keys(error.recordData).length > 0 && (
                            <div>
                              <p className="text-xs font-semibold mb-1">Record Data:</p>
                              <pre className="text-xs bg-black/5 p-2 rounded overflow-x-auto">
                                {JSON.stringify(error.recordData, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}

export default function MSSQLImport() {
  const [selectedTenant, setSelectedTenant] = useState<TenantCode | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isAuditImportDialogOpen, setIsAuditImportDialogOpen] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [selectedAuditTables, setSelectedAuditTables] = useState<Set<string>>(new Set());
  const [selectedHistoricalMigration, setSelectedHistoricalMigration] = useState<MigrationStatus | null>(null);
  const [showHistoricalMigrations, setShowHistoricalMigrations] = useState(false);

  const { user, mainCompany } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MigrationForm>({
    resolver: zodResolver(migrationFormSchema),
    defaultValues: {
      batchSize: 100,
    },
  });

  const auditForm = useForm<AuditMigrationForm>({
    resolver: zodResolver(auditMigrationFormSchema),
    defaultValues: {
      selectedTables: [],
      batchSize: 1000,
    },
  });

  // Fetch migration status first
  const { data: activeMigration, refetch: refetchMigrationStatus, isLoading: statusLoading } = useQuery<MigrationStatus | null>({
    queryKey: ['/api/mssql/migration-status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/mssql/migration-status');
      const data = await response.json();
      // Handle null response (no active migration)
      return data;
    },
    refetchInterval: isPolling ? 2000 : false, // Poll every 2 seconds when polling is enabled
    enabled: true, // Always enabled to check for running migrations
  });

  // Fetch historical migrations
  const { data: historicalMigrationsData, refetch: refetchHistoricalMigrations } = useQuery<{ migrations: MigrationStatus[], total: number }>({
    queryKey: ['/api/mssql/migration-history'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/mssql/migration-history?limit=50');
      const data = await response.json();
      return data || { migrations: [], total: 0 };
    },
    enabled: showHistoricalMigrations,
  });

  // Fetch specific historical migration details
  const { data: historicalMigrationDetails, refetch: refetchHistoricalDetails } = useQuery<MigrationStatus>({
    queryKey: ['/api/mssql/migration-history', selectedHistoricalMigration?.migrationId],
    queryFn: async () => {
      if (!selectedHistoricalMigration?.migrationId) return null as any;
      const response = await apiRequest('GET', `/api/mssql/migration-history/${selectedHistoricalMigration.migrationId}`);
      const data = await response.json();
      return data;
    },
    enabled: !!selectedHistoricalMigration?.migrationId,
  });

  // Automatically manage polling based on migration status
  useEffect(() => {
    if (activeMigration?.status === 'running') {
      setIsPolling(true);
    } else if (activeMigration?.status === 'completed' || activeMigration?.status === 'failed') {
      setIsPolling(false);
      // Clear migration status after a delay to allow user to see the final status
      const timeout = setTimeout(() => {
        queryClient.setQueryData(['/api/mssql/migration-status'], null);
        setMigrationStatus(null);
      }, 10000); // Clear after 10 seconds
      return () => clearTimeout(timeout);
    }
  }, [activeMigration?.status, queryClient]);

  // Fetch all available clients
  const { data: availableClients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clients');
      const data = await response.json();
      return data || [];
    },
    enabled: !!mainCompany?.id,
  });

  // Add PostingsPeriod filter state
  const [postingsPeriodFrom, setPostingsPeriodFrom] = useState<string>('');
  const [postingsPeriodTo, setPostingsPeriodTo] = useState<string>('');

  // Fetch available tenant codes from MSSQL with optional PostingsPeriod filter
  const { data: tenantCodes = [], isLoading: tenantCodesLoading, refetch: refetchTenantCodes } = useQuery<TenantCode[]>({
    queryKey: ['/api/mssql/tenant-codes', postingsPeriodFrom, postingsPeriodTo, availableClients],
    queryFn: async () => {
      // Build query parameters
      const params = new URLSearchParams();
      if (postingsPeriodFrom) params.append('postingsPeriodFrom', postingsPeriodFrom);
      if (postingsPeriodTo) params.append('postingsPeriodTo', postingsPeriodTo);
      
      // Add all client tenant codes if available
      if (availableClients.length > 0) {
        const tenantCodes = availableClients
          .filter((c: any) => c.tenantCode)
          .map((c: any) => c.tenantCode)
          .join(',');
        if (tenantCodes) {
          params.append('tenantCodes', tenantCodes);
        }
      }

      const url = `/api/mssql/tenant-codes${params.toString() ? '?' + params.toString() : ''}`;
      const response = await apiRequest('GET', url);
      const data = await response.json();
      return data.tenantCodes || [];
    },
    enabled: !!mainCompany?.id,
  });

  // Fetch available audit tables
  const { data: auditTables = [], isLoading: auditTablesLoading, refetch: refetchAuditTables } = useQuery<AuditTable[]>({
    queryKey: ['/api/mssql-audit/audit-tables'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/mssql-audit/audit-tables');
      const data = await response.json();
      return data.auditTables || [];
    },
    enabled: !!mainCompany?.id,
  });

  // Start migration mutation
  const startMigrationMutation = useMutation<MigrationResult, Error, MigrationForm>({
    mutationFn: async (data) => {
      console.log('Mutation function called with:', { data, selectedTenant, mainCompany });

      if (!selectedTenant) {
        throw new Error("No tenant selected");
      }
      if (!mainCompany?.id) {
        throw new Error("Main company not configured");
      }

      console.log('Making API request to start migration...');
      const response = await apiRequest('POST', '/api/mssql/start-migration', {
        type: 'general-ledger',
        tenantCode: selectedTenant.tenantCode,
        clientId: mainCompany.id,
        batchSize: data.batchSize,
        postingsPeriodFrom: postingsPeriodFrom || undefined,
        postingsPeriodTo: postingsPeriodTo || undefined,
      });
      console.log('API response:', response);
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Migration Started",
          description: `Migration started for tenant ${result.message}. Processing ${result.totalRecords} records.`,
        });
        setIsPolling(true); // Start polling immediately
        refetchMigrationStatus(); // Immediate refetch to get status right away
        setIsImportDialogOpen(false);
        form.reset();
      } else {
        toast({
          title: "Migration Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start update mutation
  const startUpdateMutation = useMutation<MigrationResult, Error, void>({
    mutationFn: async () => {
      console.log('Starting update for:', { selectedTenant, mainCompany });

      if (!selectedTenant) {
        throw new Error("No tenant selected");
      }
      if (!mainCompany?.id) {
        throw new Error("Main company not configured");
      }

      console.log('Making API request to start update...');
      const response = await apiRequest('POST', '/api/mssql/start-migration', {
        type: 'update',
        tenantCode: selectedTenant.tenantCode,
        clientId: mainCompany.id,
        postingsPeriodFrom: postingsPeriodFrom || undefined,
        postingsPeriodTo: postingsPeriodTo || undefined,
      });
      console.log('Update API response:', response);
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Update Started",
          description: `Update started for tenant ${selectedTenant?.tenantCode}. Processing ${result.totalRecords} records.`,
        });
        setIsPolling(true); // Start polling immediately
        refetchMigrationStatus(); // Immediate refetch to get status right away
        setIsImportDialogOpen(false);
      } else {
        toast({
          title: "Update Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Stop migration mutation
  const stopMigrationMutation = useMutation<{ success: boolean; message: string }, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/mssql/stop-migration');
      return response.json();
    },
    onSuccess: (result) => {
      setIsPolling(false);
      toast({
        title: result.success ? "Migration Stopped" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      refetchMigrationStatus();
    },
  });

  // Export to audit table (general_ledger) mutation
  const exportToAuditMutation = useMutation<MigrationResult, Error, void>({
    mutationFn: async () => {
      if (!mainCompany?.id) {
        throw new Error("Main company not configured");
      }

      const tenantCode = (mainCompany as any)?.tenantCode;
      if (!tenantCode) {
        throw new Error("Main company tenant code not configured. Please set tenant code in Global Admin.");
      }

      const response = await apiRequest('POST', '/api/mssql/start-migration', {
        type: 'audit',
        tenantCode: tenantCode,
        clientId: mainCompany.id,
      });
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Export Started",
          description: `Exporting data from MSSQL to general_ledger for tenant code ${(mainCompany as any)?.tenantCode}`,
        });
        setIsPolling(true); // Start polling immediately
        refetchMigrationStatus(); // Immediate refetch to get status right away
        queryClient.invalidateQueries({ queryKey: ['/api/mssql/migration-status'] });
      } else {
        toast({
          title: "Export Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start audit table migration mutation
  const startAuditTableMigrationMutation = useMutation<AuditMigrationResult, Error, { tableName: string; batchSize: number }>({
    mutationFn: async (data) => {
      if (!mainCompany?.id) {
        throw new Error("Main company not configured");
      }

      const response = await apiRequest('POST', '/api/mssql/start-migration', {
        type: 'audit-table',
        tableName: data.tableName,
        batchSize: data.batchSize,
      });
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Audit Migration Started",
          description: `Importing audit table. ${result.message}`,
        });
        setIsPolling(true); // Start polling immediately
        refetchMigrationStatus(); // Immediate refetch to get status right away
        setIsAuditImportDialogOpen(false);
        setSelectedAuditTables(new Set());
      } else {
        toast({
          title: "Migration Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start full audit export mutation
  const startFullAuditExportMutation = useMutation<AuditMigrationResult, Error, { batchSize: number }>({
    mutationFn: async (data) => {
      if (!mainCompany?.id) {
        throw new Error("Main company not configured");
      }

      const response = await apiRequest('POST', '/api/mssql/start-migration', {
        type: 'full-audit-export',
        batchSize: data.batchSize,
      });
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Full Audit Export Started",
          description: `Importing ${result.totalTables} audit tables`,
        });
        setIsPolling(true); // Start polling immediately
        refetchMigrationStatus(); // Immediate refetch to get status right away
        setIsAuditImportDialogOpen(false);
        setSelectedAuditTables(new Set());
      } else {
        toast({
          title: "Export Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartMigration = (data: MigrationForm) => {
    console.log('handleStartMigration called with:', { data, selectedTenant, mainCompany });
    
    if (!mainCompany?.id) {
      toast({
        title: "Error",
        description: "Main company not configured",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTenant) {
      toast({
        title: "Error",
        description: "No tenant selected",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting migration mutation...');
    startMigrationMutation.mutate(data);
  };

  const handleStopMigration = () => {
    stopMigrationMutation.mutate();
  };

  const getStatusIcon = (status: MigrationStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: MigrationStatus['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime) return 'N/A';
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}m ${diffSecs}s`;
  };

  // Filter tenant codes based on search query
  const filteredTenantCodes = tenantCodes.filter((tenant) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const tenantCodeStr = tenant.tenantCode.toString();
    const tenantName = (tenant.tenantName || '').toLowerCase();
    const recordCount = tenant.recordCount.toString();
    
    return (
      tenantCodeStr.includes(query) ||
      tenantName.includes(query) ||
      recordCount.includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center">
            <Database className="w-6 h-6 mr-2" />
            MSSQL Data Import
          </h1>
          <p className="text-muted-foreground">
            Import journal entries and audit tables from MSSQL to PostgreSQL
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              refetchTenantCodes();
              refetchAuditTables();
            }}
            disabled={tenantCodesLoading || auditTablesLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${tenantCodesLoading || auditTablesLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Main Company Info & Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Main Company & Available Clients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Main Company Name</Label>
              <p className="text-sm text-muted-foreground">{mainCompany?.name || 'Not configured'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Main Company Tenant Code</Label>
              <p className="text-sm text-muted-foreground">
                {(mainCompany as any)?.tenantCode ? (
                  <span className="font-semibold text-primary">{(mainCompany as any).tenantCode}</span>
                ) : (
                  <span className="text-amber-600">Not configured</span>
                )}
              </p>
              {!(mainCompany as any)?.tenantCode && mainCompany?.name && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Set tenant code in Global Admin to export data to general_ledger
                </p>
              )}
              {(mainCompany as any)?.tenantCode && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Ready to export MSSQL data to general_ledger using tenant code: {(mainCompany as any).tenantCode}
                </p>
              )}
            </div>
          </div>

          {/* Available Clients Summary */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium">Available Clients ({availableClients.length})</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
              {clientsLoading ? (
                <p className="text-sm text-muted-foreground">Loading clients...</p>
              ) : availableClients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No clients configured</p>
              ) : (
                availableClients.slice(0, 6).map((client: any) => (
                  <div key={client.id} className="p-2 bg-gray-50 rounded border text-sm">
                    <p className="font-medium">{client.name}</p>
                    <p className="text-xs text-gray-500">
                      {client.tenantCode ? `Code: ${client.tenantCode}` : 'No tenant code'}
                    </p>
                  </div>
                ))
              )}
              {availableClients.length > 6 && (
                <p className="text-xs text-muted-foreground">... and {availableClients.length - 6} more</p>
              )}
            </div>
          </div>

          {/* PostingsPeriod Filter */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-2 block">Filter by PostingsPeriod (Optional)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="postingsPeriodFrom" className="text-xs text-muted-foreground">From Date</Label>
                <Input
                  id="postingsPeriodFrom"
                  type="date"
                  value={postingsPeriodFrom}
                  onChange={(e) => setPostingsPeriodFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="postingsPeriodTo" className="text-xs text-muted-foreground">To Date</Label>
                <Input
                  id="postingsPeriodTo"
                  type="date"
                  value={postingsPeriodTo}
                  onChange={(e) => setPostingsPeriodTo(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            {(postingsPeriodFrom || postingsPeriodTo) && (
              <p className="text-xs text-blue-600 mt-2">
                ℹ️ Filtering tenant codes by posting period: {postingsPeriodFrom || 'any'} to {postingsPeriodTo || 'any'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Migration Status */}
      {statusLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Loading migration status...</span>
            </div>
          </CardContent>
        </Card>
      ) : (activeMigration || migrationStatus) ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {getStatusIcon((activeMigration || migrationStatus)!.status)}
              <span className="ml-2">
                {(() => {
                  const migration = activeMigration || migrationStatus;
                  const migrationId = migration?.id || migration?.migrationId;
                  if (migrationId?.startsWith('update_')) return 'Update Status';
                  if (migrationId?.startsWith('export_') || migrationId?.startsWith('audit_')) return 'Export Status';
                  return 'Migration Status';
                })()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Badge className={getStatusColor((activeMigration || migrationStatus)!.status)}>
                    {(activeMigration || migrationStatus)!.status.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Tenant Code: {(activeMigration || migrationStatus)!.tenantCode || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {(activeMigration || migrationStatus)!.status === 'running' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStopMigration}
                      disabled={stopMigrationMutation.isPending}
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop {(() => {
                        const migration = activeMigration || migrationStatus;
                        const migrationId = migration?.id || migration?.migrationId;
                        return migrationId?.startsWith('update_') ? 'Update' : 'Migration';
                      })()}
                    </Button>
                  )}
                  {((activeMigration || migrationStatus)!.status === 'completed' || 
                    (activeMigration || migrationStatus)!.status === 'failed') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        queryClient.setQueryData(['/api/mssql/migration-status'], null);
                        setMigrationStatus(null);
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>

              {(activeMigration || migrationStatus)!.status === 'running' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{(activeMigration || migrationStatus)!.processedRecords} / {(activeMigration || migrationStatus)!.totalRecords}</span>
                  </div>
                  <Progress 
                    value={((activeMigration || migrationStatus)!.processedRecords / (activeMigration || migrationStatus)!.totalRecords) * 100} 
                    className="w-full"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Total Records</Label>
                  <p className="font-medium">{(activeMigration || migrationStatus)!.totalRecords.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Success</Label>
                  <p className="font-medium text-green-600">{(activeMigration || migrationStatus)!.successCount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Errors</Label>
                  <p className="font-medium text-red-600">{(activeMigration || migrationStatus)!.errorCount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  <p className="font-medium">
                    {formatDuration((activeMigration || migrationStatus)!.startTime, (activeMigration || migrationStatus)!.endTime)}
                  </p>
                </div>
                {/* Show update-specific stats if available */}
                {(activeMigration || migrationStatus)!.duplicateCount !== undefined && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Duplicates</Label>
                    <p className="font-medium text-yellow-600">{(activeMigration || migrationStatus)!.duplicateCount?.toLocaleString()}</p>
                  </div>
                )}
                {(activeMigration || migrationStatus)!.newRecordsCount !== undefined && (
                  <div>
                    <Label className="text-xs text-muted-foreground">New Records</Label>
                    <p className="font-medium text-blue-600">{(activeMigration || migrationStatus)!.newRecordsCount?.toLocaleString()}</p>
                  </div>
                )}
              </div>

              {(activeMigration || migrationStatus)!.errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {(activeMigration || migrationStatus)!.errorMessage}
                  </p>
                </div>
              )}

              {/* Logs and Errors Section */}
              {((activeMigration || migrationStatus)!.logs && (activeMigration || migrationStatus)!.logs!.length > 0) || 
                ((activeMigration || migrationStatus)!.errors && (activeMigration || migrationStatus)!.errors!.length > 0) ? (
                <div className="mt-6 border-t pt-4">
                  <Tabs defaultValue="logs" className="w-full">
                    <div className="flex items-center justify-between mb-4">
                      <TabsList>
                        <TabsTrigger value="logs">
                          Logs ({(activeMigration || migrationStatus)!.logs?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger value="errors">
                          Errors ({(activeMigration || migrationStatus)!.errors?.length || 0})
                        </TabsTrigger>
                      </TabsList>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const migration = activeMigration || migrationStatus;
                            const logs = migration?.logs || [];
                            const errors = migration?.errors || [];
                            const data = {
                              migrationId: migration?.migrationId,
                              tenantCode: migration?.tenantCode,
                              status: migration?.status,
                              logs,
                              errors,
                              exportedAt: new Date().toISOString(),
                            };
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `migration-logs-${migration?.migrationId || 'export'}-${Date.now()}.json`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export Logs
                        </Button>
                      </div>
                    </div>

                    <TabsContent value="logs" className="space-y-4">
                      <LogsDisplay logs={(activeMigration || migrationStatus)!.logs || []} />
                    </TabsContent>

                    <TabsContent value="errors" className="space-y-4">
                      <ErrorsDisplay errors={(activeMigration || migrationStatus)!.errors || []} />
                    </TabsContent>
                  </Tabs>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No active migration</p>
              <p className="text-xs mt-1">Start a migration to see status and logs here</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Migrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Migration History
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowHistoricalMigrations(!showHistoricalMigrations);
                if (!showHistoricalMigrations) {
                  refetchHistoricalMigrations();
                }
              }}
            >
              {showHistoricalMigrations ? (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Hide History
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Show History
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {showHistoricalMigrations && (
          <CardContent>
            {historicalMigrationsData?.migrations && historicalMigrationsData.migrations.length > 0 ? (
              <div className="space-y-4">
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Table</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Success</TableHead>
                        <TableHead>Errors</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historicalMigrationsData.migrations.map((migration) => {
                        const displayMigration = selectedHistoricalMigration?.migrationId === migration.migrationId 
                          ? (historicalMigrationDetails || migration)
                          : migration;
                        return (
                          <React.Fragment key={migration.migrationId}>
                            <TableRow
                              className={selectedHistoricalMigration?.migrationId === migration.migrationId ? 'bg-muted' : ''}
                            >
                              <TableCell className="font-medium">{migration.type || 'N/A'}</TableCell>
                              <TableCell>{migration.tableName || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(migration.status)}>
                                  {migration.status.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>{migration.totalRecords.toLocaleString()}</TableCell>
                              <TableCell className="text-green-600">{migration.successCount.toLocaleString()}</TableCell>
                              <TableCell className="text-red-600">{migration.errorCount.toLocaleString()}</TableCell>
                              <TableCell>
                                {migration.startTime 
                                  ? new Date(migration.startTime).toLocaleString()
                                  : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (selectedHistoricalMigration?.migrationId === migration.migrationId) {
                                      setSelectedHistoricalMigration(null);
                                    } else {
                                      setSelectedHistoricalMigration(migration);
                                      refetchHistoricalDetails();
                                    }
                                  }}
                                >
                                  {selectedHistoricalMigration?.migrationId === migration.migrationId ? (
                                    <>
                                      <ChevronDown className="w-4 h-4 mr-2" />
                                      Hide Details
                                    </>
                                  ) : (
                                    <>
                                      <ChevronRight className="w-4 h-4 mr-2" />
                                      View Details
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                            {selectedHistoricalMigration?.migrationId === migration.migrationId && (
                              <TableRow>
                                <TableCell colSpan={8} className="bg-muted/50">
                                  <div className="space-y-4 p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <Label className="text-xs text-muted-foreground">Progress</Label>
                                        <p className="font-medium">{Number(migration.progress).toFixed(1)}%</p>
                                      </div>
                                      <div>
                                        <Label className="text-xs text-muted-foreground">Duration</Label>
                                        <p className="font-medium">
                                          {formatDuration(migration.startTime, migration.endTime)}
                                        </p>
                                      </div>
                                      <div>
                                        <Label className="text-xs text-muted-foreground">Tenant Code</Label>
                                        <p className="font-medium">{migration.tenantCode || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <Label className="text-xs text-muted-foreground">End Time</Label>
                                        <p className="font-medium">
                                          {migration.endTime 
                                            ? new Date(migration.endTime).toLocaleString()
                                            : 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                    {migration.errorMessage && (
                                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-sm text-red-800">
                                          <strong>Error:</strong> {migration.errorMessage}
                                        </p>
                                      </div>
                                    )}
                                    {(displayMigration.logs && displayMigration.logs.length > 0) || 
                                     (displayMigration.errors && displayMigration.errors.length > 0) ? (
                                      <Tabs defaultValue="logs" className="w-full">
                                        <TabsList>
                                          <TabsTrigger value="logs">
                                            Logs ({displayMigration.logs?.length || 0})
                                          </TabsTrigger>
                                          <TabsTrigger value="errors">
                                            Errors ({displayMigration.errors?.length || 0})
                                          </TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="logs" className="space-y-4">
                                          <LogsDisplay logs={displayMigration.logs || []} />
                                        </TabsContent>
                                        <TabsContent value="errors" className="space-y-4">
                                          <ErrorsDisplay errors={displayMigration.errors || []} />
                                        </TabsContent>
                                      </Tabs>
                                    ) : (
                                      <p className="text-sm text-muted-foreground text-center py-4">
                                        No logs or errors available for this migration
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
                <div className="text-sm text-muted-foreground text-center">
                  Showing {historicalMigrationsData.migrations.length} of {historicalMigrationsData.total} migrations
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No historical migrations found</p>
                <p className="text-xs mt-1">Completed migrations will appear here</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Tabbed Interface for Imports */}
      <Tabs defaultValue="general-ledger" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general-ledger" className="flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            General Ledger
          </TabsTrigger>
          <TabsTrigger value="audit-tables" className="flex items-center">
            <Database className="w-4 h-4 mr-2" />
            Audit Tables
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: General Ledger Import */}
        <TabsContent value="general-ledger" className="space-y-4">
          {/* Export to general_ledger button */}
          <div className="mb-4">
            <Button 
              variant="default" 
              onClick={() => exportToAuditMutation.mutate()}
              disabled={
                !mainCompany?.id || 
                !(mainCompany as any)?.tenantCode || 
                exportToAuditMutation.isPending ||
                !!activeMigration
              }
              className="w-full"
            >
              <Database className={`w-4 h-4 mr-2 ${exportToAuditMutation.isPending ? 'animate-pulse' : ''}`} />
              {exportToAuditMutation.isPending ? 'Exporting...' : 'Export to general_ledger'}
            </Button>
          </div>

          {/* Available Tenant Codes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Available Tenant Codes ({filteredTenantCodes.length}{searchQuery && ` of ${tenantCodes.length}`})
                </CardTitle>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by tenant code, name, or record count..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
        <CardContent>
          {tenantCodesLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>Loading tenant codes...</span>
            </div>
          ) : tenantCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No tenant codes found</p>
              <p className="text-sm">Make sure MSSQL connection is configured correctly</p>
            </div>
          ) : filteredTenantCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No tenant codes match your search</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant Code</TableHead>
                    <TableHead>Tenant Name</TableHead>
                    <TableHead>Record Count</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenantCodes.map((tenant) => (
                    <TableRow key={tenant.tenantCode}>
                      <TableCell className="font-medium">{tenant.tenantCode}</TableCell>
                      <TableCell>{tenant.tenantName || 'N/A'}</TableCell>
                      <TableCell>{tenant.recordCount.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (tenant && mainCompany?.id) {
                                setSelectedTenant(tenant);
                                setIsImportDialogOpen(true);
                              }
                            }}
                            disabled={!mainCompany?.id}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Import
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (tenant && mainCompany?.id) {
                                setSelectedTenant(tenant);
                                // Start update directly without dialog
                                startUpdateMutation.mutate();
                              }
                            }}
                            disabled={!mainCompany?.id || startUpdateMutation.isPending}
                          >
                            <ArrowUpCircle className="w-4 h-4 mr-2" />
                            {startUpdateMutation.isPending ? 'Updating...' : 'Update'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Audit Tables Import */}
        <TabsContent value="audit-tables" className="space-y-4">
          {/* Audit Import Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Button 
              variant="default" 
              onClick={() => setIsAuditImportDialogOpen(true)}
              disabled={
                !mainCompany?.id || 
                auditTables.length === 0 ||
                activeMigration?.status === 'running'
              }
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Selected Tables
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => {
                // Import all tables
                if (confirm(`Import all ${auditTables.length} audit tables? This may take 10-60 minutes.`)) {
                  startFullAuditExportMutation.mutate({ batchSize: 1000 });
                }
              }}
              disabled={
                !mainCompany?.id || 
                auditTables.length === 0 ||
                activeMigration?.status === 'running' ||
                startFullAuditExportMutation.isPending
              }
              className="w-full"
            >
              <Database className={`w-4 h-4 mr-2 ${startFullAuditExportMutation.isPending ? 'animate-spin' : ''}`} />
              {startFullAuditExportMutation.isPending ? 'Exporting All...' : 'Import All Tables'}
            </Button>
          </div>

          {/* Available Audit Tables */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Available Audit Tables ({auditTables.filter(t => 
                    t.tableName.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                    t.recordCount.toString().includes(auditSearchQuery)
                  ).length}{auditSearchQuery && ` of ${auditTables.length}`})
                </CardTitle>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by table name or record count..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {auditTablesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading audit tables...</span>
                </div>
              ) : auditTables.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No audit tables found</p>
                  <p className="text-sm">Make sure MSSQL connection is configured correctly</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {auditTables
                      .filter(table => 
                        table.tableName.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                        table.recordCount.toString().includes(auditSearchQuery)
                      )
                      .map((table) => (
                        <div
                          key={table.tableName}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedAuditTables.has(table.tableName)
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            const newSelected = new Set(selectedAuditTables);
                            if (newSelected.has(table.tableName)) {
                              newSelected.delete(table.tableName);
                            } else {
                              newSelected.add(table.tableName);
                            }
                            setSelectedAuditTables(newSelected);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{table.tableName}</p>
                              <p className="text-xs text-muted-foreground">
                                {table.recordCount.toLocaleString()} records
                              </p>
                            </div>
                            <Checkbox 
                              checked={selectedAuditTables.has(table.tableName)}
                              onCheckedChange={() => {
                                const newSelected = new Set(selectedAuditTables);
                                if (newSelected.has(table.tableName)) {
                                  newSelected.delete(table.tableName);
                                } else {
                                  newSelected.add(table.tableName);
                                }
                                setSelectedAuditTables(newSelected);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Import Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">1</div>
            <div>
              <p className="font-medium">Select Tenant Code</p>
              <p className="text-sm text-muted-foreground">Choose the tenant code you want to import data for</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
            <div>
              <p className="font-medium">Configure Batch Size</p>
              <p className="text-sm text-muted-foreground">Set the number of records to process in each batch (recommended: 100-500)</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
            <div>
              <p className="font-medium">Start Import</p>
              <p className="text-sm text-muted-foreground">The system will automatically use your current company ID and start the migration</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">4</div>
            <div>
              <p className="font-medium">Monitor Progress</p>
              <p className="text-sm text-muted-foreground">Track the import progress and stop if needed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Import Dialog */}
      <Dialog open={isAuditImportDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAuditImportDialogOpen(false);
          setSelectedAuditTables(new Set());
        } else {
          setIsAuditImportDialogOpen(true);
        }
      }}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Import Audit Tables</DialogTitle>
            <DialogDescription>
              Select audit tables to import and configure batch size.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label>Selected Tables ({selectedAuditTables.size})</Label>
              <div className="border rounded-lg p-4 max-h-[200px] overflow-y-auto">
                {selectedAuditTables.size === 0 ? (
                  <p className="text-sm text-muted-foreground">No tables selected</p>
                ) : (
                  <div className="space-y-2">
                    {Array.from(selectedAuditTables).map((tableName) => (
                      <div key={tableName} className="flex items-center justify-between text-sm">
                        <span>{tableName}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const newSelected = new Set(selectedAuditTables);
                            newSelected.delete(tableName);
                            setSelectedAuditTables(newSelected);
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auditBatchSize">Batch Size</Label>
              <Input
                id="auditBatchSize"
                type="number"
                min="500"
                max="5000"
                step="500"
                defaultValue="1000"
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    // Store in state if needed
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Records per batch (500-5000, default 1000)
              </p>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAuditImportDialogOpen(false);
                  setSelectedAuditTables(new Set());
                }}
                disabled={startAuditTableMigrationMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={selectedAuditTables.size === 0 || startAuditTableMigrationMutation.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  const batchSizeInput = document.getElementById('auditBatchSize') as HTMLInputElement;
                  const batchSize = parseInt(batchSizeInput?.value) || 1000;
                  
                  // Start migration for each selected table
                  selectedAuditTables.forEach((tableName) => {
                    startAuditTableMigrationMutation.mutate({
                      tableName,
                      batchSize,
                    });
                  });
                }}
              >
                {startAuditTableMigrationMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Import {selectedAuditTables.size} Table{selectedAuditTables.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog - Single Modal Instance */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsImportDialogOpen(false);
          setSelectedTenant(null);
          form.reset();
        } else {
          setIsImportDialogOpen(true);
        }
      }}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Import Tenant Data</DialogTitle>
            <DialogDescription>
              Import data from MSSQL GeneralLedger to PostgreSQL journal_entries for the selected tenant.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleStartMigration)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tenant Code</Label>
              <Input
                value={selectedTenant?.tenantCode || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Record Count</Label>
              <Input
                value={selectedTenant?.recordCount.toLocaleString() || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batchSize">Batch Size</Label>
              <Input
                id="batchSize"
                type="number"
                min="1"
                max="1000"
                {...form.register('batchSize', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Number of records to process in each batch (1-1000)
              </p>
              {form.formState.errors.batchSize && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.batchSize.message}
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsImportDialogOpen(false);
                  setSelectedTenant(null);
                  form.reset();
                }}
                disabled={startMigrationMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={startMigrationMutation.isPending || !selectedTenant}
              >
                {startMigrationMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Import
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
