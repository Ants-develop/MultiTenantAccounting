import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type TaskStatus = "todo" | "in_progress" | "review" | "completed" | "blocked";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Search, CheckSquare2, Layout, List } from "lucide-react";
import { useTasks, useTasksByStatus, Task, TaskFilters } from "@/hooks/useTasks";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTaskMutations } from "@/hooks/useTasks";
import { toast } from "sonner";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";

const Tasks = () => {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [filters, setFilters] = useState<TaskFilters>({});
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Fetch filters data
  const statuses: TaskStatus[] = ["todo", "in_progress", "review", "completed", "blocked"];

  const { data: priorities } = useQuery({
    queryKey: ["task-priorities"],
    queryFn: async () => {
      return ["low", "medium", "high", "critical"];
    },
  });

  const { data: assignees } = useQuery({
    queryKey: ["task-assignees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return (data || []).map((u: any) => ({
        id: u.id,
        full_name: u.full_name || "User",
      }));
    },
  });

  const { data: tasks, isLoading } = useTasks(filters);
  const { data: tasksByStatus } = useTasksByStatus(filters.workflow_job_id);
  const { deleteTask } = useTaskMutations();

  const handleDeleteTask = async () => {
    if (deleteTaskId) {
      try {
        await deleteTask.mutateAsync(deleteTaskId);
        setDeleteTaskId(null);
        toast.success("Task deleted");
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-100 text-red-800",
      high: "bg-orange-100 text-orange-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-blue-100 text-blue-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      todo: "bg-gray-100",
      in_progress: "bg-blue-100 border-l-4 border-blue-500",
      review: "bg-purple-100 border-l-4 border-purple-500",
      completed: "bg-green-100 border-l-4 border-green-500",
      blocked: "bg-red-100 border-l-4 border-red-500",
    };
    return colors[status] || "bg-gray-100";
  };

  return (
    <div className="h-full flex flex-col p-6 bg-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CheckSquare2 className="h-8 w-8" />
            Tasks
          </h1>
          <p className="text-muted-foreground">
            Organize and track workflow tasks
          </p>
        </div>
        <Button size="lg">
          <Plus className="h-5 w-5 mr-2" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={filters.search || ""}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value || undefined })
                }
                className="pl-9"
              />
            </div>

            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  status: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace("_", " ").charAt(0).toUpperCase() + status.replace("_", " ").slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.priority || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  priority: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {priorities?.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.assignee || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  assignee: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {assignees?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={filters.overdue ? "default" : "outline"}
                onClick={() =>
                  setFilters({ ...filters, overdue: !filters.overdue })
                }
              >
                Overdue
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <Tabs
        value={view}
        onValueChange={(v) => setView(v as "kanban" | "list")}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="kanban">
            <Layout className="h-4 w-4 mr-2" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="flex-1 min-h-0">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading tasks...
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-4 overflow-x-auto pb-4">
              {statuses.map(
                (status) => (
                  <div
                    key={status}
                    className={`flex-shrink-0 w-80 rounded-lg p-4 ${getStatusColor(status)}`}
                  >
                    <h3 className="font-semibold mb-4 capitalize">
                      {status.replace("_", " ")} (
                      {tasksByStatus?.[status]?.length || 0})
                    </h3>
                    <div className="space-y-2">
                      {tasksByStatus?.[status]?.map((task: Task) => (
                        <Card
                          key={task.id}
                          className="p-3 cursor-move hover:shadow-lg transition-shadow"
                          onClick={() => setSelectedTaskId(parseInt(task.id))}
                        >
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <span
                              className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}
                            >
                              {task.priority}
                            </span>
                            {task.due_date && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                            <button
                              onClick={() => setDeleteTaskId(task.id)}
                              className="ml-auto text-xs text-red-600 hover:text-red-800"
                            >
                              ×
                            </button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="flex-1 min-h-0">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading tasks...
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div className="space-y-2 overflow-auto">
              {tasks.map((task: Task) => (
                <Card
                  key={task.id}
                  className={`p-4 ${getStatusColor(task.status)} cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => setSelectedTaskId(parseInt(task.id))}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span
                          className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}
                        >
                          {task.priority}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded capitalize">
                          {task.status.replace("_", " ")}
                        </span>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTaskId(task.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No tasks found
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog
        open={!!deleteTaskId}
        onOpenChange={(open) => !open && setDeleteTaskId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TaskDetailDialog
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
};

export default Tasks;
