import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileBarChart, FileText, Calendar } from "lucide-react";
import { DocumentsTable } from "@/components/documents/DocumentsTable";
import { toast } from "sonner";

export const PortalTaxReport = () => {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isLoading, setIsLoading] = useState(true);

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  useEffect(() => {
    if (profile?.client_id) {
      fetchTaxDocuments();
    } else if (profile && !profile.client_id) {
      setIsLoading(false);
    }
  }, [profile?.client_id, selectedYear]);

  const fetchTaxDocuments = async () => {
    if (!profile?.client_id) return;

    setIsLoading(true);
    try {
      const { data: categoriesData } = await supabase
        .from("document_categories")
        .select("id")
        .eq("name", "Tax Documents")
        .single();

      const { data: documentsData, error } = await supabase
        .from("documents")
        .select(`
          *,
          category:document_categories(name, color),
          uploaded_by_user:profiles!documents_uploaded_by_fkey(full_name)
        `)
        .eq("client_id", profile.client_id)
        .eq("category_id", categoriesData?.id || "")
        .order("uploaded_at", { ascending: false });

      if (error) throw error;

      const filteredDocs = (documentsData || []).filter((doc) => {
        const docYear = new Date(doc.uploaded_at).getFullYear().toString();
        return docYear === selectedYear;
      });

      setDocuments(filteredDocs);
    } catch (error: any) {
      toast.error("Failed to load tax documents", { description: error.message });
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
          <FileBarChart className="mx-auto h-12 w-12 text-destructive" />
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
          <h1 className="text-3xl font-bold">Tax Report</h1>
          <p className="text-muted-foreground">View your tax documents and reports</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tax Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">For {selectedYear}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tax Year</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedYear}</div>
            <p className="text-xs text-muted-foreground mt-1">Selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <FileBarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Up to date</div>
            <p className="text-xs text-muted-foreground mt-1">All documents filed</p>
          </CardContent>
        </Card>
      </div>

      {documents.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileBarChart className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No tax documents for {selectedYear}</h3>
            <p className="text-muted-foreground">
              Tax documents will appear here when they are uploaded
            </p>
          </div>
        </Card>
      ) : (
        <DocumentsTable 
          documents={documents}
          categories={[]}
          isLoading={isLoading}
          onRefresh={fetchTaxDocuments}
        />
      )}
    </div>
  );
};
