import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Task, CreateTaskPayload } from "@/api/tasks-bitrix";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const taskFormSchema = z.object({
  clientId: z.number().int().positive(),
  templateId: z.number().int().positive().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["open", "in_progress", "review", "done", "cancelled"]).default("open"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  tags: z.array(z.string()).default([]),
  assignedTo: z.number().int().positive().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  dueAt: z.string().optional(),
  reminderAt: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskPayload) => Promise<void>;
  task?: Task;
  defaultClientId?: number;
  availableUsers?: Array<{ id: number; name: string }>;
}

export function TaskForm({
  isOpen,
  onClose,
  onSubmit,
  task,
  defaultClientId,
  availableUsers = [],
}: TaskFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      clientId: task?.clientId || defaultClientId || 0,
      templateId: task?.templateId,
      title: task?.title || "",
      description: task?.description || "",
      status: task?.status || "open",
      priority: task?.priority || "medium",
      tags: task?.tags || [],
      assignedTo: task?.assignedTo,
      estimatedMinutes: task?.estimatedMinutes,
      dueAt: task?.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : undefined,
      reminderAt: task?.reminderAt ? new Date(task.reminderAt).toISOString().slice(0, 16) : undefined,
    },
  });

  // Fetch templates for the selected client
  const clientId = watch("clientId");
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/task-templates", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const response = await apiRequest("GET", `/api/task-templates?clientIds=${clientId}`);
      return response.json();
    },
    enabled: !!clientId && isOpen,
  });

  useEffect(() => {
    if (task) {
      reset({
        clientId: task.clientId,
        templateId: task.templateId,
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        tags: task.tags || [],
        assignedTo: task.assignedTo,
        estimatedMinutes: task.estimatedMinutes,
        dueAt: task.dueAt ? new Date(task.dueAt).toISOString().slice(0, 16) : undefined,
        reminderAt: task.reminderAt ? new Date(task.reminderAt).toISOString().slice(0, 16) : undefined,
      });
    } else {
      reset({
        clientId: defaultClientId || 0,
        templateId: undefined,
        title: "",
        description: "",
        status: "open",
        priority: "medium",
        tags: [],
        assignedTo: undefined,
        estimatedMinutes: undefined,
        dueAt: undefined,
        reminderAt: undefined,
      });
    }
  }, [task, defaultClientId, reset, isOpen]);

  const onFormSubmit = async (data: TaskFormValues) => {
    const payload: CreateTaskPayload = {
      clientId: data.clientId,
      templateId: data.templateId,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      tags: data.tags,
      assignedTo: data.assignedTo,
      estimatedMinutes: data.estimatedMinutes,
      dueAt: data.dueAt,
      reminderAt: data.reminderAt,
    };
    await onSubmit(payload);
    reset();
  };

  const tagsValue = watch("tags");
  const tagsInput = tagsValue?.join(", ") || "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create Task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update task details" : "Create a new task"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Enter task title"
            />
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Enter task description"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(value) => setValue("status", value as TaskFormValues["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={watch("priority")}
                onValueChange={(value) => setValue("priority", value as TaskFormValues["priority"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {availableUsers.length > 0 && (
            <div>
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Select
                value={watch("assignedTo")?.toString() || "none"}
                onValueChange={(value) =>
                  setValue("assignedTo", value === "none" ? undefined : parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueAt">Due Date</Label>
              <Input
                id="dueAt"
                type="datetime-local"
                {...register("dueAt")}
              />
            </div>

            <div>
              <Label htmlFor="estimatedMinutes">Estimated Minutes</Label>
              <Input
                id="estimatedMinutes"
                type="number"
                {...register("estimatedMinutes", { valueAsNumber: true })}
                placeholder="e.g., 60"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => {
                const tags = e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter((t) => t.length > 0);
                setValue("tags", tags);
              }}
              placeholder="e.g., urgent, billing, review"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : task ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

