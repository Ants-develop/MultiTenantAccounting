import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, FolderOpen, AlertCircle } from "lucide-react";
import { DocumentsTable } from "@/components/documents/DocumentsTable";
import { UploadDocumentDialog } from "@/components/documents/UploadDocumentDialog";
import { toast } from "sonner";

export const PortalDocuments = () => {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, expiring: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  useEffect(() => {
    if (profile?.client_id) {
      fetchData();
    } else if (profile && !profile.client_id) {
      setIsLoading(false);
    }
  }, [profile?.client_id]);

  const fetchData = async () => {
    if (!profile?.client_id) return;

    setIsLoading(true);
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("document_categories")
        .select("*")
        .order("name");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      const { data: documentsData, error: documentsError } = await supabase
        .from("documents")
        .select(`
          *,
          category:document_categories(name, color),
          uploaded_by_user:profiles!documents_uploaded_by_fkey(full_name)
        `)
        .eq("client_id", profile.client_id)
        .order("uploaded_at", { ascending: false });

      if (documentsError) throw documentsError;
      setDocuments(documentsData || []);

      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const total = documentsData?.length || 0;
      const expiring = documentsData?.filter(
        (d) =>
          d.expires_at &&
          d.status === "active" &&
          new Date(d.expires_at) < sevenDaysFromNow &&
          new Date(d.expires_at) > now
      ).length || 0;

      setStats({ total, expiring });
    } catch (error: any) {
      toast.error("Failed to load documents", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile?.client_id) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Account Not Configured</h3>
          <p className="text-muted-foreground">
            Your account is not associated with a client organization. 
            Please contact support for assistance.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">Upload and manage your documents</p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.expiring}</div>
            <p className="text-xs text-muted-foreground mt-1">Within next 7 days</p>
          </CardContent>
        </Card>
      </div>

      {documents.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No documents yet</h3>
            <p className="text-muted-foreground">Upload documents to share with your team</p>
            <Button className="mt-4" onClick={() => setShowUploadDialog(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload First Document
            </Button>
          </div>
        </Card>
      ) : (
        <DocumentsTable 
          documents={documents} 
          categories={categories}
          isLoading={isLoading}
          onRefresh={fetchData} 
        />
      )}

      <UploadDocumentDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        categories={categories}
        clientId={profile?.client_id}
        onSuccess={fetchData}
      />
    </div>
  );
};
