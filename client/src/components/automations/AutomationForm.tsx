import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { automationsApi, Automation, CreateAutomationPayload } from "@/api/automations";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const automationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  triggerType: z.string().min(1, "Trigger type is required"),
  isActive: z.boolean().default(true),
});

type AutomationFormValues = z.infer<typeof automationSchema>;

interface AutomationFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Automation;
  workspaceId?: number;
}

const TRIGGER_TYPES = [
  { value: "job.stage_entered", label: "Job - Stage Entered" },
  { value: "job.stage_exited", label: "Job - Stage Exited" },
  { value: "task.created", label: "Task - Created" },
  { value: "task.completed", label: "Task - Completed" },
  { value: "task.overdue", label: "Task - Overdue" },
  { value: "client.created", label: "Client - Created" },
  { value: "client.onboarding_started", label: "Client - Onboarding Started" },
  { value: "document.uploaded", label: "Document - Uploaded" },
  { value: "invoice.sent", label: "Invoice - Sent" },
  { value: "invoice.overdue", label: "Invoice - Overdue" },
];

const ACTION_TYPES = [
  { value: "send_email", label: "Send Email" },
  { value: "assign_task", label: "Assign Task" },
  { value: "update_stage", label: "Update Stage" },
  { value: "send_reminder", label: "Send Reminder" },
  { value: "create_folder", label: "Create Folder" },
  { value: "generate_document", label: "Generate Document" },
];

export const AutomationForm: React.FC<AutomationFormProps> = ({
  isOpen,
  onClose,
  initialData,
  workspaceId,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actions, setActions] = useState<Array<{ type: string; [key: string]: any }>>(
    initialData?.actions || []
  );
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>(
    initialData?.triggerConfig || {}
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AutomationFormValues>({
    resolver: zodResolver(automationSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      triggerType: initialData?.triggerType || "",
      isActive: initialData?.isActive ?? true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateAutomationPayload) =>
      automationsApi.createAutomation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({
        title: "Automation created",
        description: "The automation has been created successfully.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create automation",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Automation> }) =>
      automationsApi.updateAutomation(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      toast({
        title: "Automation updated",
        description: "The automation has been updated successfully.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update automation",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AutomationFormValues) => {
    const payload: CreateAutomationPayload = {
      workspaceId,
      name: data.name,
      description: data.description,
      triggerType: data.triggerType,
      triggerConfig,
      actions,
      isActive: data.isActive,
    };

    if (initialData) {
      updateMutation.mutate({ id: initialData.id, updates: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const addAction = () => {
    setActions([...actions, { type: "send_email" }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, updates: Partial<{ type: string; [key: string]: any }>) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], ...updates };
    setActions(updated);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Automation" : "Create Automation"}
          </DialogTitle>
          <DialogDescription>
            Configure automated workflows that trigger actions based on events
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} rows={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="triggerType">Trigger Type</Label>
              <Select
                value={watch("triggerType")}
                onValueChange={(value: string) => setValue("triggerType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger type" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.triggerType && (
                <p className="text-sm text-red-500">{errors.triggerType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Actions</Label>
              <div className="space-y-2">
                {actions.map((action, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 border rounded">
                    <Select
                      value={action.type}
                      onValueChange={(value: string) => updateAction(index, { type: value })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((actionType) => (
                          <SelectItem key={actionType.value} value={actionType.value}>
                            {actionType.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Action config (JSON)"
                      value={JSON.stringify(action)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          updateAction(index, parsed);
                        } catch {
                          // Invalid JSON, ignore
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAction(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addAction}>
                  Add Action
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : initialData
                ? "Update"
                : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

