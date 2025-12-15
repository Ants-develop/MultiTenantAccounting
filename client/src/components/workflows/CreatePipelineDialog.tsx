import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useWorkflowTemplateMutations } from "@/hooks/useWorkflowTemplateMutations";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["monthly_bookkeeping", "vat_return", "payroll", "annual_financials", "custom"]),
  estimated_duration_days: z.coerce.number().min(1).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreatePipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (templateId: string) => void;
}

export const CreatePipelineDialog = ({ open, onOpenChange, onSuccess }: CreatePipelineDialogProps) => {
  const { toast } = useToast();
  const { createTemplate } = useWorkflowTemplateMutations();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "custom",
      estimated_duration_days: undefined,
    },
  });

  const onSubmit = (values: FormValues) => {
    createTemplate.mutate({
      name: values.name,
      description: values.description || "",
      type: values.type,
      estimated_duration_days: values.estimated_duration_days,
    }, {
      onSuccess: (data: any) => {
        toast({
          title: "Pipeline created",
          description: "You can now add stages to this pipeline.",
        });
        form.reset();
        onOpenChange(false);
        if (onSuccess && data) {
          onSuccess(data.id);
        }
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to create pipeline template.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Pipeline Template</DialogTitle>
          <DialogDescription>
            Create a new workflow pipeline that can be reused for multiple clients and periods.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly Bookkeeping Process" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the purpose and workflow of this pipeline..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="monthly_bookkeeping">Monthly Bookkeeping</SelectItem>
                      <SelectItem value="vat_return">VAT Return</SelectItem>
                      <SelectItem value="payroll">Payroll</SelectItem>
                      <SelectItem value="annual_financials">Annual Financials</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="estimated_duration_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Duration (Days)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="e.g., 30"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTemplate.isPending}>
                {createTemplate.isPending ? "Creating..." : "Create Pipeline"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
