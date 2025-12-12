import React from "react";
import { useClientTasks } from "@/hooks/useClientTasks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle2, Circle, Clock } from "lucide-react";

interface ClientTasksProps {
  clientId: number;
}

export const ClientTasks: React.FC<ClientTasksProps> = ({ clientId }) => {
  const { data: tasks, isLoading } = useClientTasks(clientId);

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading tasks...</div>;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/10">
        No tasks found for this client.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card key={task.id} className="hover:bg-muted/50 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {task.status === "done" || task.status === "completed" ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <h4 className="font-medium leading-none mb-1">{task.title}</h4>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {task.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={task.priority === "high" || task.priority === "urgent" ? "destructive" : "secondary"} className="capitalize">
                {task.priority}
              </Badge>
              {task.dueDate && (
                <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                  <Clock className="mr-1 h-3.5 w-3.5" />
                  {format(new Date(task.dueDate), "MMM d")}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
