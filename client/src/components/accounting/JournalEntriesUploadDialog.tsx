import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import { Upload, FileSpreadsheet } from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const uploadSchema = z.object({
    file: z.any().refine((file) => file?.length > 0, "File is required"),
});

type UploadFormData = z.infer<typeof uploadSchema>;

interface JournalEntriesUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function JournalEntriesUploadDialog({
    open,
    onOpenChange,
    onSuccess,
}: JournalEntriesUploadDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<UploadFormData>({
        resolver: zodResolver(uploadSchema),
    });

    const onSubmit = async (data: UploadFormData) => {
        setIsLoading(true);
        try {
            const file = data.file[0];

            if (file.size > MAX_FILE_SIZE) {
                toast.error("File size must be less than 10MB");
                return;
            }

            // Simulate upload delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            console.log("File selected for upload:", file.name);

            toast.success("File uploaded successfully", {
                description: "Your journal entries are being processed in the background.",
            });

            form.reset();
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast.error("Failed to upload file", {
                description: error.message || "Please try again",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Journal Entries</DialogTitle>
                    <DialogDescription>
                        Upload a CSV or Excel file to import journal entries.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center bg-muted/20">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <FileSpreadsheet className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="font-medium mb-1">Drag and drop your file</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                or click to browse (CSV, XLSX)
                            </p>

                            <FormField
                                control={form.control}
                                name="file"
                                render={({ field: { onChange, value, ...field } }) => (
                                    <FormItem className="w-full">
                                        <FormControl>
                                            <Input
                                                type="file"
                                                accept=".csv,.xlsx,.xls"
                                                onChange={(e) => onChange(e.target.files)}
                                                {...field}
                                                className="cursor-pointer"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Upload className="mr-2 h-4 w-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Import Entries
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
