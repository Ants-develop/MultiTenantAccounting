import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Clock, AlertCircle, ArrowLeft, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import dayjs from "dayjs";

export const ClientPortalTasks: React.FC = () => {
  const [location, setLocation] = useLocation();
  const clientId = parseInt(sessionStorage.getItem("clientId") || "0");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["/api/client-portal/tasks", clientId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/client-portal/tasks?clientId=${clientId}`);
      return res.json();
    },
    enabled: clientId > 0,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckSquare className="w-5 h-5 text-green-600" />;
      case "in_progress":
        return <Clock className="w-5 h-5 text-blue-600" />;
      case "blocked":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      urgent: "destructive",
      high: "default",
      medium: "secondary",
      low: "outline",
    };
    return variants[priority] || "secondary";
  };

  const todoTasks = tasks.filter((t: any) => t.status === "todo");
  const inProgressTasks = tasks.filter((t: any) => t.status === "in_progress");
  const completedTasks = tasks.filter((t: any) => t.status === "done");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/client-portal/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
              <p className="text-sm text-gray-500">View and track your tasks</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* To Do */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                To Do ({todoTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todoTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No tasks</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todoTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg border hover:bg-gray-50 cursor-pointer"
                      onClick={() => setLocation(`/client-portal/tasks/${task.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        {getStatusIcon(task.status)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              Due: {dayjs(task.dueDate).format("MMM D, YYYY")}
                            </div>
                          )}
                        </div>
                        <Badge variant={getPriorityBadge(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                In Progress ({inProgressTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inProgressTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No tasks</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inProgressTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg border hover:bg-gray-50 cursor-pointer"
                      onClick={() => setLocation(`/client-portal/tasks/${task.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        {getStatusIcon(task.status)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              Due: {dayjs(task.dueDate).format("MMM D, YYYY")}
                            </div>
                          )}
                        </div>
                        <Badge variant={getPriorityBadge(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-green-600" />
                Completed ({completedTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No tasks</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg border bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer"
                      onClick={() => setLocation(`/client-portal/tasks/${task.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        {getStatusIcon(task.status)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          {task.completedAt && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              Completed: {dayjs(task.completedAt).format("MMM D, YYYY")}
                            </div>
                          )}
                        </div>
                        <Badge variant="default">Done</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};


