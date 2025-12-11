import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface JobTask {
  id: string;
  workflow_id: string;
  title: string;
  description?: string;
  status: string;
  assigned_to?: string;
  due_date?: string;
  order_index: number;
  is_required: boolean;
  created_at: string;
  completed_at?: string;
  assigned_to_user?: {
    full_name: string;
    avatar_url?: string;
  };
}

export const useJobTasks = (workflowId?: string) => {
  return useQuery({
    queryKey: ["job-tasks", workflowId],
    queryFn: async () => {
      if (!workflowId) return [];

      const { data, error } = await supabase
        .from("workflow_tasks")
        .select(`
          *,
          assigned_to_user:assigned_to(full_name, avatar_url)
        `)
        .eq("workflow_id", workflowId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as JobTask[];
    },
    enabled: !!workflowId,
  });
};

export const useJobTaskStats = (workflowId?: string) => {
  return useQuery({
    queryKey: ["job-task-stats", workflowId],
    queryFn: async () => {
      if (!workflowId) return { total: 0, completed: 0, overdue: 0 };

      const { data, error } = await supabase
        .from("workflow_tasks")
        .select("id, status, due_date")
        .eq("workflow_id", workflowId);

      if (error) throw error;

      const tasks = data || [];
      const total = tasks.length;
      const completed = tasks.filter((t) => t.status === "completed").length;
      
      const now = new Date();
      const overdue = tasks.filter(
        (t) =>
          t.status !== "completed" &&
          t.due_date &&
          new Date(t.due_date) < now
      ).length;

      return { total, completed, overdue };
    },
    enabled: !!workflowId,
  });
};
