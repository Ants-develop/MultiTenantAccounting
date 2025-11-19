import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWorkflowMutations } from "@/hooks/useWorkflowMutations";
import { useWorkflowTemplates } from "@/hooks/useWorkflowTemplates";
import { generatePeriodString, getCurrentPeriod } from "@/utils/periodUtils";
import { PeriodFrequency } from "@/utils/periodUtils";

const formSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  template_id: z.string().min(1, "Please select a template"),
  client_id: z.string().min(1, "Please select a client"),
  period: z.string().optional(),
  period_start_date: z.string().optional(),
  period_end_date: z.string().optional(),
  service_type: z.string().optional(),
  due_date: z.string().optional(),
  assigned_to: z.string().optional(),
});

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Array<{ id: string; name: string }>;
  users: Array<{ id: string; full_name: string }>;
  defaultClientId?: string;
  defaultTemplateId?: string;
}

export const CreateJobDialog = ({
  open,
  onOpenChange,
  clients,
  users,
  defaultClientId,
  defaultTemplateId,
}: CreateJobDialogProps) => {
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>("");
  const { data: allTemplates } = useWorkflowTemplates({ is_active: true });
  const { createWorkflow } = useWorkflowMutations();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      template_id: defaultTemplateId || "",
      client_id: defaultClientId || "",
      period: getCurrentPeriod("monthly"),
      service_type: "",
      due_date: "",
      assigned_to: "",
    },
  });

  // Filter templates based on selected client
  const selectedClientId = form.watch("client_id");
  const templates = allTemplates?.filter(template => {
    if (!selectedClientId) return true; // Show all if no client selected
    
    // If template has no client assignments, it's available to all
    if (!template.workflow_template_clients || template.workflow_template_clients.length === 0) {
      return true;
    }
    
    // Check if this client is assigned to the template
    return template.workflow_template_clients.some(
      tc => tc.client_id === selectedClientId
    );
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createWorkflow.mutate(values as any, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplateType(template.type);
      form.setValue("service_type", template.type);
      
      // Auto-generate job name
      const client = clients.find((c) => c.id === form.getValues("client_id"));
      if (client) {
        const period = form.getValues("period") || getCurrentPeriod("monthly");
        form.setValue("name", `${client.name} - ${template.name} - ${period}`);
      }
    }
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    const template = templates?.find((t) => t.id === form.getValues("template_id"));
    if (client && template) {
      const period = form.getValues("period") || getCurrentPeriod("monthly");
      form.setValue("name", `${client.name} - ${template.name} - ${period}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
          <DialogDescription>
            Create a new workflow job from a template
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="template_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workflow Template</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleTemplateChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templates?.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.type.replace(/_/g, " ")})
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
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleClientChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Acme Corp - Monthly Bookkeeping - Jan 2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 2025-01, Q1-2025, FY-2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createWorkflow.isPending}>
                {createWorkflow.isPending ? "Creating..." : "Create Job"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
