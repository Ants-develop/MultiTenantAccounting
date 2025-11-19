import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FolderOpen, AlertCircle } from "lucide-react";
import { DocumentsTable } from "@/components/documents/DocumentsTable";
import { toast } from "sonner";

const Documents = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, expiring: 0, expired: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("document_categories")
        .select("*")
        .order("name");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch documents
      const { data: documentsData, error: documentsError } = await supabase
        .from("documents")
        .select(`
          *,
          category:document_categories(name, color),
          uploaded_by_user:profiles!documents_uploaded_by_fkey(full_name)
        `)
        .order("uploaded_at", { ascending: false });

      if (documentsError) throw documentsError;
      setDocuments(documentsData || []);

      // Calculate stats
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const total = documentsData?.length || 0;
      const expired = documentsData?.filter((d) => d.status === "expired").length || 0;
      const expiring = documentsData?.filter(
        (d) =>
          d.expires_at &&
          d.status === "active" &&
          new Date(d.expires_at) < sevenDaysFromNow &&
          new Date(d.expires_at) > now
      ).length || 0;

      setStats({ total, expiring, expired });
    } catch (error: any) {
      toast(error.message || "Failed to load documents", {
        description: "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Manage client documents and files securely
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.expiring}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Within next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.expired}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentsTable
            documents={documents}
            categories={categories}
            isLoading={isLoading}
            onRefresh={fetchData}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Documents;
