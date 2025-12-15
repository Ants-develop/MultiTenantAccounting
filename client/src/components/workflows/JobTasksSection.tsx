import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar, AlertCircle, Circle, Clock, CheckCircle2 } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface JobTasksSectionProps {
  workflowId: string;
  currentStageId: string | null;
  clientId: string;
  jobDueDate?: string | null;
}

// Task status configuration
const taskStatusConfig = {
  todo: {
    icon: Circle,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    label: "To Do",
    next: "in_progress" as const,
  },
  in_progress: {
    icon: Clock,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "In Progress",
    next: "completed" as const,
  },
  completed: {
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "Completed",
    next: "todo" as const,
  },
};

const TaskStatusButton = ({
  task,
  onCycleStatus,
}: {
  task: any;
  onCycleStatus: () => void;
}) => {
  const config = taskStatusConfig[task.status as keyof typeof taskStatusConfig] || taskStatusConfig.todo;
  const StatusIcon = config.icon;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-7 w-7 p-0 rounded-full", config.bgColor)}
      onClick={(e) => {
        e.stopPropagation();
        onCycleStatus();
      }}
      title={`Status: ${config.label} (click to change)`}
    >
      <StatusIcon className={cn("h-4 w-4", config.color)} />
    </Button>
  );
};

export const JobTasksSection = ({
  workflowId,
  currentStageId,
  clientId,
  jobDueDate,
}: JobTasksSectionProps) => {
  const queryClient = useQueryClient();
  
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["job-tasks", workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assigned_to_user:profiles!tasks_assigned_to_fkey(id, full_name)
        `)
        .eq("workflow_id", workflowId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workflowId,
  });

  const cycleStatus = useMutation({
    mutationFn: async ({ taskId, currentStatus }: { taskId: string; currentStatus: string }) => {
      const config = taskStatusConfig[currentStatus as keyof typeof taskStatusConfig] || taskStatusConfig.todo;
      const newStatus = config.next;
      
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: newStatus,
          completed_at: newStatus === "completed" ? new Date().toISOString() : null
        })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-tasks", workflowId] });
      toast.success("Task status updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update task", { description: error.message });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground mb-4">No tasks for this job yet</p>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {completedCount}/{tasks.length} tasks completed
        </div>
        <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{
              width: `${(completedCount / tasks.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.map((task) => {
          const isOverdue =
            task.due_date &&
            isPast(new Date(task.due_date)) &&
            !isToday(new Date(task.due_date)) &&
            task.status !== "completed";
          const statusConfig = taskStatusConfig[task.status as keyof typeof taskStatusConfig] || taskStatusConfig.todo;

          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors",
                task.status === "completed" && "opacity-60"
              )}
            >
              {/* Status Button */}
              <TaskStatusButton
                task={task}
                onCycleStatus={() =>
                  cycleStatus.mutate({
                    taskId: task.id,
                    currentStatus: task.status,
                  })
                }
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      task.status === "completed" && "line-through"
                    )}
                  >
                    {task.title}
                  </p>
                  <Badge 
                    variant="outline" 
                    className={cn("text-[10px] px-1.5 py-0", statusConfig.bgColor, statusConfig.color)}
                  >
                    {statusConfig.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {task.due_date && (
                    <span
                      className={cn(
                        "flex items-center gap-1",
                        isOverdue && "text-destructive"
                      )}
                    >
                      {isOverdue && <AlertCircle className="h-3 w-3" />}
                      <Calendar className="h-3 w-3" />
                      {format(new Date(task.due_date), "MMM d")}
                    </span>
                  )}
                  {task.assigned_to_user && (
                    <span className="flex items-center gap-1">
                      {task.assigned_to_user.full_name}
                    </span>
                  )}
                  {task.priority && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs px-1.5 py-0",
                        task.priority === "urgent" && "border-destructive text-destructive",
                        task.priority === "high" && "border-orange-500 text-orange-500"
                      )}
                    >
                      {task.priority}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Button */}
      <Button size="sm" variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Task
      </Button>
    </div>
  );
};
