import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { clientManagementApi, ClientDocument } from "@/api/client-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentUpload } from "@/components/clients/DocumentUpload";
import { Plus, Download, Trash2, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import dayjs from "dayjs";

interface ClientDocumentsProps {
  clientId: number;
}

export const ClientDocuments: React.FC<ClientDocumentsProps> = ({ clientId }) => {
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/clients", clientId, "documents", categoryFilter],
    queryFn: () =>
      clientManagementApi.fetchClientDocuments(
        clientId,
        categoryFilter === "all" ? undefined : categoryFilter
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: number) => clientManagementApi.deleteClientDocument(clientId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "documents"] });
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const downloadDocument = async (doc: ClientDocument) => {
    try {
      const blob = await clientManagementApi.downloadClientDocument(clientId, doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const isExpiringSoon = (expirationDate?: string) => {
    if (!expirationDate) return false;
    const daysUntilExpiry = dayjs(expirationDate).diff(dayjs(), "day");
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  };

  const isExpired = (expirationDate?: string) => {
    if (!expirationDate) return false;
    return dayjs(expirationDate).isBefore(dayjs(), "day");
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Tax":
        return "bg-red-100 text-red-800";
      case "Payroll":
        return "bg-blue-100 text-blue-800";
      case "Accounting":
        return "bg-green-100 text-green-800";
      case "Legal":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Documents</h1>
          <p className="text-sm text-gray-500 mt-1">Manage documents for this client</p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Documents</CardTitle>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Tax">Tax</SelectItem>
                <SelectItem value="Payroll">Payroll</SelectItem>
                <SelectItem value="Accounting">Accounting</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No documents found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Expiration Date</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(doc.category)}>
                        {doc.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                    </TableCell>
                    <TableCell>
                      {doc.expirationDate ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              isExpired(doc.expirationDate)
                                ? "text-red-600"
                                : isExpiringSoon(doc.expirationDate)
                                ? "text-yellow-600"
                                : ""
                            }
                          >
                            {dayjs(doc.expirationDate).format("MMM D, YYYY")}
                          </span>
                          {(isExpired(doc.expirationDate) ||
                            isExpiringSoon(doc.expirationDate)) && (
                            <AlertCircle className="w-4 h-4" />
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {doc.uploader
                        ? `${doc.uploader.firstName} ${doc.uploader.lastName}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadDocument(doc)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (
                              confirm(
                                `Are you sure you want to delete "${doc.name}"?`
                              )
                            ) {
                              deleteMutation.mutate(doc.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
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

      <DocumentUpload
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "documents"] });
        }}
        clientId={clientId}
      />
    </div>
  );
};

