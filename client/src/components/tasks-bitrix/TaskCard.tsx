import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Task } from "@/api/tasks-bitrix";
import { Calendar, User, Tag, Clock } from "lucide-react";
import { format } from "date-fns";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

const statusColors: Record<Task["status"], string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  review: "bg-purple-100 text-purple-800",
  done: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const priorityColors: Record<Task["priority"], string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg flex-1">{task.title}</h3>
          <div className="flex gap-2 ml-2">
            {task.templateId && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Clock className="h-3 w-3 mr-1" />
                Auto-created
              </Badge>
            )}
            <Badge className={statusColors[task.status]}>
              {task.status.replace("_", " ")}
            </Badge>
            <Badge className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
          </div>
        </div>

        {task.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {task.dueAt && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(task.dueAt), "MMM d, yyyy")}</span>
            </div>
          )}
          {task.assignedTo && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>Assigned</span>
            </div>
          )}
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              <span>{task.tags.length} tag{task.tags.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

