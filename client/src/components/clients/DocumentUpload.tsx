import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const documentUploadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["Tax", "Payroll", "Accounting", "Legal", "Other"]),
  expirationDate: z.string().optional(),
  file: z.instanceof(File).refine(
    (file) => file.size <= 50 * 1024 * 1024,
    "File size must be less than 50MB"
  ),
});

type DocumentUploadFormValues = z.infer<typeof documentUploadSchema>;

interface DocumentUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: number;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientId,
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<DocumentUploadFormValues>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      category: "Other",
    },
  });

  const categoryValue = watch("category");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValue("file", file);
      if (!watch("name")) {
        setValue("name", file.name);
      }
    }
  };

  const onSubmit = async (data: DocumentUploadFormValues) => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const { uploadClientDocument } = await import("@/api/client-management");
      await uploadClientDocument(
        clientId,
        selectedFile,
        data.name,
        data.category,
        data.expirationDate
      );

      toast({
        title: "Document uploaded",
        description: "The document has been uploaded successfully.",
      });

      reset();
      setSelectedFile(null);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document for this client. Maximum file size is 50MB.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                className="flex-1"
              />
              {selectedFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedFile(null);
                    setValue("file", null as any);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            {errors.file && (
              <p className="text-sm text-red-500">{errors.file.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Document Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Enter document name"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={categoryValue}
              onValueChange={(value) => setValue("category", value as any)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tax">Tax</SelectItem>
                <SelectItem value="Payroll">Payroll</SelectItem>
                <SelectItem value="Accounting">Accounting</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
            <Input
              id="expirationDate"
              type="date"
              {...register("expirationDate")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || !selectedFile}>
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

