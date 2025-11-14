import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi, Task } from "@/api/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskForm } from "@/components/tasks/TaskForm";
import { ArrowLeft, Calendar, User, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import dayjs from "dayjs";
import { useRouteParams } from "@/contexts/RouteParamsContext";
import { useGoldenLayout } from "@/hooks/useGoldenLayout";

interface TaskDetailProps {
  taskId?: number;
}

export default function TaskDetail({ taskId: propTaskId }: TaskDetailProps = {}) {
  const queryClient = useQueryClient();
  const routeParams = useRouteParams();
  const goldenLayout = useGoldenLayout();
  
  // Get taskId from props, route params, or URL (fallback)
  const taskId = propTaskId || 
    (routeParams.params.id ? parseInt(routeParams.params.id) : 0) ||
    parseInt(window.location.pathname.split("/").pop() || "0");

  const { data: task, isLoading } = useQuery({
    queryKey: ["/api/tasks", taskId],
    queryFn: () => tasksApi.fetchTask(taskId),
    enabled: taskId > 0,
  });

  const updateTaskMutation = useMutation({
    mutationFn: (updates: Partial<Task>) => tasksApi.updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const [isEditMode, setIsEditMode] = React.useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading task...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Task not found</p>
            <Button variant="outline" onClick={() => goldenLayout?.openTab("/tasks")} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tasks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOverdue = task.dueDate && dayjs(task.dueDate).isBefore(dayjs(), "day");
  const priorityVariants = {
    low: "secondary",
    medium: "default",
    high: "destructive",
    urgent: "destructive",
  } as const;

  const statusIcons = {
    todo: Clock,
    in_progress: Clock,
    done: CheckCircle2,
    cancelled: AlertCircle,
    blocked: AlertCircle,
  };

  const StatusIcon = statusIcons[task.status];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => goldenLayout?.openTab("/tasks")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
        </div>
        <Button onClick={() => setIsEditMode(true)}>
          Edit Task
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">
                {task.description || "No description provided."}
              </p>
            </CardContent>
          </Card>

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Checklist</CardTitle>
              </CardHeader>
              <CardContent>
              <div className="space-y-2">
                {task.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={subtask.done}
                      readOnly
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span
                      className={`flex-1 ${subtask.done ? "line-through text-gray-400" : "text-gray-700"}`}
                    >
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500">
                Activity feed will show task history once activity logging is fully implemented.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900 capitalize">{task.status.replace("_", " ")}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Priority</label>
                  <div className="mt-1">
                    <Badge variant={priorityVariants[task.priority]}>
                      {task.priority}
                    </Badge>
                  </div>
                </div>

              {task.dueDate && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Due Date</label>
                  <div className={`mt-1 flex items-center gap-2 ${isOverdue ? "text-red-600" : "text-gray-900"}`}>
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {dayjs(task.dueDate).format("MMMM D, YYYY")}
                      {isOverdue && " (Overdue)"}
                    </span>
                  </div>
                </div>
              )}

              {task.assigneeId && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Assignee</label>
                  <div className="mt-1 flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">User ID: {task.assigneeId}</span>
                  </div>
                </div>
              )}

              {task.createdAt && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Created</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {dayjs(task.createdAt).format("MMMM D, YYYY [at] h:mm A")}
                  </div>
                </div>
              )}
              </div>
            </CardContent>
          </Card>

          {/* Matrix Chat */}
          {task.matrixRoomId && (
            <Card>
              <CardHeader>
                <CardTitle>Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-500">
                  Matrix chat integration will be available once Matrix server is configured.
                  <br />
                  Room ID: {task.matrixRoomId}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {isEditMode && (
        <TaskForm
          isOpen={isEditMode}
          onClose={() => setIsEditMode(false)}
          onSubmit={async (data) => {
            await updateTaskMutation.mutateAsync(data);
            setIsEditMode(false);
          }}
          initialData={task}
          workspaceId={task.workspaceId}
          jobId={task.jobId}
        />
      )}
    </div>
  );
}

