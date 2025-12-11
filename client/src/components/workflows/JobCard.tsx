import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { WorkflowWithDetails } from "@/types/workflow";
import { formatPeriodDisplay } from "@/utils/periodUtils";
import { Calendar, AlertCircle, CheckCircle2, ListTodo } from "lucide-react";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: WorkflowWithDetails;
  onClick?: () => void;
  isDragging?: boolean;
}

export const JobCard = ({ job, onClick, isDragging }: JobCardProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getServiceTypeColor = (type: string | null) => {
    const colors: Record<string, string> = {
      monthly_bookkeeping: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      vat_return: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
      payroll: "bg-green-500/10 text-green-700 dark:text-green-400",
      annual_financials: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    };
    return colors[type || ""] || "bg-muted text-muted-foreground";
  };

  const isOverdue = job.due_date && isPast(new Date(job.due_date)) && job.status !== "completed";
  
  // Calculate task progress from job.tasks if available
  const tasks = (job as any).tasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t: any) => t.status === "completed").length;
  const overdueTasks = tasks.filter((t: any) => 
    t.due_date && isPast(new Date(t.due_date)) && t.status !== "completed"
  ).length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md",
        isDragging && "opacity-50 rotate-2"
      )}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header: Client & Period */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">
              {job.clients?.name || "Unknown Client"}
            </h4>
            {job.period && (
              <p className="text-xs text-muted-foreground">
                {formatPeriodDisplay(job.period)}
              </p>
            )}
          </div>
          {job.service_type && (
            <Badge variant="secondary" className={cn("text-xs", getServiceTypeColor(job.service_type))}>
              {job.service_type.replace(/_/g, " ")}
            </Badge>
          )}
        </div>

        {/* Task Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <ListTodo className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {totalTasks > 0 ? `${completedTasks}/${totalTasks} tasks` : "No tasks"}
              </span>
              {overdueTasks > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                  {overdueTasks} overdue
                </Badge>
              )}
            </div>
            {totalTasks > 0 && (
              <span className="font-medium">{completionPercentage}%</span>
            )}
          </div>
          {totalTasks > 0 && (
            <Progress value={completionPercentage} className="h-1.5" />
          )}
        </div>

        {/* Footer: Due Date & Assigned User */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs">
            {isOverdue ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-destructive font-medium">
                  {job.due_date ? format(new Date(job.due_date), "MMM d") : "No due date"}
                </span>
              </>
            ) : job.status === "completed" ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span className="text-green-600">Completed</span>
              </>
            ) : (
              <>
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {job.due_date ? format(new Date(job.due_date), "MMM d") : "No due date"}
                </span>
              </>
            )}
          </div>

          {job.assigned_to_user && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={job.assigned_to_user.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(job.assigned_to_user.full_name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Current Stage */}
        {job.workflow_stages && (
          <div className="pt-2 border-t">
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: job.workflow_stages.color || undefined,
                color: job.workflow_stages.color || undefined,
              }}
            >
              {job.workflow_stages.name}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
};
