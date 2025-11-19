import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Search, Download, Eye, Trash2, FileText } from "lucide-react";

interface Document {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  version: number;
  status: string;
  expires_at: string | null;
  uploaded_at: string;
  category: { name: string; color: string } | null;
  uploaded_by_user: { full_name: string } | null;
}

interface DocumentsTableProps {
  documents: Document[];
  categories: any[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const DocumentsTable = ({
  documents,
  categories,
  isLoading,
  onRefresh,
}: DocumentsTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { user } = useAuth();

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || doc.category?.name === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
  };

  const getStatusColor = (status: string, expiresAt: string | null) => {
    if (status === "expired") return "bg-red-500/10 text-red-500 border-red-500/20";
    if (expiresAt && new Date(expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    }
    if (status === "active") return "bg-green-500/10 text-green-500 border-green-500/20";
    return "bg-gray-500/10 text-gray-500 border-gray-500/20";
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("client-documents")
        .download(doc.file_path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Log the download
      await supabase.from("document_access_log").insert({
        document_id: doc.id,
        user_id: user?.id,
        action: "download",
      });

      toast("Document downloaded successfully");
    } catch (error: any) {
      toast(error.message || "Failed to download document", {
        description: "Please try again",
      });
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("client-documents")
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      toast("Document deleted successfully");

      onRefresh();
    } catch (error: any) {
      toast(error.message || "Failed to delete document", {
        description: "Please try again",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.name}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {searchTerm || categoryFilter !== "all"
                    ? "No documents found matching your filters"
                    : "No documents uploaded yet"}
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{doc.name}</div>
                        {doc.description && (
                          <div className="text-sm text-muted-foreground">{doc.description}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {doc.category && (
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: `${doc.category.color}10`,
                          borderColor: `${doc.category.color}30`,
                          color: doc.category.color,
                        }}
                      >
                        {doc.category.name}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatFileSize(doc.file_size)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{doc.uploaded_by_user?.full_name || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(doc.status, doc.expires_at)}>
                      {doc.status}
                      {doc.expires_at && doc.status === "active" && (
                        <span className="ml-1">
                          (expires {new Date(doc.expires_at).toLocaleDateString()})
                        </span>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(doc)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(doc)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
