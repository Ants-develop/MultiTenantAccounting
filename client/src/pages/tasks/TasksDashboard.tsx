import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTasks, useTaskMutations, Task } from "@/hooks/useTasks";
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
  const [assigneeFilter, setAssigneeFilter] = useState<string | undefined>();

  const { data: tasks = [], isLoading } = useTasks({
    status: statusFilter,
    priority: priorityFilter,
    assigned_to: assigneeFilter,
  });

  const { createTask, updateTask } = useTaskMutations();

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    await updateTask.mutateAsync({ id: taskId, ...updates });
  };

  const handleCreateTask = async (data: Partial<Task>) => {
    await createTask.mutateAsync(data);
    setIsTaskFormOpen(false);
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
        onTaskClick={handleTaskClick}
      />

      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        onSubmit={editingTask ? (updates) => handleTaskUpdate(editingTask.id, updates) : handleCreateTask}
        initialData={editingTask}
      />
    </div>
  );
}

