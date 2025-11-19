import { useWorkflowStageHistory } from "@/hooks/useWorkflowStageHistory";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface PortalStageTimelineProps {
  workflowId: string;
}

export const PortalStageTimeline = ({ workflowId }: PortalStageTimelineProps) => {
  const { data: history, isLoading } = useWorkflowStageHistory(workflowId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No stage history available
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item, index) => {
        const isCompleted = !!item.exited_at;
        const isCurrent = !isCompleted && index === history.length - 1;

        return (
          <div key={item.id} className="flex gap-4">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              {isCompleted ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : isCurrent ? (
                <Circle className="h-6 w-6 text-blue-500 fill-blue-500" />
              ) : (
                <Circle className="h-6 w-6 text-muted-foreground" />
              )}
              {index < history.length - 1 && (
                <div className="w-0.5 flex-1 bg-border my-2 min-h-8" />
              )}
            </div>

            {/* Stage content */}
            <div className="flex-1 pb-8">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: item.workflow_stages?.color || undefined,
                      }}
                    >
                      {item.workflow_stages?.name}
                    </Badge>
                    {isCurrent && (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      Started: {format(new Date(item.entered_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    {isCompleted && item.exited_at && (
                      <p>
                        Completed: {format(new Date(item.exited_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                    {item.duration_minutes && (
                      <p>Duration: {Math.round(item.duration_minutes / 60)} hours</p>
                    )}
                  </div>
                  {item.entered_by_user && (
                    <p className="text-xs text-muted-foreground">
                      by {item.entered_by_user.full_name}
                    </p>
                  )}
                  {item.notes && (
                    <Card className="mt-2">
                      <CardContent className="pt-3 text-sm">
                        {item.notes}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
