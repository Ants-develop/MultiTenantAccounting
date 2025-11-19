import { useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useWorkflows } from "@/hooks/useWorkflows";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { PortalJobCard } from "@/components/portal/PortalJobCard";
import { Loader2 } from "lucide-react";

export const PortalWorkflows = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("active");
  
  const { data: workflows, isLoading } = useWorkflows({
    client_id: profile?.client_id || undefined,
  });

  const activeWorkflows = workflows?.filter(w => w.status === "in_progress") || [];
  const completedWorkflows = workflows?.filter(w => w.status === "completed") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Jobs</h1>
        <p className="text-muted-foreground mt-1">
          Track your active and completed work
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeWorkflows.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedWorkflows.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : activeWorkflows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No active jobs at the moment</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your team will assign new jobs as they become available
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeWorkflows.map((workflow) => (
                <PortalJobCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : completedWorkflows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No completed jobs yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {completedWorkflows.map((workflow) => (
                <PortalJobCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
