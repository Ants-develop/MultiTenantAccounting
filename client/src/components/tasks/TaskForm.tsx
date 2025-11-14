import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Task, CreateTaskPayload } from "@/api/tasks";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done", "cancelled", "blocked"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigneeId: z.number().int().positive().optional(),
  dueDate: z.string().optional(),
  createMatrixRoom: z.boolean().optional().default(false),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskPayload) => Promise<void>;
  initialData?: Partial<Task>;
  workspaceId: number;
  jobId?: number;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  workspaceId,
  jobId,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      status: initialData?.status || "todo",
      priority: initialData?.priority || "medium",
      assigneeId: initialData?.assigneeId,
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split("T")[0] : "",
      createMatrixRoom: false,
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        title: initialData?.title || "",
        description: initialData?.description || "",
        status: initialData?.status || "todo",
        priority: initialData?.priority || "medium",
        assigneeId: initialData?.assigneeId,
        dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split("T")[0] : "",
        createMatrixRoom: false,
      });
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = async (data: TaskFormValues) => {
    try {
      await onSubmit({
        workspaceId,
        jobId,
        ...data,
        dueDate: data.dueDate || undefined,
      });
      reset();
      onClose();
    } catch (error) {
      console.error("Failed to submit task:", error);
    }
  };

  const statusValue = watch("status");
  const priorityValue = watch("priority");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Task" : "Create Task"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Update task details" : "Create a new task"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Task title"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Task description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={statusValue}
                onValueChange={(value) => setValue("status", value as any)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={priorityValue}
                onValueChange={(value) => setValue("priority", value as any)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              {...register("dueDate")}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="createMatrixRoom"
              {...register("createMatrixRoom")}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="createMatrixRoom" className="text-sm font-normal cursor-pointer">
              Create Matrix chat room for this task
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : initialData ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

