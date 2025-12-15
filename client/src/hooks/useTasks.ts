import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "review" | "completed" | "blocked";
  priority: "low" | "medium" | "high" | "urgent";
  assigned_to?: string | number;
  due_date?: string;
  workflow_id?: string;
  client_id?: string;
  stage_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  assigned_to_user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface TaskFilters {
  search?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  workflow_id?: string;
  client_id?: string;
  overdue?: boolean;
}

export const useTasks = (filters?: TaskFilters) => {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);

  // Setup real-time subscription
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        subscriptionRef.current = supabase
          .channel("tasks_changes")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "tasks" },
            (payload: any) => {
              queryClient.invalidateQueries({ queryKey: ["tasks", filters] });
            }
          )
          .subscribe();
      } catch (error) {
        console.error("Error setting up tasks subscription:", error);
      }
    };

    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [queryClient, filters]);

  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          assigned_to_user:profiles!tasks_assigned_to_profiles_id_fk(full_name, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.priority) {
        query = query.eq("priority", filters.priority);
      }

      if (filters?.assigned_to) {
        query = query.eq("assigned_to", filters.assigned_to);
      }

      if (filters?.workflow_id) {
        query = query.eq("workflow_id", filters.workflow_id);
      }

      if (filters?.client_id) {
        query = query.eq("client_id", filters.client_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      let tasks = (data || []) as Task[];

      // Normalize joined user shape (users table doesn't have full_name/avatar_url)
      tasks = tasks.map((t: any) => {
        const u = t.assigned_to_user;
        if (!u) return t;
        const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "User";
        return {
          ...t,
          assigned_to_user: { full_name: fullName, avatar_url: null },
        } as Task;
      });

      // Client-side filtering
      if (filters?.search) {
        const lower = filters.search.toLowerCase();
        tasks = tasks.filter(
          (t) =>
            t.title.toLowerCase().includes(lower) ||
            t.description?.toLowerCase().includes(lower)
        );
      }

      if (filters?.overdue) {
        const now = new Date();
        tasks = tasks.filter(
          (t) => t.due_date && new Date(t.due_date) < now && t.status !== "completed"
        );
      }

      return tasks;
    },
  });
};

export const useTaskMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createTask = useMutation({
    mutationFn: async (newTask: Partial<Task>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          ...newTask,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Task created",
        description: "The task has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Task updated",
        description: "The task has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({
        title: "Task deleted",
        description: "The task has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createTask,
    updateTask,
    deleteTask,
  };
};

export const useTasksByStatus = (workflowJobId?: string) => {
  return useQuery({
    queryKey: ["tasks-by-status", workflowJobId],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          assigned_to_user:profiles!tasks_assigned_to_profiles_id_fk(full_name, avatar_url)
        `)
        .order("created_at", { ascending: false});

      if (workflowJobId) {
        query = query.eq("workflow_id", workflowJobId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Data is already in the correct format from profiles table
      const tasks = (data || []) as Task[];
      
      // Group tasks by status
      const grouped: Record<string, Task[]> = {
        todo: [],
        in_progress: [],
        review: [],
        completed: [],
        blocked: [],
      };

      tasks.forEach((task) => {
        if (grouped[task.status]) {
          grouped[task.status].push(task);
        }
      });

      return grouped;
    },
  });
};
