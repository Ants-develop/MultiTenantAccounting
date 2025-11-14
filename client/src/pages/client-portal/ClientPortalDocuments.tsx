import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Upload, Download, Calendar, AlertCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import dayjs from "dayjs";

export const ClientPortalDocuments: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const clientId = parseInt(sessionStorage.getItem("clientId") || "0");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/client-portal/documents", clientId],
    queryFn: async () => {
      return apiRequest(`/api/client-portal/documents?clientId=${clientId}`, {
        method: "GET",
      });
    },
    enabled: clientId > 0,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Use fetch directly for file uploads (apiRequest might not handle FormData correctly)
      const response = await fetch("/api/client-portal/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/dashboard"] });
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded successfully.",
      });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setSelectedDocument(null);
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!selectedFile || !selectedDocument) {
      toast({
        title: "Validation error",
        description: "Please select a file",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("documentId", selectedDocument.id.toString());
    formData.append("clientId", clientId.toString());

    uploadMutation.mutate(formData);
  };

  const requiredDocuments = documents.filter((d: any) => !d.fileData || d.fileData.length === 0);
  const uploadedDocuments = documents.filter((d: any) => d.fileData && d.fileData.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/client-portal/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
              <p className="text-sm text-gray-500">Manage your documents</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Required Documents */}
        {requiredDocuments.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                Required Documents
              </CardTitle>
              <CardDescription>
                Please upload these documents to complete your onboarding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {requiredDocuments.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-yellow-200 bg-yellow-50"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="w-8 h-8 text-yellow-600" />
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-sm text-gray-500">
                          {doc.category} • Due: {doc.expirationDate ? dayjs(doc.expirationDate).format("MMM D, YYYY") : "No due date"}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedDocument(doc);
                        setUploadDialogOpen(true);
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Uploaded Documents */}
        <Card>
          <CardHeader>
            <CardTitle>All Documents</CardTitle>
            <CardDescription>View and download your uploaded documents</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No documents yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                      <div>
                        <p className="font-medium">{doc.documentName}</p>
                        <p className="text-sm text-gray-500">
                          {doc.category} • Uploaded: {doc.updatedAt ? dayjs(doc.updatedAt).format("MMM D, YYYY") : "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.fileData && doc.fileData.length > 0 ? (
                        <>
                          <Badge variant="default">Uploaded</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Download document
                              window.open(`/api/client-portal/documents/${doc.id}/download`, "_blank");
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(doc);
                            setUploadDialogOpen(true);
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload {selectedDocument?.documentName || "document"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                  }
                }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
              {selectedFile && (
                <p className="text-sm text-gray-500">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            {selectedDocument?.description && (
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">{selectedDocument.description}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploadMutation.isPending}>
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

