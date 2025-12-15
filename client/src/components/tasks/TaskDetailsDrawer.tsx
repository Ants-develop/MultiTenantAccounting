import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Briefcase, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskDetailsDrawerProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
  onOpenJobDetails?: (jobId: string) => void;
}

const priorityConfig = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", className: "bg-blue-500 text-white" },
  high: { label: "High", className: "bg-orange-500 text-white" },
  urgent: { label: "Urgent", className: "bg-destructive text-destructive-foreground" },
};

const statusConfig = {
  todo: { label: "To Do", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", className: "bg-blue-500 text-white" },
  review: { label: "Review", className: "bg-purple-500 text-white" },
  completed: { label: "Completed", className: "bg-green-500 text-white" },
  blocked: { label: "Blocked", className: "bg-destructive text-destructive-foreground" },
};

export const TaskDetailsDrawer = ({
  taskId,
  open,
  onOpenChange,
  onTaskUpdated,
  onOpenJobDetails,
}: TaskDetailsDrawerProps) => {
  const [task, setTask] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (taskId && open) {
      fetchTask();
      fetchStaff();
    }
  }, [taskId, open]);

  const fetchTask = async () => {
    if (!taskId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          client:clients(id, name),
          assigned_to_user:profiles!tasks_assigned_to_fkey(id, full_name),
          workflow:workflows(id, name, status, period, service_type)
        `)
        .eq("id", taskId)
        .single();

      if (error) throw error;
      setTask(data);
    } catch (error) {
      console.error("Error fetching task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaff = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
    setStaff(data || []);
  };

  const updateTask = async (field: string, value: any) => {
    if (!taskId) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", taskId);

      if (error) throw error;
      
      setTask((prev: any) => ({ ...prev, [field]: value }));
      onTaskUpdated();
      toast.success("Task updated");
    } catch (error: any) {
      toast.error("Failed to update task");
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isOverdue = task?.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : task ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-left pr-8">{task.title}</SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Job Info */}
              {task.workflow && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      <span className="font-medium">Job</span>
                    </div>
                    {onOpenJobDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onOpenChange(false);
                          onOpenJobDetails(task.workflow.id);
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View Job
                      </Button>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="font-medium">{task.workflow.name}</p>
                    {task.workflow.period && (
                      <p className="text-sm text-muted-foreground">Period: {task.workflow.period}</p>
                    )}
                    {task.workflow.service_type && (
                      <p className="text-sm text-muted-foreground">
                        Service: {task.workflow.service_type.replace(/_/g, " ")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Status and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select
                    value={task.status}
                    onValueChange={(value) => updateTask("status", value)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <Select
                    value={task.priority}
                    onValueChange={(value) => updateTask("priority", value)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Details */}
              <div className="space-y-4">
                {/* Client */}
                {task.client && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Client</p>
                      <p className="font-medium">{task.client.name}</p>
                    </div>
                  </div>
                )}

                {/* Assignee */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10">
                      {task.assigned_to_user ? getInitials(task.assigned_to_user.full_name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Assigned To</p>
                    <Select
                      value={task.assigned_to || "unassigned"}
                      onValueChange={(value) => updateTask("assigned_to", value === "unassigned" ? null : value)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="h-auto p-0 border-0 font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {staff.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isOverdue ? "bg-destructive/10" : "bg-muted"}`}>
                    {isOverdue ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className={`font-medium ${isOverdue ? "text-destructive" : ""}`}>
                      {task.due_date
                        ? format(new Date(task.due_date), "MMM dd, yyyy")
                        : "No due date"}
                    </p>
                  </div>
                </div>

                {/* Completed At */}
                {task.completed_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="font-medium">
                        {format(new Date(task.completed_at), "MMM dd, yyyy 'at' HH:mm")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Created At */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {format(new Date(task.created_at), "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {task.description && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {task.description}
                    </p>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Task not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
