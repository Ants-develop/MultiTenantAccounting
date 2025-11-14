import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Job, CreateJobPayload } from "@/api/jobs";
import { pipelinesApi } from "@/api/pipelines";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";

const jobFormSchema = z.object({
  pipelineId: z.number().int().positive().optional(),
  clientId: z.number().int().positive().optional(),
  title: z.string().min(1, "Job title is required"),
  description: z.string().optional(),
  status: z.enum(["active", "completed", "cancelled", "on_hold"]).optional().default("active"),
  assignedTo: z.number().int().positive().optional(),
  dueDate: z.string().optional(),
});

type JobFormValues = z.infer<typeof jobFormSchema>;

interface JobFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateJobPayload) => Promise<void>;
  initialData?: Partial<Job>;
  workspaceId: number;
}

export const JobForm: React.FC<JobFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  workspaceId,
}) => {
  const { data: pipelines = [] } = useQuery({
    queryKey: ["/api/pipelines", workspaceId],
    queryFn: () => pipelinesApi.fetchPipelines(workspaceId),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "active",
      pipelineId: undefined,
      assignedTo: undefined,
      dueDate: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setValue("title", initialData.title || "");
        setValue("description", initialData.description || "");
        setValue("status", initialData.status || "active");
        setValue("pipelineId", initialData.pipelineId);
        setValue("assignedTo", initialData.assignedTo);
        setValue("dueDate", initialData.dueDate ? new Date(initialData.dueDate).toISOString().split("T")[0] : "");
      } else {
        reset();
      }
    }
  }, [isOpen, initialData, setValue, reset]);

  const onFormSubmit = async (data: JobFormValues) => {
    try {
      await onSubmit({
        workspaceId,
        ...data,
        dueDate: data.dueDate || undefined,
      });
      reset();
      onClose();
    } catch (error) {
      console.error("Failed to submit job:", error);
    }
  };

  const pipelineIdValue = watch("pipelineId");
  const statusValue = watch("status");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Job" : "Create Job"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Update job details" : "Create a new job"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Job title"
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
              placeholder="Job description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pipeline">Pipeline (Optional)</Label>
            <Select
              value={pipelineIdValue?.toString() || ""}
              onValueChange={(value) => setValue("pipelineId", value ? parseInt(value) : undefined)}
            >
              <SelectTrigger id="pipeline">
                <SelectValue placeholder="No Pipeline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Pipeline</SelectItem>
                {pipelines.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                {...register("dueDate")}
              />
            </div>
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

