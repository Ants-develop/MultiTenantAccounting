import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ListTodo, KanbanSquare, Calendar as CalendarIcon } from "lucide-react";
import { TasksKanban } from "@/components/tasks/TasksKanban";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { toast } from "sonner";

const Tasks = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, completed: 0, overdue: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          client:clients(name),
          assigned_to_user:profiles!tasks_assigned_to_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);

      // Calculate stats
      const now = new Date();
      const total = data?.length || 0;
      const inProgress = data?.filter((t) => t.status === "in_progress").length || 0;
      const completed = data?.filter((t) => t.status === "completed").length || 0;
      const overdue = data?.filter(
        (t) => t.due_date && new Date(t.due_date) < now && t.status !== "completed"
      ).length || 0;

      setStats({ total, inProgress, completed, overdue });
    } catch (error: any) {
      toast(error.message || "Failed to load tasks", {
        description: "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskClick = (task: any) => {
    console.log("Task clicked:", task);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your tasks and track progress
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <KanbanSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <ListTodo className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <CalendarIcon className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="kanban" className="w-full">
        <TabsList>
          <TabsTrigger value="kanban">
            <KanbanSquare className="mr-2 h-4 w-4" />
            Kanban Board
          </TabsTrigger>
          <TabsTrigger value="list">
            <ListTodo className="mr-2 h-4 w-4" />
            List View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <TasksKanban tasks={tasks} onTaskClick={handleTaskClick} />
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground py-8">
                List view coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchTasks}
      />
    </div>
  );
};

export default Tasks;
