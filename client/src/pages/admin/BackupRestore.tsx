import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Square,
  FileArchive,
  Settings,
  Key,
  Copy,
  ExternalLink,
  Upload,
  HardDrive,
  Cloud,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { backupRestoreApi, DriveFile, RestoreStatus, RestoreOptions, RestoreHistory, ConfigStatus, StorageBackup } from "@/api/backup-restore";
import { apiRequest } from "@/lib/queryClient";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

function getStatusBadge(status: string) {
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
}

export default function BackupRestore() {

  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [selectedStorageBackup, setSelectedStorageBackup] = useState<StorageBackup | null>(null);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [restoreOptions, setRestoreOptions] = useState<RestoreOptions>({
    migrationType: "general-ledger",
    batchSize: 1000,
  });
  const [activeRestoreId, setActiveRestoreId] = useState<number | null>(null);
  const [monitoringRestore, setMonitoringRestore] = useState(false);
  const [isOAuthModalOpen, setIsOAuthModalOpen] = useState(false);
  const [authUrl, setAuthUrl] = useState<string>("");
  const [authCode, setAuthCode] = useState<string>("");
  const [refreshToken, setRefreshToken] = useState<string>("");
  const [oauthStep, setOauthStep] = useState<"url" | "code" | "success">("url");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check configuration status
  const { data: configStatus } = useQuery<ConfigStatus>({
    queryKey: ["/api/backup-restore/config-status"],
    queryFn: () => backupRestoreApi.checkConfigStatus(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch drive files (only if configured)
  const { data: driveFiles = [], isLoading: filesLoading, error: filesError, refetch: refetchFiles } = useQuery<DriveFile[]>({
    queryKey: ["/api/backup-restore/drive-files"],
    queryFn: () => backupRestoreApi.fetchDriveFiles(),
    enabled: configStatus?.googleDrive.configured !== false,
    retry: false,
  });

  // Fetch storage backups
  const { data: storageBackups = [], isLoading: storageLoading, refetch: refetchStorage } = useQuery<StorageBackup[]>({
    queryKey: ["/api/backup-restore/storage-files"],
    queryFn: () => backupRestoreApi.listStorageBackups(),
    enabled: configStatus?.supabase.configured !== false,
  });

  // Fetch restore history
  const { data: restoreHistory = [], refetch: refetchHistory } = useQuery<RestoreHistory[]>({
    queryKey: ["/api/backup-restore/history"],
    queryFn: () => backupRestoreApi.fetchRestoreHistory(),
  });

  // Monitor active restore
  useEffect(() => {
    if (!activeRestoreId || !monitoringRestore) return;

    const interval = setInterval(async () => {
      try {
        const status = await backupRestoreApi.getRestoreStatus(activeRestoreId);
        if (status.restoreStatus === 'completed' || status.restoreStatus === 'failed') {
          setMonitoringRestore(false);
          queryClient.invalidateQueries({ queryKey: ["/api/backup-restore/history"] });
          refetchStorage();
          toast({
            title: status.restoreStatus === 'completed' ? "Success" : "Error",
            description: status.restoreStatus === 'completed' 
              ? "Restore completed successfully" 
              : status.errorMessage || "Restore failed",
            variant: status.restoreStatus === 'failed' ? "destructive" : "default",
          });
        }
      } catch (error) {
        console.error("Error checking restore status:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeRestoreId, monitoringRestore, queryClient, refetchStorage, toast]);

  // Start restore mutation
  const startRestoreMutation = useMutation({
    mutationFn: (data: { fileId?: string; fileName?: string; storagePath?: string; options: RestoreOptions }) =>
      backupRestoreApi.startRestore(data.fileId, data.fileName, data.storagePath, data.options),
    onSuccess: (result) => {
      setActiveRestoreId(result.restoreId);
      setMonitoringRestore(true);
      setIsRestoreDialogOpen(false);
      toast({
        title: "Success",
        description: "Restore process started",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start restore",
        variant: "destructive",
      });
    },
  });

  // Upload to storage mutation
  const uploadToStorageMutation = useMutation({
    mutationFn: (data: { file: File }) =>
      backupRestoreApi.uploadBackupToStorage(data.file),
    onSuccess: () => {
      setIsUploadDialogOpen(false);
      setUploadFile(null);
      refetchStorage();
      queryClient.invalidateQueries({ queryKey: ["/api/backup-restore/history"] });
      toast({
        title: "Success",
        description: "Backup uploaded to Supabase Storage successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload backup",
        variant: "destructive",
      });
    },
  });

  // Delete from storage mutation
  const deleteFromStorageMutation = useMutation({
    mutationFn: (storagePath: string) => backupRestoreApi.deleteBackupFromStorage(storagePath),
    onSuccess: () => {
      refetchStorage();
      queryClient.invalidateQueries({ queryKey: ["/api/backup-restore/history"] });
      toast({
        title: "Success",
        description: "Backup deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete backup",
        variant: "destructive",
      });
    },
  });

  const handleStartRestore = () => {
    if (selectedFile) {
      startRestoreMutation.mutate({
        fileId: selectedFile.id,
        fileName: selectedFile.name,
        options: restoreOptions,
      });
    } else if (selectedStorageBackup) {
      startRestoreMutation.mutate({
        storagePath: selectedStorageBackup.path,
        options: restoreOptions,
      });
    }
  };

  const handleUploadToStorage = () => {
    if (!uploadFile) {
      toast({
        title: "Error",
        description: "Please select a file",
        variant: "destructive",
      });
      return;
    }
    uploadToStorageMutation.mutate({
      file: uploadFile,
    });
  };

  const handleDeleteFromStorage = (storagePath: string) => {
    if (confirm("Are you sure you want to delete this backup from Supabase Storage?")) {
      deleteFromStorageMutation.mutate(storagePath);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileArchive className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Backup & Restore</h1>
            <p className="text-muted-foreground">
              Manage database backups from Google Drive and Supabase Storage
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetchFiles()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload to Storage
          </Button>
        </div>
      </div>

      {/* Configuration Status */}
      {configStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Cloud className="h-4 w-4" />
                  <span className="font-medium">Google Drive</span>
                  {configStatus.googleDrive.configured ? (
                    <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Configured</Badge>
                  ) : (
                    <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Not Configured</Badge>
                  )}
                </div>
                {!configStatus.googleDrive.configured && (
                  <ul className="text-sm text-muted-foreground ml-6 list-disc">
                    {configStatus.googleDrive.missing.clientId && <li>Missing CLIENT_ID</li>}
                    {configStatus.googleDrive.missing.clientSecret && <li>Missing CLIENT_SECRET</li>}
                    {configStatus.googleDrive.missing.refreshToken && <li>Missing REFRESH_TOKEN</li>}
                  </ul>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="h-4 w-4" />
                  <span className="font-medium">Supabase Storage</span>
                  {configStatus.supabase.configured ? (
                    <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Configured</Badge>
                  ) : (
                    <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Not Configured</Badge>
                  )}
                </div>
                {!configStatus.supabase.configured && (
                  <ul className="text-sm text-muted-foreground ml-6 list-disc">
                    {configStatus.supabase.missing.url && <li>Missing SUPABASE_URL</li>}
                    {configStatus.supabase.missing.serviceRoleKey && <li>Missing SUPABASE_SERVICE_ROLE_KEY</li>}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="google-drive" className="space-y-4">
        <TabsList>
          <TabsTrigger value="google-drive">Google Drive</TabsTrigger>
          <TabsTrigger value="supabase-storage">Supabase Storage</TabsTrigger>
          <TabsTrigger value="history">Restore History</TabsTrigger>
        </TabsList>

        <TabsContent value="google-drive" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Google Drive Backups</CardTitle>
                  <CardDescription>
                    Select a .bak file from Google Drive to restore
                  </CardDescription>
                </div>
                {!configStatus?.googleDrive.configured && (
                  <Button onClick={() => setIsOAuthModalOpen(true)} variant="outline">
                    <Key className="h-4 w-4 mr-2" />
                    Configure Google Drive
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filesLoading ? (
                <div className="text-center py-8">Loading Google Drive files...</div>
              ) : filesError ? (
                <div className="text-center py-8 text-destructive">
                  Error loading files: {filesError instanceof Error ? filesError.message : "Unknown error"}
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No .bak files found in Google Drive
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Modified</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driveFiles.map((file) => (
                      <TableRow
                        key={file.id}
                        className={selectedFile?.id === file.id ? "bg-muted" : ""}
                        onClick={() => setSelectedFile(file)}
                        style={{ cursor: "pointer" }}
                      >
                        <TableCell className="font-medium">{file.name}</TableCell>
                        <TableCell>{formatFileSize(file.size)}</TableCell>
                        <TableCell>{formatDate(file.modifiedTime)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedFile(file);
                              setIsRestoreDialogOpen(true);
                            }}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supabase-storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supabase Storage Backups</CardTitle>
              <CardDescription>
                Backups stored in Supabase Storage (automatically uploaded from Google Drive or manually uploaded)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {storageLoading ? (
                <div className="text-center py-8">Loading storage backups...</div>
              ) : storageBackups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No backups found in Supabase Storage
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storageBackups.map((backup) => (
                      <TableRow
                        key={backup.path}
                        className={selectedStorageBackup?.path === backup.path ? "bg-muted" : ""}
                        onClick={() => setSelectedStorageBackup(backup)}
                        style={{ cursor: "pointer" }}
                      >
                        <TableCell className="font-medium">{backup.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{backup.path}</TableCell>
                        <TableCell>{formatFileSize(backup.size)}</TableCell>
                        <TableCell>{formatDate(backup.created_at)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedStorageBackup(backup);
                                setIsRestoreDialogOpen(true);
                              }}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Restore
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteFromStorage(backup.path)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Restore History</CardTitle>
              <CardDescription>
                History of all backup restore operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {restoreHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No restore history found
                </div>
              ) : (
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
                        <TableCell className="text-sm text-muted-foreground">
                          {record.errorMessage || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Restore Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Restore Backup</DialogTitle>
            <DialogDescription>
              Configure restore options for {selectedFile?.name || selectedStorageBackup?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Migration Type</Label>
              <Select
                value={restoreOptions.migrationType || "general-ledger"}
                onValueChange={(value: any) => setRestoreOptions({ ...restoreOptions, migrationType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general-ledger">General Ledger</SelectItem>
                  <SelectItem value="audit">Audit</SelectItem>
                  <SelectItem value="rs">RS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Batch Size</Label>
              <Input
                type="number"
                value={restoreOptions.batchSize || 1000}
                onChange={(e) => setRestoreOptions({ ...restoreOptions, batchSize: parseInt(e.target.value) || 1000 })}
              />
            </div>
            {restoreOptions.migrationType === "general-ledger" && (
              <>
                <div>
                  <Label>Postings Period From</Label>
                  <Input
                    type="date"
                    value={restoreOptions.postingsPeriodFrom || ""}
                    onChange={(e) => setRestoreOptions({ ...restoreOptions, postingsPeriodFrom: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Postings Period To</Label>
                  <Input
                    type="date"
                    value={restoreOptions.postingsPeriodTo || ""}
                    onChange={(e) => setRestoreOptions({ ...restoreOptions, postingsPeriodTo: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartRestore} disabled={startRestoreMutation.isPending}>
              {startRestoreMutation.isPending ? "Starting..." : "Start Restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload to Storage Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Backup to Supabase Storage</DialogTitle>
            <DialogDescription>
              Upload a .bak file directly to Supabase Storage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select .bak File</Label>
              <Input
                type="file"
                accept=".bak"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadFile(file);
                  }
                }}
              />
              {uploadFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadToStorage} disabled={uploadToStorageMutation.isPending || !uploadFile}>
              {uploadToStorageMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OAuth Configuration Modal */}
      <Dialog open={isOAuthModalOpen} onOpenChange={setIsOAuthModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Google Drive OAuth</DialogTitle>
            <DialogDescription>
              Set up Google Drive API access to download backup files
            </DialogDescription>
          </DialogHeader>
          <Tabs value={oauthStep} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="url">1. Get URL</TabsTrigger>
              <TabsTrigger value="code">2. Get Code</TabsTrigger>
              <TabsTrigger value="success">3. Complete</TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="space-y-4">
              <Button
                onClick={async () => {
                  try {
                    const { url, clientId } = await backupRestoreApi.generateAuthUrl();
                    setAuthUrl(url);
                    window.open(url, '_blank');
                    setOauthStep("code");
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to generate auth URL",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Generate Authorization URL
              </Button>
              {authUrl && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm mb-2">Authorization URL generated. Open it in a new tab.</p>
                  <div className="flex gap-2">
                    <Input value={authUrl} readOnly />
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(authUrl);
                        toast({ title: "Copied", description: "URL copied to clipboard" });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="code" className="space-y-4">
              <div>
                <Label>Authorization Code</Label>
                <Input
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="Paste the authorization code here"
                />
              </div>
              <Button
                onClick={async () => {
                  try {
                    const result = await backupRestoreApi.exchangeCode(authCode);
                    setRefreshToken(result.refreshToken);
                    setOauthStep("success");
                    toast({
                      title: "Success",
                      description: "Refresh token obtained. Add it to your .env file.",
                    });
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to exchange code",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={!authCode}
              >
                Exchange Code
              </Button>
            </TabsContent>
            <TabsContent value="success" className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm mb-2 font-medium">Refresh Token:</p>
                <div className="flex gap-2">
                  <Input value={refreshToken} readOnly />
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(refreshToken);
                      toast({ title: "Copied", description: "Refresh token copied to clipboard" });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Add this to your .env file as GOOGLE_DRIVE_REFRESH_TOKEN and restart the server.
                </p>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOAuthModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

