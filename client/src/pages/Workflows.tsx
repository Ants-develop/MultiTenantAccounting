import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkflowTemplates } from "@/hooks/useWorkflowTemplates";
import { useWorkflowStages } from "@/hooks/useWorkflowStages";
import { useWorkflows } from "@/hooks/useWorkflows";
import { JobsKanban } from "@/components/workflows/JobsKanban";
import { CreateJobDialog } from "@/components/workflows/CreateJobDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const Workflows = () => {
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Fetch the first active template to show stages
  const { data: templates } = useWorkflowTemplates({ is_active: true });
  const defaultTemplate = templates?.[0];
  const templateId = selectedTemplateId || defaultTemplate?.id;

  const { data: stages } = useWorkflowStages(templateId);
  const { data: jobs } = useWorkflows({ template_id: templateId });

  // Fetch clients for the create dialog
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ["users-for-assignment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .order("first_name");
      if (error) throw error;
      return (data || []).map((u: any) => ({
        id: u.id,
        full_name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "User",
      }));
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">
            Manage client jobs and workflow pipelines
          </p>
        </div>
        <Button onClick={() => setCreateJobOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Job
        </Button>
      </div>

      <Tabs defaultValue="jobs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-6">
          {/* Template Selector */}
          {templates && templates.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  variant={templateId === template.id ? "default" : "outline"}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  {template.name}
                </Button>
              ))}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{jobs?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Total Jobs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {jobs?.filter((j) => j.status === "active").length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {jobs?.filter((j) => j.status === "completed").length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stages?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Stages</p>
              </CardContent>
            </Card>
          </div>

          {/* Kanban Board */}
          {stages && stages.length > 0 ? (
            <JobsKanban stages={stages} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No workflow template selected. Please create a template first.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pipelines">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Pipeline management coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Analytics dashboard coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Job Dialog */}
      <CreateJobDialog
        open={createJobOpen}
        onOpenChange={setCreateJobOpen}
        clients={clients}
        users={users}
        defaultTemplateId={templateId}
      />
    </div>
  );
};

export default Workflows;
