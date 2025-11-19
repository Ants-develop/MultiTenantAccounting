import { useState } from "react";
import { TaskCard } from "./TaskCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to_user: { full_name: string } | null;
  client: { name: string } | null;
}

interface TasksKanbanProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const STATUSES = [
  { value: "todo", label: "To Do", color: "bg-gray-500/10" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-500/10" },
  { value: "review", label: "Review", color: "bg-yellow-500/10" },
  { value: "completed", label: "Completed", color: "bg-green-500/10" },
  { value: "blocked", label: "Blocked", color: "bg-red-500/10" },
];

export const TasksKanban = ({ tasks, onTaskClick }: TasksKanbanProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {STATUSES.map((status) => {
        const statusTasks = tasks.filter((task) => task.status === status.value);

        return (
          <Card key={status.value} className={status.color}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{status.label}</CardTitle>
                <Badge variant="secondary">{statusTasks.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {statusTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No tasks
                </p>
              ) : (
                statusTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
