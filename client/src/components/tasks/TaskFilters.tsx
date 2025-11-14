import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

interface TaskFiltersProps {
  status?: string;
  priority?: string;
  assigneeId?: number;
  onStatusChange: (status: string | undefined) => void;
  onPriorityChange: (priority: string | undefined) => void;
  onAssigneeChange: (assigneeId: number | undefined) => void;
  onClear: () => void;
  assignees?: Array<{ id: number; name: string }>;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  status,
  priority,
  assigneeId,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onClear,
  assignees = [],
}) => {
  const hasFilters = status || priority || assigneeId;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Filter className="w-4 h-4" />
        <span>Filters:</span>
      </div>

      <Select value={status || ""} onValueChange={(value) => onStatusChange(value || undefined)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Status</SelectItem>
          <SelectItem value="todo">To Do</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="done">Done</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
          <SelectItem value="blocked">Blocked</SelectItem>
        </SelectContent>
      </Select>

      <Select value={priority || ""} onValueChange={(value) => onPriorityChange(value || undefined)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Priorities</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>

      {assignees.length > 0 && (
        <Select
          value={assigneeId?.toString() || ""}
          onValueChange={(value) => onAssigneeChange(value ? parseInt(value) : undefined)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Assignees</SelectItem>
            {assignees.map((a) => (
              <SelectItem key={a.id} value={a.id.toString()}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
};

