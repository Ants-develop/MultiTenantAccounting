import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import { notificationService } from "@/services/notificationService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const documentSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  category_id: z.string().uuid("Please select a category"),
  expires_at: z.string().optional(),
  file: z.any().refine((file) => file?.length > 0, "File is required"),
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  categories: any[];
  onSuccess: () => void;
}

export const UploadDocumentDialog = ({
  open,
  onOpenChange,
  clientId,
  categories,
  onSuccess,
}: UploadDocumentDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      name: "",
      description: "",
      category_id: "",
      expires_at: "",
    },
  });

  const onSubmit = async (data: DocumentFormData) => {
    setIsLoading(true);
    try {
      const file = data.file[0];

      if (file.size > MAX_FILE_SIZE) {
        toast("File size must be less than 50MB", {
          description: "Please choose a smaller file",
        });
        return;
      }

      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${clientId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("client-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create document record
      const documentData: any = {
        client_id: clientId,
        name: data.name,
        description: data.description || null,
        category_id: data.category_id,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user?.id,
        expires_at: data.expires_at || null,
      };

      const { data: newDocument, error: dbError } = await supabase
        .from("documents")
        .insert(documentData)
        .select()
        .single();

      if (dbError) throw dbError;

      // Log the upload
      await supabase.from("document_access_log").insert({
        document_id: newDocument.id,
        user_id: user?.id,
        action: "upload",
      });

      // Notify relevant users about the new document
      try {
        const { data: client } = await supabase
          .from("clients")
          .select("name, assigned_owner_id, assigned_accountant_id, assigned_reviewer_id")
          .eq("id", clientId)
          .single();

        const { data: uploaderProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        const uploaderName = uploaderProfile?.full_name || "A team member";

        const usersToNotify: string[] = [];

        if (client?.assigned_owner_id) usersToNotify.push(client.assigned_owner_id);
        if (client?.assigned_accountant_id) usersToNotify.push(client.assigned_accountant_id);
        if (client?.assigned_reviewer_id) usersToNotify.push(client.assigned_reviewer_id);

        const { data: clientUsers } = await supabase
          .from("profiles")
          .select("id")
          .eq("client_id", clientId);

        if (clientUsers) {
          usersToNotify.push(...clientUsers.map(u => u.id));
        }

        const uniqueUsers = [...new Set(usersToNotify)].filter(id => id !== user?.id);

        if (uniqueUsers.length > 0) {
          await notificationService.notifyMultipleUsers(
            uniqueUsers,
            "document_uploaded",
            "New Document Uploaded",
            `${uploaderName} uploaded "${data.name}" for ${client?.name || "your account"}`,
            `/documents?clientId=${clientId}`
          );
        }
      } catch (notifError) {
        console.error("Failed to send document upload notification:", notifError);
      }

      toast("Document uploaded successfully");

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast(error.message || "Failed to upload document", {
        description: "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a new document for this client (Max 50MB)
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>File *</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        onChange={(e) => onChange(e.target.files)}
                        {...field}
                        className="cursor-pointer"
                      />
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 2023 Tax Return" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this document..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiration Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
