import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi, Task, CreateTaskPayload } from "@/api/tasks";
import { useLocation } from "wouter";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function TasksDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
  const [assigneeFilter, setAssigneeFilter] = useState<number | undefined>();

  // For now, use a default workspace ID (will be replaced with workspace selection)
  const workspaceId = 1;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["/api/tasks", { workspaceId, status: statusFilter, priority: priorityFilter, assigneeId: assigneeFilter }],
    queryFn: () => tasksApi.fetchTasks({
      workspaceId,
      status: statusFilter,
      priority: priorityFilter,
      assigneeId: assigneeFilter,
    }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: number; updates: Partial<Task> }) =>
      tasksApi.updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskPayload) => tasksApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsTaskFormOpen(false);
    },
  });

  const handleTaskUpdate = async (taskId: number, updates: Partial<Task>) => {
    await updateTaskMutation.mutateAsync({ taskId, updates });
  };

  const handleCreateTask = async (data: CreateTaskPayload) => {
    await createTaskMutation.mutateAsync(data);
  };

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
    setIsTaskFormOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track your tasks</p>
        </div>
        <Button
          onClick={() => {
            setEditingTask(undefined);
            setIsTaskFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      <TaskFilters
        status={statusFilter}
        priority={priorityFilter}
        assigneeId={assigneeFilter}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
        onAssigneeChange={setAssigneeFilter}
        onClear={() => {
          setStatusFilter(undefined);
          setPriorityFilter(undefined);
          setAssigneeFilter(undefined);
        }}
      />

      <KanbanBoard
        tasks={tasks}
        onTaskUpdate={handleTaskUpdate}
        isLoading={isLoading}
      />

      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={() => {
          setIsTaskFormOpen(false);
          setEditingTask(undefined);
        }}
        onSubmit={handleCreateTask}
        initialData={editingTask}
        workspaceId={workspaceId}
      />
    </div>
  );
}

