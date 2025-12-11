import { useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkflowMutations } from "@/hooks/useWorkflowMutations";
import { WorkflowWithDetails } from "@/types/workflow";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  period: z.string().optional(),
  period_start_date: z.string().optional(),
  period_end_date: z.string().optional(),
  due_date: z.string().optional(),
  assigned_to: z.string().optional(),
});

interface EditJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: WorkflowWithDetails;
  users: Array<{ id: string; full_name: string }>;
}

export const EditJobDialog = ({
  open,
  onOpenChange,
  workflow,
  users,
}: EditJobDialogProps) => {
  const { updateWorkflow } = useWorkflowMutations();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: workflow.name,
      period: workflow.period || "",
      period_start_date: workflow.period_start_date || "",
      period_end_date: workflow.period_end_date || "",
      due_date: workflow.due_date || "",
      assigned_to: workflow.assigned_to || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: workflow.name,
        period: workflow.period || "",
        period_start_date: workflow.period_start_date || "",
        period_end_date: workflow.period_end_date || "",
        due_date: workflow.due_date || "",
        assigned_to: workflow.assigned_to || "",
      });
    }
  }, [open, workflow, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    updateWorkflow.mutate(
      {
        id: workflow.id,
        ...values,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Job</DialogTitle>
          <DialogDescription>
            Update job details including dates and assignment.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter job name" {...field} />
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
                    <Input placeholder="e.g., 2024-12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="period_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="period_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                  <Select onValueChange={field.onChange} value={field.value}>
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

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateWorkflow.isPending}>
                {updateWorkflow.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Job
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
