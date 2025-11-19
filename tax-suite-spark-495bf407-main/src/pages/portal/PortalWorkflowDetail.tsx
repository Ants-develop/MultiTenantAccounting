import { useParams, useNavigate } from "react-router-dom";
import { useWorkflow } from "@/hooks/useWorkflows";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, User, MessageSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { PortalStageTimeline } from "@/components/portal/PortalStageTimeline";
import { PortalWorkflowDocuments } from "@/components/portal/PortalWorkflowDocuments";

export const PortalWorkflowDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: workflow, isLoading } = useWorkflow(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/portal/workflows")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Job not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/portal/workflows")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>
        <Button onClick={() => navigate("/portal/messages")}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Message Team
        </Button>
      </div>

      {/* Job Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{workflow.name}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {workflow.period && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{workflow.period}</span>
                  </div>
                )}
                {workflow.assigned_to_user && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{workflow.assigned_to_user.full_name}</span>
                  </div>
                )}
              </div>
            </div>
            <Badge variant="outline" className={getStatusColor(workflow.status)}>
              {workflow.status === "in_progress" ? "In Progress" : "Completed"}
            </Badge>
          </div>
        </CardHeader>
        {workflow.workflow_stages && (
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium">Current Stage</p>
              <Badge
                variant="outline"
                style={{ borderColor: workflow.workflow_stages.color || undefined }}
              >
                {workflow.workflow_stages.name}
              </Badge>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stage History</CardTitle>
            </CardHeader>
            <CardContent>
              <PortalStageTimeline workflowId={workflow.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <PortalWorkflowDocuments workflowId={workflow.id} clientId={workflow.client_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
