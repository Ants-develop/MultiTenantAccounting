import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, ListTodo, Clock } from "lucide-react";
import { TaskCard } from "@/components/tasks/TaskCard";
import { toast } from "sonner";

export const PortalTasks = () => {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile?.client_id) {
      fetchTasks();
    } else if (profile && !profile.client_id) {
      setIsLoading(false);
    }
  }, [profile?.client_id]);

  const fetchTasks = async () => {
    if (!profile?.client_id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assigned_to_user:profiles!tasks_assigned_to_fkey(full_name, job_title)
        `)
        .eq("client_id", profile.client_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);

      const total = data?.length || 0;
      const pending = data?.filter((t) => t.status !== "completed").length || 0;
      const completed = data?.filter((t) => t.status === "completed").length || 0;

      setStats({ total, pending, completed });
    } catch (error: any) {
      toast.error("Failed to load tasks", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile?.client_id) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <CheckSquare className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Account Not Configured</h3>
          <p className="text-muted-foreground">
            Your account is not associated with a client organization. 
            Please contact support for assistance.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tasks</h1>
        <p className="text-muted-foreground">Track your assigned tasks and progress</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No tasks assigned</h3>
            <p className="text-muted-foreground">
              Your team will assign tasks to you as needed
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
};
