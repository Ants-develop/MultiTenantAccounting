import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileArchive, RefreshCw, CheckCircle, XCircle,
  Clock, Cloud, HardDrive, ChevronDown, ChevronRight, AlertTriangle,
  Wifi, WifiOff, Database, Loader
} from "lucide-react";
import { backupRestoreApi, RestoreHistory } from "@/api/backup-restore";
import { RestoreSSH } from "@/components/RestoreSSH";
import { apiRequest } from "@/lib/queryClient";

export default function BackupRestore() {
  const [showRestoreHistory, setShowRestoreHistory] = useState(false);
  const [expandedErrorId, setExpandedErrorId] = useState<number | null>(null);
  const [sshStatus, setSshStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [mssqlStatus, setMssqlStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Check connection status on mount and periodically
  useEffect(() => {
    const checkConnections = async () => {
      try {
        // Test SSH connection using centralized apiRequest (handles auth automatically)
        try {
          const sshResponse = await apiRequest("GET", "/api/backup-restore/test-ssh");
          const sshData = await sshResponse.json();
          // Accept both 'configured' and 'connected' as valid states
          setSshStatus(sshData.status === 'disconnected' ? 'disconnected' : 'connected');
        } catch (err: any) {
          console.error('SSH test error:', err);
          setSshStatus('disconnected');
          setConnectionError(err.message || 'SSH connection failed');
        }

        // Test MSSQL connection using centralized apiRequest
        try {
          const mssqlResponse = await apiRequest("GET", "/api/backup-restore/test-mssql");
          const mssqlData = await mssqlResponse.json();
          setMssqlStatus(mssqlData.status === 'disconnected' ? 'disconnected' : 'connected');
          if (mssqlData.status === 'disconnected') {
            setConnectionError(mssqlData.details || mssqlData.error || 'MSSQL connection failed');
          } else {
            setConnectionError(null);
          }
        } catch (err: any) {
          console.error('MSSQL test error:', err);
          setMssqlStatus('disconnected');
          // Extract error message if available
          if (err instanceof Error) {
            setConnectionError(err.message);
          } else {
            setConnectionError('MSSQL connection failed');
          }
        }
      } catch (err) {
        console.error('Connection check failed:', err);
      }
    };

    checkConnections();
    // Recheck every 30 seconds
    const interval = setInterval(checkConnections, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch restore history with auto-refresh for active restores
  const { data: restoreHistory = [], refetch: refetchHistory } = useQuery<RestoreHistory[]>({
    queryKey: ["/api/backup-restore/history"],
    queryFn: () => backupRestoreApi.fetchRestoreHistory(undefined),
    refetchInterval: (query) => {
      // If there are any active restores (downloading or restoring), poll every 2 seconds
      const hasActiveRestores = query.state.data?.some(
        (item) => item.restoreStatus === 'downloading' || item.restoreStatus === 'restoring'
      );
      return hasActiveRestores ? 2000 : false;
    },
  });

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
      case "downloading":
      case "uploading":
      case "restoring":
      case "migrating":
        return <Badge className="bg-blue-600"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> {status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const truncateError = (error: string, maxLength: number = 100): string => {
    if (!error) return "-";
    if (error.length <= maxLength) return error;
    return error.substring(0, maxLength) + "...";
  };

  const getErrorSummary = (error: string): string => {
    if (!error) return "";
    
    // Extract key error messages
    if (error.includes("credentials.json")) {
      return "Google Drive credentials file not found on remote server";
    }
    if (error.includes("Cannot open database") || error.includes("Login failed")) {
      return "SQL Server authentication failed - check database credentials";
    }
    if (error.includes("Script 1 failed")) {
      return "Download/restore script failed";
    }
    if (error.includes("Script 2 failed")) {
      return "Date update/transfer script failed";
    }
    
    return truncateError(error, 80);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center">
            <FileArchive className="w-6 h-6 mr-2" />
            Backup Restore
          </h1>
          <p className="text-muted-foreground">
            Restore .bak files from Google Drive to MSSQL via SSH
          </p>
        </div>
      </div>

      {/* Connection Status Panel */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SSH Status */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30">
              <div className="flex-shrink-0 pt-1">
                {sshStatus === 'checking' && (
                  <Loader className="w-5 h-5 text-yellow-500 animate-spin" />
                )}
                {sshStatus === 'connected' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {sshStatus === 'disconnected' && (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">SSH Server</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sshStatus === 'checking' && 'Checking connection...'}
                  {sshStatus === 'connected' && 'Connected successfully'}
                  {sshStatus === 'disconnected' && 'Unable to connect'}
                </p>
                {sshStatus === 'disconnected' && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Check SSH credentials and firewall rules
                  </p>
                )}
              </div>
            </div>

            {/* MSSQL Status */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30">
              <div className="flex-shrink-0 pt-1">
                {mssqlStatus === 'checking' && (
                  <Loader className="w-5 h-5 text-yellow-500 animate-spin" />
                )}
                {mssqlStatus === 'connected' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {mssqlStatus === 'disconnected' && (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  MSSQL Database
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mssqlStatus === 'checking' && 'Checking connection...'}
                  {mssqlStatus === 'connected' && 'Connected successfully'}
                  {mssqlStatus === 'disconnected' && 'Unable to connect'}
                </p>
                {mssqlStatus === 'disconnected' && connectionError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 break-words">
                    {connectionError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Connection Status Summary */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              {sshStatus === 'connected' && mssqlStatus === 'connected' ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    All systems ready for restore operations
                  </span>
                </>
              ) : sshStatus === 'checking' || mssqlStatus === 'checking' ? (
                <>
                  <Loader className="w-4 h-4 text-yellow-500 animate-spin" />
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">
                    Checking connections...
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    Some connections unavailable - restore may fail
                  </span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Component - Only show if connections available */}
      {sshStatus === 'connected' && mssqlStatus === 'connected' ? (
        <RestoreSSH
          onComplete={(restoreId) => {
            console.log('Restore completed:', restoreId);
            refetchHistory();
          }}
        />
      ) : (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Cannot start restore: {sshStatus !== 'connected' ? 'SSH connection unavailable' : ''} {mssqlStatus !== 'connected' ? 'MSSQL connection unavailable' : ''}.
            Please check your connection settings and try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Restore History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Restore History</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowRestoreHistory(!showRestoreHistory);
                if (!showRestoreHistory) {
                  refetchHistory();
                }
              }}
            >
              {showRestoreHistory ? (
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
        {showRestoreHistory && (
          <CardContent>
            {restoreHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No restore history found</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {restoreHistory.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.googleDriveFileName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {record.storageSource === 'google_drive' ? (
                              <><Cloud className="h-3 w-3 mr-1" /> Google Drive</>
                            ) : (
                              <><HardDrive className="h-3 w-3 mr-1" /> Supabase Storage</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(record.restoreStatus)}</TableCell>
                        <TableCell>{formatDate(record.startedAt)}</TableCell>
                        <TableCell>{record.completedAt ? formatDate(record.completedAt) : "-"}</TableCell>
                        <TableCell className="text-sm">
                          {record.errorMessage ? (
                            <div className="space-y-1">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-red-600 dark:text-red-400 font-medium">
                                    {getErrorSummary(record.errorMessage)}
                                  </div>
                                  {record.errorMessage.length > 80 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-auto p-0 mt-1 text-xs text-muted-foreground hover:text-foreground"
                                      onClick={() => setExpandedErrorId(expandedErrorId === record.id ? null : record.id)}
                                    >
                                      {expandedErrorId === record.id ? "Hide details" : "Show full error"}
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {expandedErrorId === record.id && (
                                <Alert variant="destructive" className="mt-2">
                                  <AlertDescription className="font-mono text-xs whitespace-pre-wrap break-words">
                                    {record.errorMessage}
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
