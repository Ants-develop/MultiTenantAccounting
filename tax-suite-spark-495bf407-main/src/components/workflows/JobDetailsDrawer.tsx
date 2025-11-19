import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useWorkflow } from "@/hooks/useWorkflows";
import { useWorkflowMutations } from "@/hooks/useWorkflowMutations";
import { formatPeriodDisplay } from "@/utils/periodUtils";
import { format } from "date-fns";
import { Calendar, User, CheckCircle2, ArrowRight, Trash2, RefreshCw, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useWorkflowStages } from "@/hooks/useWorkflowStages";
import { TransitionStageDialog } from "./TransitionStageDialog";
import { EditJobDialog } from "./EditJobDialog";
import { StageHistoryTimeline } from "./StageHistoryTimeline";

interface JobDetailsDrawerProps {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JobDetailsDrawer = ({
  jobId,
  open,
  onOpenChange,
}: JobDetailsDrawerProps) => {
  const [transitionDialogOpen, setTransitionDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { data: job, isLoading } = useWorkflow(jobId || undefined);
  const { data: stages } = useWorkflowStages(job?.template_id);
  const { transitionWorkflowStage, completeWorkflow, deleteWorkflow } = useWorkflowMutations();

  if (!open || !jobId) return null;

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!job) return null;

  const getNextStage = () => {
    if (!stages || !job.current_stage_id) return null;
    const currentIndex = stages.findIndex((s) => s.id === job.current_stage_id);
    return stages[currentIndex + 1];
  };

  const nextStage = getNextStage();
  const canTransition = nextStage && job.status !== "completed";

  const handleTransition = () => {
    if (!nextStage) return;
    transitionWorkflowStage.mutate(
      {
        workflow_id: job.id,
        new_stage_id: nextStage.id,
      },
      {
        onSuccess: () => {
          // Keep drawer open to show updated state
        },
      }
    );
  };

  const handleComplete = () => {
    completeWorkflow.mutate(job.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this job?")) {
      deleteWorkflow.mutate(job.id, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{job.name}</SheetTitle>
          <SheetDescription>
            {job.clients?.name} • {job.period && formatPeriodDisplay(job.period)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {job.workflow_stages && (
                <Badge
                  variant="outline"
                  style={{
                    borderColor: job.workflow_stages.color || undefined,
                    color: job.workflow_stages.color || undefined,
                  }}
                >
                  {job.workflow_stages.name}
                </Badge>
              )}
              <Badge variant={job.status === "completed" ? "default" : "secondary"}>
                {job.status}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              {job.status !== "completed" && (
                <>
                  <Button size="sm" onClick={() => setTransitionDialogOpen(true)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Change Stage
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleComplete}
                    disabled={completeWorkflow.isPending}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Complete
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                disabled={deleteWorkflow.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            {job.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Due Date</p>
                  <p className="font-medium">{format(new Date(job.due_date), "PPP")}</p>
                </div>
              </div>
            )}
            {job.assigned_to_user && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Assigned To</p>
                  <p className="font-medium">{job.assigned_to_user.full_name}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Tabs */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Template</p>
                  <p className="text-sm font-medium">{job.workflow_templates?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service Type</p>
                  <p className="text-sm font-medium capitalize">
                    {job.service_type?.replace(/_/g, " ") || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Started</p>
                  <p className="text-sm font-medium">
                    {format(new Date(job.started_at), "PPP")}
                  </p>
                </div>
                {job.completed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-sm font-medium">
                      {format(new Date(job.completed_at), "PPP")}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-3 mt-4">
              {job.tasks && job.tasks.length > 0 ? (
                job.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    <CheckCircle2
                      className={`h-5 w-5 mt-0.5 ${
                        task.status === "completed"
                          ? "text-green-500"
                          : "text-muted-foreground"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{task.title}</p>
                      {task.workflow_stages && (
                        <div className="flex items-center gap-2 mt-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: task.workflow_stages.color || "#6366f1" }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {task.workflow_stages.name}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assigned_to_user?.full_name || "Unassigned"}
                        </span>
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.due_date), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline">{task.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tasks found for this job</p>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <StageHistoryTimeline
                workflowId={job.id}
                currentStageId={job.current_stage_id}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>

      {/* Dialogs */}
      {job && (
        <>
          <TransitionStageDialog
            open={transitionDialogOpen}
            onOpenChange={setTransitionDialogOpen}
            workflow={job}
          />
          <EditJobDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            workflow={job}
          />
        </>
      )}
    </Sheet>
  );
};
