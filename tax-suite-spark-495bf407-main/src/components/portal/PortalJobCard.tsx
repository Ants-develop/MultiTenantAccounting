import { WorkflowWithDetails } from "@/types/workflow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, User, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface PortalJobCardProps {
  workflow: WorkflowWithDetails;
}

export const PortalJobCard = ({ workflow }: PortalJobCardProps) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Calculate simple progress based on status
  const progress = workflow.status === "completed" ? 100 : 50;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{workflow.name}</CardTitle>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {workflow.period && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{workflow.period}</span>
                </div>
              )}
              {workflow.assigned_to_user && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{workflow.assigned_to_user.full_name}</span>
                </div>
              )}
            </div>
          </div>
          <Badge variant="outline" className={getStatusColor(workflow.status)}>
            {workflow.status === "in_progress" ? "Active" : "Completed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Stage */}
        {workflow.workflow_stages && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Current Stage</p>
            <Badge
              variant="outline"
              style={{ borderColor: workflow.workflow_stages.color || undefined }}
            >
              {workflow.workflow_stages.name}
            </Badge>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Due Date */}
        {workflow.due_date && (
          <div className="text-sm text-muted-foreground">
            Due: {format(new Date(workflow.due_date), "MMM d, yyyy")}
          </div>
        )}

        {/* View Details Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/portal/workflows/${workflow.id}`)}
        >
          View Details
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};
