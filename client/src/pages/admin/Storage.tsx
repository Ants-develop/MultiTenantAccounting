import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HardDrive,
  Plus,
  Trash2,
  Upload,
  Download,
  Folder,
  File,
  Edit,
  Search,
  RefreshCw,
  MoreVertical,
  Image,
  FileText,
  FileArchive,
  Music,
  Video,
  X,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { storageApi, type Bucket, type StorageFile, type StorageFolder, type FileListResponse } from "@/api/storage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType === "application/pdf" || mimeType.startsWith("text/")) return FileText;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return FileArchive;
  return File;
}

export default function Storage() {
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [isCreateBucketOpen, setIsCreateBucketOpen] = useState(false);
  const [isDeleteBucketOpen, setIsDeleteBucketOpen] = useState(false);
  const [bucketToDelete, setBucketToDelete] = useState<string | null>(null);
  const [newBucketName, setNewBucketName] = useState("");
  const [isPublicBucket, setIsPublicBucket] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<{ path: string; name: string } | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch buckets
  const { data: buckets = [], isLoading: bucketsLoading, refetch: refetchBuckets } = useQuery<Bucket[]>({
    queryKey: ["/api/storage/buckets"],
    queryFn: () => storageApi.listBuckets(),
  });

  // Fetch files in selected bucket
  const { data: fileList, isLoading: filesLoading, refetch: refetchFiles } = useQuery<FileListResponse>({
    queryKey: ["/api/storage/buckets", selectedBucket, "files", currentPath],
    queryFn: () => storageApi.listFiles(selectedBucket!, currentPath),
    enabled: !!selectedBucket,
  });

  // Create bucket mutation
  const createBucketMutation = useMutation({
    mutationFn: (data: { name: string; public: boolean }) => storageApi.createBucket(data.name, data.public),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storage/buckets"] });
      setIsCreateBucketOpen(false);
      setNewBucketName("");
      setIsPublicBucket(false);
      toast({
        title: "Success",
        description: "Bucket created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bucket",
        variant: "destructive",
      });
    },
  });

  // Delete bucket mutation
  const deleteBucketMutation = useMutation({
    mutationFn: (name: string) => storageApi.deleteBucket(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storage/buckets"] });
      setIsDeleteBucketOpen(false);
      setBucketToDelete(null);
      if (selectedBucket === bucketToDelete) {
        setSelectedBucket(null);
        setCurrentPath("");
      }
      toast({
        title: "Success",
        description: "Bucket deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bucket",
        variant: "destructive",
      });
    },
  });

  // Upload files mutation
  const uploadFilesMutation = useMutation({
    mutationFn: (files: File[]) => storageApi.uploadFile(selectedBucket!, files, currentPath),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/storage/buckets", selectedBucket, "files"] });
      setIsUploadDialogOpen(false);
      setUploadFiles([]);
      toast({
        title: "Success",
        description: `${result.success} file(s) uploaded successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      });
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: (filePath: string) => storageApi.deleteFile(selectedBucket!, filePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storage/buckets", selectedBucket, "files"] });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: (name: string) => storageApi.createFolder(selectedBucket!, currentPath, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storage/buckets", selectedBucket, "files"] });
      setIsCreateFolderOpen(false);
      setNewFolderName("");
      toast({
        title: "Success",
        description: "Folder created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create folder",
        variant: "destructive",
      });
    },
  });

  // Move/rename file mutation
  const renameFileMutation = useMutation({
    mutationFn: ({ oldPath, newPath }: { oldPath: string; newPath: string }) =>
      storageApi.moveFile(selectedBucket!, oldPath, newPath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/storage/buckets", selectedBucket, "files"] });
      setIsRenameDialogOpen(false);
      setFileToRename(null);
      setNewFileName("");
      toast({
        title: "Success",
        description: "File renamed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to rename file",
        variant: "destructive",
      });
    },
  });

  const handleCreateBucket = () => {
    if (!newBucketName.trim()) {
      toast({
        title: "Error",
        description: "Bucket name is required",
        variant: "destructive",
      });
      return;
    }
    createBucketMutation.mutate({ name: newBucketName.trim(), public: isPublicBucket });
  };

  const handleDeleteBucket = () => {
    if (bucketToDelete) {
      deleteBucketMutation.mutate(bucketToDelete);
    }
  };

  const handleUploadFiles = () => {
    if (uploadFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one file",
        variant: "destructive",
      });
      return;
    }
    uploadFilesMutation.mutate(uploadFiles);
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const blob = await storageApi.downloadFile(selectedBucket!, filePath);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFile = (filePath: string) => {
    deleteFileMutation.mutate(filePath);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Folder name is required",
        variant: "destructive",
      });
      return;
    }
    createFolderMutation.mutate(newFolderName.trim());
  };

  const handleRenameFile = () => {
    if (!fileToRename || !newFileName.trim()) {
      toast({
        title: "Error",
        description: "New file name is required",
        variant: "destructive",
      });
      return;
    }
    const newPath = currentPath
      ? `${currentPath}/${newFileName.trim()}`
      : newFileName.trim();
    renameFileMutation.mutate({
      oldPath: fileToRename.path,
      newPath,
    });
  };

  const navigateToFolder = (folder: StorageFolder) => {
    setCurrentPath(folder.path);
  };

  const navigateUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  const navigateToRoot = () => {
    setCurrentPath("");
  };

  const filteredFiles = fileList?.files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredFolders = fileList?.folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardDrive className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Storage Management</h1>
            <p className="text-muted-foreground">
              Manage Supabase Storage buckets, folders, and files
            </p>
          </div>
        </div>
        <Button onClick={() => refetchBuckets()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="buckets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="buckets">Buckets</TabsTrigger>
          <TabsTrigger value="files" disabled={!selectedBucket}>
            Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buckets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Storage Buckets</CardTitle>
                  <CardDescription>
                    Create and manage storage buckets
                  </CardDescription>
                </div>
                <Button onClick={() => setIsCreateBucketOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bucket
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bucketsLoading ? (
                <div className="text-center py-8">Loading buckets...</div>
              ) : buckets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No buckets found. Create your first bucket to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>File Count</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buckets.map((bucket) => (
                      <TableRow
                        key={bucket.id}
                        className={selectedBucket === bucket.name ? "bg-muted" : ""}
                        onClick={() => {
                          setSelectedBucket(bucket.name);
                          setCurrentPath("");
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <TableCell className="font-medium">{bucket.name}</TableCell>
                        <TableCell>
                          <Badge variant={bucket.public ? "default" : "secondary"}>
                            {bucket.public ? "Public" : "Private"}
                          </Badge>
                        </TableCell>
                        <TableCell>{bucket.fileCount || 0}</TableCell>
                        <TableCell>{formatDate(bucket.created_at)}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedBucket(bucket.name);
                                  setCurrentPath("");
                                }}
                              >
                                View Files
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setBucketToDelete(bucket.name);
                                  setIsDeleteBucketOpen(true);
                                }}
                                className="text-destructive"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          {selectedBucket && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Files in {selectedBucket}</CardTitle>
                    <CardDescription>
                      {currentPath || "Root directory"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateFolderOpen(true)}
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      New Folder
                    </Button>
                    <Button onClick={() => setIsUploadDialogOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Files
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={navigateToRoot}
                    disabled={!currentPath}
                  >
                    <HardDrive className="h-4 w-4" />
                  </Button>
                  {currentPath.split("/").filter(Boolean).map((part, index, array) => (
                    <React.Fragment key={index}>
                      <span className="text-muted-foreground">/</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newPath = array.slice(0, index + 1).join("/");
                          setCurrentPath(newPath);
                        }}
                      >
                        {part}
                      </Button>
                    </React.Fragment>
                  ))}
                </div>

                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {filesLoading ? (
                  <div className="text-center py-8">Loading files...</div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-2">
                      {/* Folders */}
                      {filteredFolders.map((folder) => {
                        const FolderIcon = Folder;
                        return (
                          <div
                            key={folder.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                            onClick={() => navigateToFolder(folder)}
                          >
                            <div className="flex items-center gap-3">
                              <FolderIcon className="h-5 w-5 text-blue-500" />
                              <span className="font-medium">{folder.name}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              Folder
                            </span>
                          </div>
                        );
                      })}

                      {/* Files */}
                      {filteredFiles.map((file) => {
                        const FileIcon = getFileIcon(file.mimeType);
                        return (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <FileIcon className="h-5 w-5 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{file.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {formatFileSize(file.size)} • {file.mimeType}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {formatDate(file.updated_at)}
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDownloadFile(
                                        file.fullPath,
                                        file.name
                                      )
                                    }
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setFileToRename({
                                        path: file.fullPath,
                                        name: file.name,
                                      });
                                      setNewFileName(file.name);
                                      setIsRenameDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeleteFile(file.fullPath)
                                    }
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}

                      {filteredFolders.length === 0 && filteredFiles.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          {searchQuery ? "No files match your search" : "No files or folders"}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Bucket Dialog */}
      <Dialog open={isCreateBucketOpen} onOpenChange={setIsCreateBucketOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Bucket</DialogTitle>
            <DialogDescription>
              Create a new storage bucket. Bucket names must be lowercase and contain only letters, numbers, and hyphens.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bucket-name">Bucket Name</Label>
              <Input
                id="bucket-name"
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
                placeholder="my-bucket-name"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="public-bucket"
                checked={isPublicBucket}
                onChange={(e) => setIsPublicBucket(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="public-bucket">Public bucket (files accessible without authentication)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateBucketOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBucket} disabled={createBucketMutation.isPending}>
              {createBucketMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Bucket Dialog */}
      <AlertDialog open={isDeleteBucketOpen} onOpenChange={setIsDeleteBucketOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bucket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the bucket "{bucketToDelete}"? This will delete all files in the bucket and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBucket}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Files Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Select one or more files to upload to {currentPath || "root"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Input
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setUploadFiles(files);
                }}
                className="cursor-pointer"
              />
              {uploadFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadFiles(uploadFiles.filter((_, i) => i !== index));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadFiles} disabled={uploadFilesMutation.isPending || uploadFiles.length === 0}>
              {uploadFilesMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
            <DialogDescription>
              Create a new folder in {currentPath || "root"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="my-folder"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={createFolderMutation.isPending}>
              {createFolderMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename File Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>
              Enter a new name for the file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-name">File Name</Label>
              <Input
                id="file-name"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="new-file-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameFile} disabled={renameFileMutation.isPending}>
              {renameFileMutation.isPending ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

