import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload, RefreshCw, AlertTriangle, CheckCircle, XCircle,
  Play, Clock, Database, Info, ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { backupRestoreApi, RestoredDatabase, MigrationOptions, MigrationLog } from "@/api/backup-restore";

interface TenantCode {
  tenantCode: number;
  tenantName?: string;
}

export default function MSSQLMigration() {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedRestoreId, setSelectedRestoreId] = useState<number | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<TenantCode | null>(null);
  const [isMigrationDialogOpen, setIsMigrationDialogOpen] = useState(false);
  const [migrationOptions, setMigrationOptions] = useState<Partial<MigrationOptions>>({
    migrationType: undefined,
    batchSize: 1000,
  });
  const [activeMigrationLogId, setActiveMigrationLogId] = useState<number | null>(null);
  const [monitoringMigration, setMonitoringMigration] = useState(false);
  const [showMigrationLogs, setShowMigrationLogs] = useState(false);
  const [postingsPeriodFrom, setPostingsPeriodFrom] = useState<string>('');
  const [postingsPeriodTo, setPostingsPeriodTo] = useState<string>('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all available clients
  const { data: availableClients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/clients');
      const data = await response.json();
      return data || [];
    },
    enabled: true,
  });

  // Initialize selectedClientId with first available client
  useEffect(() => {
    if (availableClients.length > 0 && selectedClientId === null) {
      setSelectedClientId(availableClients[0].id);
    }
  }, [availableClients, selectedClientId]);

  // Fetch restored databases
  const { data: restoredDatabases = [], isLoading: databasesLoading, refetch: refetchDatabases } = useQuery<RestoredDatabase[]>({
    queryKey: ["/api/backup-restore/restored-databases", selectedClientId],
    queryFn: () => backupRestoreApi.listRestoredDatabases(selectedClientId || undefined),
    staleTime: 30 * 1000, // Cache for 30 seconds to prevent spam
    refetchInterval: false, // Disable automatic refetching
  });

  // Fetch available tenant codes from MSSQL filtered by selected client's tenantCode
  const { data: tenantCodes = [], isLoading: tenantCodesLoading } = useQuery<TenantCode[]>({
    queryKey: ['/api/mssql/tenant-codes', postingsPeriodFrom, postingsPeriodTo, selectedClientId, availableClients],
    queryFn: async () => {
      const selectedClient = availableClients.find((c: any) => c.id === selectedClientId);

      const params = new URLSearchParams();
      if (postingsPeriodFrom) params.append('postingsPeriodFrom', postingsPeriodFrom);
      if (postingsPeriodTo) params.append('postingsPeriodTo', postingsPeriodTo);

      if (selectedClient?.tenantCode) {
        params.append('tenantCodes', String(selectedClient.tenantCode));
      }

      const url = `/api/mssql/tenant-codes${params.toString() ? '?' + params.toString() : ''}`;
      const response = await apiRequest('GET', url);
      const data = await response.json();
      return data.tenantCodes || [];
    },
    enabled: !!selectedClientId && availableClients.length > 0,
  });

  // Fetch migration logs
  const { data: migrationLogs = [], refetch: refetchMigrationLogs } = useQuery<MigrationLog[]>({
    queryKey: ["/api/backup-restore/migration-logs", selectedRestoreId],
    queryFn: () => backupRestoreApi.getMigrationLogs(selectedRestoreId || undefined),
    enabled: showMigrationLogs,
  });

  // Monitor active migration
  useEffect(() => {
    if (!activeMigrationLogId || !monitoringMigration) return;

    const interval = setInterval(async () => {
      try {
        const log = await backupRestoreApi.getMigrationLog(activeMigrationLogId);
        if (log.status === 'completed' || log.status === 'failed') {
          setMonitoringMigration(false);
          queryClient.invalidateQueries({ queryKey: ["/api/backup-restore/migration-logs"] });
          toast({
            title: log.status === 'completed' ? "Success" : "Error",
            description: log.status === 'completed' 
              ? `Migration completed: ${log.recordsInserted} records inserted` 
              : log.errorLog || "Migration failed",
            variant: log.status === 'failed' ? "destructive" : "default",
          });
        }
      } catch (error) {
        console.error("Error checking migration status:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeMigrationLogId, monitoringMigration, queryClient, toast]);

  // Execute migration mutation
  const executeMigrationMutation = useMutation<
    { success: boolean; message: string; migrationLogId: number },
    Error,
    MigrationOptions
  >({
    mutationFn: async (options) => {
      return await backupRestoreApi.executeMigration(options);
    },
    onSuccess: (result) => {
      setActiveMigrationLogId(result.migrationLogId);
      setMonitoringMigration(true);
      setIsMigrationDialogOpen(false);
      toast({
        title: "Success",
        description: "Migration process started",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start migration",
        variant: "destructive",
      });
    },
  });

  const handleStartMigration = () => {
    if (!selectedRestoreId || !migrationOptions.migrationType || !selectedTenant || !selectedClientId) {
      toast({
        title: "Error",
        description: "Please select a restored database, migration type, tenant code, and client",
        variant: "destructive",
      });
      return;
    }

    const options: MigrationOptions = {
      restoreId: selectedRestoreId,
      migrationType: migrationOptions.migrationType as "general-ledger" | "audit" | "rs",
      tenantCode: selectedTenant.tenantCode,
      clientId: selectedClientId,
      batchSize: migrationOptions.batchSize || 1000,
      postingsPeriodFrom: migrationOptions.postingsPeriodFrom,
      postingsPeriodTo: migrationOptions.postingsPeriodTo,
    };

    executeMigrationMutation.mutate(options);
  };

  const formatFileSize = (mb?: string): string => {
    if (!mb) return "Unknown";
    const size = parseFloat(mb);
    if (size < 1024) return `${size.toFixed(2)} MB`;
    return `${(size / 1024).toFixed(2)} GB`;
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      case "pending":
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "running":
        return <Badge className="bg-blue-600"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const selectedDatabase = restoredDatabases.find(db => db.id === selectedRestoreId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center">
            <Upload className="w-6 h-6 mr-2" />
            MSSQL Migration
          </h1>
          <p className="text-muted-foreground">
            Migrate data from restored MSSQL databases to PostgreSQL
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              refetchDatabases();
              refetchMigrationLogs();
            }}
            disabled={databasesLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${databasesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Client Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Select Client</Label>
            {clientsLoading ? (
              <p className="text-sm text-muted-foreground">Loading clients...</p>
            ) : availableClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No clients configured</p>
            ) : (
              <Select
                value={selectedClientId?.toString() || ""}
                onValueChange={(value) => setSelectedClientId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {availableClients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name} {client.code ? `(${client.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Restored Databases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Restored Databases
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Select a restored database to migrate data to PostgreSQL
          </p>
        </CardHeader>
        <CardContent>
          {databasesLoading ? (
            <div className="text-center py-8">Loading restored databases...</div>
          ) : restoredDatabases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No restored databases found</p>
              <p className="text-xs mt-2">Restore a database from the Backup Restore page first</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Database Name</TableHead>
                  <TableHead>Source File</TableHead>
                  <TableHead>Restored</TableHead>
                  <TableHead>Backup Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restoredDatabases.map((db) => (
                  <TableRow
                    key={db.id}
                    className={selectedRestoreId === db.id ? "bg-muted" : ""}
                    onClick={() => {
                      setSelectedRestoreId(db.id);
                      setShowMigrationLogs(true);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <TableCell className="font-medium">{db.restoredDbName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{db.googleDriveFileName}</TableCell>
                    <TableCell>{formatDate(db.restoreTimestamp)}</TableCell>
                    <TableCell>{db.originalBackupDate ? formatDate(db.originalBackupDate) : "-"}</TableCell>
                    <TableCell>{formatFileSize(db.databaseSizeMb)}</TableCell>
                    <TableCell>{getStatusBadge(db.restoreStatus)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedRestoreId(db.id);
                          setIsMigrationDialogOpen(true);
                        }}
                        disabled={db.restoreStatus !== 'completed'}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Migrate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Migration Logs */}
      {selectedRestoreId && showMigrationLogs && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <ArrowRight className="w-5 h-5 mr-2" />
                Migration Logs
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMigrationLogs(false)}
              >
                Hide Logs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {migrationLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No migration logs found for this database</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source Table</TableHead>
                      <TableHead>Target Table</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead>Inserted</TableHead>
                      <TableHead>Failed</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {migrationLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.sourceTable}</TableCell>
                        <TableCell>{log.targetTable}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>{log.recordsProcessed}</TableCell>
                        <TableCell className="text-green-600">{log.recordsInserted}</TableCell>
                        <TableCell className="text-red-600">{log.recordsFailed}</TableCell>
                        <TableCell>{formatDate(log.migrationTimestamp)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {log.errorLog || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Migration Dialog */}
      <Dialog open={isMigrationDialogOpen} onOpenChange={setIsMigrationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Migration</DialogTitle>
            <DialogDescription>
              Configure migration options for {selectedDatabase?.restoredDbName || 'selected database'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Migration Type</Label>
              <Select
                value={migrationOptions.migrationType || ""}
                onValueChange={(value: any) => setMigrationOptions({ ...migrationOptions, migrationType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select migration type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general-ledger">General Ledger</SelectItem>
                  <SelectItem value="audit">Audit</SelectItem>
                  <SelectItem value="rs">RS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tenant Code</Label>
              {tenantCodesLoading ? (
                <p className="text-sm text-muted-foreground">Loading tenant codes...</p>
              ) : tenantCodes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tenant codes available</p>
              ) : (
                <Select
                  value={selectedTenant?.tenantCode.toString() || ""}
                  onValueChange={(value) => {
                    const tenant = tenantCodes.find(t => t.tenantCode.toString() === value);
                    setSelectedTenant(tenant || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant code" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantCodes.map((tenant) => (
                      <SelectItem key={tenant.tenantCode} value={tenant.tenantCode.toString()}>
                        {tenant.tenantCode} {tenant.tenantName ? `- ${tenant.tenantName}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label>Batch Size</Label>
              <Input
                type="number"
                value={migrationOptions.batchSize || 1000}
                onChange={(e) => setMigrationOptions({ ...migrationOptions, batchSize: parseInt(e.target.value) || 1000 })}
              />
            </div>

            {migrationOptions.migrationType === "general-ledger" && (
              <>
                <div>
                  <Label>Postings Period From</Label>
                  <Input
                    type="date"
                    value={migrationOptions.postingsPeriodFrom || ""}
                    onChange={(e) => setMigrationOptions({ ...migrationOptions, postingsPeriodFrom: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Postings Period To</Label>
                  <Input
                    type="date"
                    value={migrationOptions.postingsPeriodTo || ""}
                    onChange={(e) => setMigrationOptions({ ...migrationOptions, postingsPeriodTo: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMigrationDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStartMigration} 
              disabled={
                executeMigrationMutation.isPending || 
                !selectedRestoreId ||
                !migrationOptions.migrationType ||
                !selectedTenant ||
                !selectedClientId
              }
            >
              {executeMigrationMutation.isPending ? "Starting..." : "Start Migration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

