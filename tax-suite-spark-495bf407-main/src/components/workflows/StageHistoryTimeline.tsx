import { useWorkflowStageHistory } from "@/hooks/useWorkflowStageHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface StageHistoryTimelineProps {
  workflowId: string;
  currentStageId: string | null;
}

export const StageHistoryTimeline = ({ workflowId, currentStageId }: StageHistoryTimelineProps) => {
  const { data: history, isLoading } = useWorkflowStageHistory(workflowId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stage History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stage History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No stage history available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stage History</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative space-y-6">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

            {history.map((entry, index) => {
              const isCurrentStage = entry.stage_id === currentStageId;
              const isCurrent = index === 0 && !entry.exited_at;
              const duration = entry.duration_minutes
                ? `${Math.floor(entry.duration_minutes / 60)}h ${entry.duration_minutes % 60}m`
                : null;

              return (
                <div key={entry.id} className="relative flex gap-4 items-start">
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      isCurrent
                        ? "bg-primary border-primary"
                        : "bg-background border-muted-foreground"
                    }`}
                  >
                    {isCurrent ? (
                      <Circle className="h-4 w-4 text-primary-foreground fill-current" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: entry.workflow_stages?.color || "#6366f1",
                            }}
                          />
                          <h4 className="font-semibold">
                            {entry.workflow_stages?.name || "Unknown Stage"}
                          </h4>
                          {isCurrent && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Entered {formatDistanceToNow(new Date(entry.entered_at))} ago
                          {entry.entered_by_user && ` by ${entry.entered_by_user.full_name}`}
                        </p>
                        {entry.exited_at && (
                          <p className="text-sm text-muted-foreground">
                            Exited {formatDistanceToNow(new Date(entry.exited_at))} ago
                          </p>
                        )}
                        {duration && (
                          <p className="text-sm font-medium mt-1">Duration: {duration}</p>
                        )}
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
