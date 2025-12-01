import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileArchive, RefreshCw, AlertTriangle, CheckCircle, XCircle,
  Play, Clock, Cloud, HardDrive, Key, Copy, ChevronDown, ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { backupRestoreApi, DriveFile, StorageBackup, RestoreOptions, RestoreHistory, ConfigStatus } from "@/api/backup-restore";

export default function BackupRestore() {
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveFile | null>(null);
  const [selectedStorageBackup, setSelectedStorageBackup] = useState<StorageBackup | null>(null);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [isOAuthModalOpen, setIsOAuthModalOpen] = useState(false);
  const [authUrl, setAuthUrl] = useState<string>("");
  const [authCode, setAuthCode] = useState<string>("");
  const [refreshToken, setRefreshToken] = useState<string>("");
  const [oauthStep, setOauthStep] = useState<"url" | "code" | "success">("url");
  const [activeRestoreId, setActiveRestoreId] = useState<number | null>(null);
  const [monitoringRestore, setMonitoringRestore] = useState(false);
  const [showRestoreHistory, setShowRestoreHistory] = useState(false);
  const [driveFilesLimit, setDriveFilesLimit] = useState(5);
  const [storageBackupsLimit, setStorageBackupsLimit] = useState(5);
  const [googleDriveFileId, setGoogleDriveFileId] = useState('');

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

  // Fetch storage backups (only if configured)
  const { data: storageBackups = [], isLoading: storageLoading, refetch: refetchStorage } = useQuery<StorageBackup[]>({
    queryKey: ["/api/backup-restore/storage-files"],
    queryFn: () => backupRestoreApi.listStorageBackups(),
    enabled: configStatus?.supabase.configured !== false,
  });

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

  // Monitor active restore with detailed status updates
  useEffect(() => {
    if (!activeRestoreId || !monitoringRestore) return;

    const interval = setInterval(async () => {
      try {
        // Refetch history to get latest status
        await refetchHistory();
        
        const status = await backupRestoreApi.getRestoreStatus(activeRestoreId);
        
        // Update monitoring based on status
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
  }, [activeRestoreId, monitoringRestore, queryClient, refetchStorage, refetchHistory, toast]);

  // Enhanced restore mutation supporting both Google Drive and Supabase Storage
  const restoreFromDriveMutation = useMutation<
    { restoreId: number; message: string },
    Error,
    { fileId?: string; fileName?: string; storagePath?: string; options?: RestoreOptions }
  >({
    mutationFn: async (data) => {
      // Build restore options - just restore, no migration
      const options: RestoreOptions = {
        clientId: undefined, // Client selection is not needed for restore
      };

      const result = await backupRestoreApi.startRestore(
        data.fileId,
        data.fileName,
        data.storagePath,
        options
      );
      return result;
    },
    onSuccess: (result) => {
      setActiveRestoreId(result.restoreId);
      setMonitoringRestore(true);
      setIsRestoreConfirmOpen(false);
      setSelectedDriveFile(null);
      setSelectedStorageBackup(null);
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

  const handleConfirmRestore = () => {
    const options: RestoreOptions = {};

    if (selectedDriveFile) {
      restoreFromDriveMutation.mutate({
        fileId: selectedDriveFile.id,
        fileName: selectedDriveFile.name,
        options,
      });
    } else if (selectedStorageBackup) {
      restoreFromDriveMutation.mutate({
        storagePath: selectedStorageBackup.path,
        options,
      });
    } else if (googleDriveFileId) {
      // Fallback to manual file ID
      restoreFromDriveMutation.mutate({
        fileId: googleDriveFileId,
        fileName: `backup_${Date.now()}.bak`,
        options,
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
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
      case "downloading":
      case "uploading":
      case "restoring":
      case "migrating":
        return <Badge className="bg-blue-600"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> {status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
            Restore .bak files from Google Drive or Supabase Storage to MSSQL
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              refetchFiles();
              refetchStorage();
            }}
            disabled={filesLoading || storageLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${filesLoading || storageLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Backup Restore Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <FileArchive className="w-5 h-5 mr-2" />
                Backup Restore
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Restore .bak files from Google Drive or Supabase Storage
              </p>
            </div>
            <Button onClick={() => refetchFiles()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configuration Status */}
          {configStatus && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Cloud className="h-4 w-4" />
                  <span className="font-medium text-sm">Google Drive</span>
                  {configStatus.googleDrive.configured ? (
                    <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Configured</Badge>
                  ) : (
                    <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Not Configured</Badge>
                  )}
                </div>
                {!configStatus.googleDrive.configured && (
                  <Button
                    onClick={() => setIsOAuthModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Configure Google Drive
                  </Button>
                )}
              </div>
              {configStatus.supabase.configured && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="h-4 w-4" />
                    <span className="font-medium text-sm">Supabase Storage</span>
                    <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Configured</Badge>
                  </div>
                </div>
              )}
            </div>
          )}

          <Tabs defaultValue="google-drive" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="google-drive">Google Drive</TabsTrigger>
              {configStatus?.supabase.configured && (
                <TabsTrigger value="supabase-storage">Supabase Storage</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="google-drive" className="space-y-4">
              {filesLoading ? (
                <div className="text-center py-8">Loading Google Drive files...</div>
              ) : filesError ? (
                <div className="text-center py-8 text-destructive">
                  Error loading files: {filesError instanceof Error ? filesError.message : "Unknown error"}
                  {!configStatus?.googleDrive.configured && (
                    <div className="mt-2">
                      <Button onClick={() => setIsOAuthModalOpen(true)} variant="outline" size="sm">
                        <Key className="h-4 w-4 mr-2" />
                        Configure Google Drive
                      </Button>
                    </div>
                  )}
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="mb-4">
                    <FileArchive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No .bak files found in Google Drive</p>
                    {!configStatus?.googleDrive.configured && (
                      <Button onClick={() => setIsOAuthModalOpen(true)} variant="outline" className="mt-4">
                        <Key className="h-4 w-4 mr-2" />
                        Configure Google Drive
                      </Button>
                    )}
                  </div>
                  {/* Fallback: Manual file ID input */}
                  <div className="mt-4 p-4 border rounded-lg">
                    <Label htmlFor="googleDriveFileId">Or enter Google Drive File ID manually</Label>
                    <Input
                      id="googleDriveFileId"
                      placeholder="Enter Google Drive file ID (from share link)"
                      value={googleDriveFileId}
                      onChange={(e) => setGoogleDriveFileId(e.target.value)}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Get the file ID from the Google Drive share link
                    </p>
                  </div>
                </div>
              ) : (
                <>
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
                      {driveFiles.slice(0, driveFilesLimit).map((file) => (
                        <TableRow
                          key={file.id}
                          className={selectedDriveFile?.id === file.id ? "bg-muted" : ""}
                          onClick={() => setSelectedDriveFile(file)}
                          style={{ cursor: "pointer" }}
                        >
                          <TableCell className="font-medium">{file.name}</TableCell>
                          <TableCell>{formatFileSize(file.size)}</TableCell>
                          <TableCell>{formatDate(file.modifiedTime)}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedDriveFile(file);
                                setIsRestoreConfirmOpen(true);
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
                  {driveFiles.length > 5 && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (driveFilesLimit >= driveFiles.length) {
                            setDriveFilesLimit(5);
                          } else {
                            setDriveFilesLimit(driveFiles.length);
                          }
                        }}
                      >
                        {driveFilesLimit >= driveFiles.length ? (
                          <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Show Less
                          </>
                        ) : (
                          <>
                            Show More ({driveFiles.length - driveFilesLimit} more)
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  {/* Fallback: Manual file ID input */}
                  <div className="p-4 border rounded-lg">
                    <Label htmlFor="googleDriveFileId">Or enter Google Drive File ID manually</Label>
                    <Input
                      id="googleDriveFileId"
                      placeholder="Enter Google Drive file ID (from share link)"
                      value={googleDriveFileId}
                      onChange={(e) => setGoogleDriveFileId(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </>
              )}
            </TabsContent>

            {configStatus?.supabase.configured && (
              <TabsContent value="supabase-storage" className="space-y-4">
                {storageLoading ? (
                  <div className="text-center py-8">Loading storage backups...</div>
                ) : storageBackups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No backups found in Supabase Storage
                  </div>
                ) : (
                  <>
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
                        {storageBackups.slice(0, storageBackupsLimit).map((backup) => (
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
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedStorageBackup(backup);
                                  setIsRestoreConfirmOpen(true);
                                }}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Restore MSSQL
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {storageBackups.length > 5 && (
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (storageBackupsLimit >= storageBackups.length) {
                              setStorageBackupsLimit(5);
                            } else {
                              setStorageBackupsLimit(storageBackups.length);
                            }
                          }}
                        >
                          {storageBackupsLimit >= storageBackups.length ? (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              Show Less
                            </>
                          ) : (
                            <>
                              Show More ({storageBackups.length - storageBackupsLimit} more)
                              <ChevronRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            )}
          </Tabs>

          {/* Restore History */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
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
            {showRestoreHistory && (
              <div className="mt-4">
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
                            <TableCell className="text-sm text-muted-foreground">
                              {record.errorMessage || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={isRestoreConfirmOpen} onOpenChange={setIsRestoreConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore MSSQL Database</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3 mt-2">
                <p>
                  Are you sure you want to restore <strong>{selectedDriveFile?.name || selectedStorageBackup?.name || 'this backup'}</strong>?
                </p>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                        This will:
                      </p>
                      <ul className="list-disc list-inside text-amber-800 dark:text-amber-200 space-y-1">
                        <li>Download the .bak file to the server's local storage</li>
                        <li>Restore it to MSSQL (previous restored database will be replaced)</li>
                      </ul>
                      <p className="text-amber-800 dark:text-amber-200 mt-2">
                        After restore, you can migrate data to PostgreSQL from the Migration page.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              disabled={restoreFromDriveMutation.isPending}
            >
              {restoreFromDriveMutation.isPending ? "Starting..." : "Restore MSSQL"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setIsOAuthModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

