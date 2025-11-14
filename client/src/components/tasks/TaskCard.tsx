import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/api/tasks";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, AlertCircle } from "lucide-react";
import dayjs from "dayjs";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityVariants = {
    low: "secondary",
    medium: "default",
    high: "destructive",
    urgent: "destructive",
  } as const;

  const isOverdue = task.dueDate && dayjs(task.dueDate).isBefore(dayjs(), "day");

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 text-sm flex-1">{task.title}</h4>
        <Badge variant={priorityVariants[task.priority]}>
          {task.priority}
        </Badge>
      </div>

      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-500">
        {task.dueDate && (
          <div className={`flex items-center gap-1 ${isOverdue ? "text-red-600" : ""}`}>
            <Calendar className="w-3 h-3" />
            <span>{dayjs(task.dueDate).format("MMM D")}</span>
            {isOverdue && <AlertCircle className="w-3 h-3" />}
          </div>
        )}
        {task.assigneeId && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>Assigned</span>
          </div>
        )}
      </div>
    </div>
  );
};

