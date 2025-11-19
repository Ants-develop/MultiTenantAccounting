import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { UploadDocumentDialog } from "@/components/documents/UploadDocumentDialog";
import { useToast } from "@/hooks/use-toast";

interface PortalWorkflowDocumentsProps {
  workflowId: string;
  clientId: string;
}

export const PortalWorkflowDocuments = ({
  workflowId,
  clientId,
}: PortalWorkflowDocumentsProps) => {
  const { toast } = useToast();
  const [showUpload, setShowUpload] = useState(false);

  // Fetch document categories
  const { data: categories } = useQuery({
    queryKey: ["document-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_categories")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch documents for this workflow
  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ["workflow-documents", workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          document_categories(name, color),
          profiles:uploaded_by(full_name)
        `)
        .eq("client_id", clientId)
        .order("uploaded_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("client-documents")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: `Downloading ${fileName}`,
      });
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Download failed",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Documents</h3>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : documents && documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          Uploaded {format(new Date(doc.uploaded_at), "MMM d, yyyy")}
                        </span>
                        {doc.profiles && (
                          <>
                            <span>•</span>
                            <span>by {doc.profiles.full_name}</span>
                          </>
                        )}
                        {doc.document_categories && (
                          <>
                            <span>•</span>
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: doc.document_categories.color || undefined,
                              }}
                            >
                              {doc.document_categories.name}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc.file_path, doc.name)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No documents uploaded yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload documents related to this job
            </p>
          </CardContent>
        </Card>
      )}

      <UploadDocumentDialog
        open={showUpload}
        onOpenChange={setShowUpload}
        clientId={clientId}
        categories={categories || []}
        onSuccess={() => {
          refetch();
          toast({
            title: "Document uploaded",
            description: "Your document has been uploaded successfully",
          });
        }}
      />
    </div>
  );
};
