import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export const MyTasksWidget = () => {
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/tasks?assignee=me&limit=5");
      return await response.json();
    },
  });

  const pendingTasks = tasks.filter((task: any) => task.status !== "done");

  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          My Tasks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingTasks.length > 0 ? (
          <div className="space-y-3">
            {pendingTasks.slice(0, 5).map((task: any) => (
              <div key={task.id} className="flex gap-3 pb-3 border-b last:border-0">
                <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  {task.priority && (
                    <Badge
                      variant={
                        task.priority === "high" || task.priority === "urgent"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs mt-1"
                    >
                      {task.priority}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No pending tasks
          </p>
        )}
      </CardContent>
    </Card>
  );
};

