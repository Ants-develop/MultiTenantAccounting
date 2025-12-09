import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileArchive, RefreshCw, CheckCircle, XCircle,
  Clock, Cloud, HardDrive, ChevronDown, ChevronRight, AlertTriangle,
  Play, StopCircle, Save, Terminal
} from "lucide-react";
import { backupRestoreApi, RestoreHistory } from "@/api/backup-restore";
import { RestoreSSH } from "@/components/RestoreSSH";
import { apiRequest } from "@/lib/queryClient";
import { Connection, SshScript } from "@shared/schema";

export default function BackupRestore() {
  const [showRestoreHistory, setShowRestoreHistory] = useState(false);
  const [expandedErrorId, setExpandedErrorId] = useState<number | null>(null);

  // SSH Restore Console state
  const [selectedSshConnection, setSelectedSshConnection] = useState<string>("");
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const [customCommand, setCustomCommand] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [sshError, setSshError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [newScriptName, setNewScriptName] = useState("");
  const [newScriptCommand, setNewScriptCommand] = useState("");
  const [newScriptDescription, setNewScriptDescription] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Fetch restore history with auto-refresh for active restores
  const { data: restoreHistory = [], refetch: refetchHistory } = useQuery<RestoreHistory[]>({
    queryKey: ["/api/backup-restore/history"],
    queryFn: () => backupRestoreApi.fetchRestoreHistory(undefined),
    refetchInterval: (query) => {
      // If there are any active restores (downloading or restoring), poll every 2 seconds
      const hasActiveRestores = query.state.data?.some(
        (item) => ['downloading', 'restoring', 'migrating', 'uploading'].includes(item.restoreStatus)
      );
      return hasActiveRestores ? 2000 : false;
    },
  });

  // Fetch SSH connections
  const { data: sshConnections = [] } = useQuery<Connection[]>({
    queryKey: ["/api/mssql-explorer/connections", { type: "ssh" }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/mssql-explorer/connections?type=ssh");
      return res.json();
    },
  });

  // Fetch SSH scripts
  const { data: sshScriptsData = [], refetch: refetchScripts } = useQuery<SshScript[]>({
    queryKey: ["/api/ssh-terminal/scripts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/ssh-terminal/scripts");
      return res.json();
    },
  });

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Find active restore if any
  const activeRestore = restoreHistory.find(
    (item) => ['downloading', 'restoring', 'migrating', 'uploading'].includes(item.restoreStatus)
  );

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

  // --- SSH Restore Console handlers ---
  const appendLog = (line: string) => {
    setLogs((prev) => [...prev, line]);
  };

  const stopEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const handleRunScript = () => {
    stopEventSource();
    setLogs([]);
    setSshError(null);

    if (!selectedSshConnection) {
      setSshError("Select SSH connection first");
      return;
    }
    if (!selectedScriptId && !customCommand.trim()) {
      setSshError("Select a script or enter a custom command");
      return;
    }

    setStatus("running");

    const params = new URLSearchParams();
    params.append("sshConnectionId", selectedSshConnection);
    if (selectedScriptId) params.append("scriptId", selectedScriptId);
    if (customCommand.trim()) params.append("command", customCommand.trim());

    const es = new EventSource(`/api/ssh-terminal/run-script?${params.toString()}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "output") {
          appendLog(data.message);
        } else if (data.type === "error") {
          appendLog(`[error] ${data.message}`);
          setSshError(data.message);
        } else if (data.type === "status") {
          appendLog(`[status] ${data.status}`);
          if (data.status === "completed") {
            setStatus("completed");
            stopEventSource();
          } else if (data.status === "failed") {
            setStatus("failed");
            stopEventSource();
          }
        }
      } catch {
        appendLog(event.data);
      }
    };

    es.onerror = () => {
      appendLog("[error] Connection lost");
      setStatus("failed");
      setSshError("Connection lost");
      stopEventSource();
    };
  };

  const handleStop = () => {
    stopEventSource();
    setStatus("idle");
    appendLog("[status] Stopped by user");
  };

  const handleAddScript = async () => {
    if (!newScriptName.trim() || !newScriptCommand.trim()) {
      setSshError("Script name and command are required");
      return;
    }
    try {
      await apiRequest("POST", "/api/ssh-terminal/scripts", {
        body: JSON.stringify({
          name: newScriptName.trim(),
          description: newScriptDescription.trim() || undefined,
          command: newScriptCommand.trim(),
          category: "custom",
        }),
        headers: { "Content-Type": "application/json" },
      });
      setNewScriptName("");
      setNewScriptCommand("");
      setNewScriptDescription("");
      refetchScripts();
    } catch (err: any) {
      setSshError(err.message || "Failed to save script");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEventSource();
    };
  }, []);

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

      {/* New SSH-Based Restore Component */}
      <RestoreSSH
        activeRestore={activeRestore}
        onComplete={(restoreId) => {
          console.log('Restore completed:', restoreId);
          refetchHistory();
        }}
      />

      {/* SSH Restore Console */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            SSH Restore Console
          </CardTitle>
          <CardDescription>
            Run predefined or custom scripts over SSH (read-only output)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>SSH Connection</Label>
              <Select value={selectedSshConnection} onValueChange={setSelectedSshConnection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select SSH connection" />
                </SelectTrigger>
                <SelectContent>
                  {sshConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id.toString()}>
                      {conn.name} ({conn.server}:{conn.port || 22})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Predefined / Custom Scripts</Label>
              <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a script" />
                </SelectTrigger>
                <SelectContent>
                  {sshScriptsData.map((script) => (
                    <SelectItem key={script.id} value={script.id.toString()}>
                      {script.name} {script.category === 'predefined' ? '(predefined)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Custom Command (optional)</Label>
              <Input
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                placeholder="e.g. ./restore.sh or powershell ./restore.ps1"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleRunScript} disabled={status === "running"}>
              <Play className="w-4 h-4 mr-2" />
              {status === "running" ? "Running..." : "Run Script"}
            </Button>
            {status === "running" && (
              <Button variant="destructive" onClick={handleStop}>
                <StopCircle className="w-4 h-4 mr-2" />
                Stop
              </Button>
            )}
            <Badge variant="outline" className="capitalize">
              Status: {status}
            </Badge>
          </div>

          {sshError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{sshError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Output (read-only)</Label>
            <ScrollArea className="h-64 w-full rounded-md border bg-slate-950 p-3">
              <div className="space-y-1 font-mono text-xs text-slate-200">
                {logs.map((line, idx) => (
                  <div key={idx} className="whitespace-pre-wrap break-words">
                    {line}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </ScrollArea>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Save Custom Script</h3>
              <Badge variant="outline">Custom</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newScriptName}
                  onChange={(e) => setNewScriptName(e.target.value)}
                  placeholder="Restore Script"
                />
              </div>
              <div className="space-y-2">
                <Label>Command</Label>
                <Input
                  value={newScriptCommand}
                  onChange={(e) => setNewScriptCommand(e.target.value)}
                  placeholder="./restore.sh"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newScriptDescription}
                  onChange={(e) => setNewScriptDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <Button variant="outline" onClick={handleAddScript}>
              <Save className="w-4 h-4 mr-2" />
              Save Script
            </Button>
          </div>
        </CardContent>
      </Card>

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
