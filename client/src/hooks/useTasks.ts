import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getAccessToken } from "@/lib/auth";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "review" | "completed" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  assignee?: string;
  due_date?: string;
  workflow_job_id?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface TaskFilters {
  search?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  workflow_job_id?: string;
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
          .channel("job_tasks")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "job_tasks" },
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
      let query = supabase.from("job_tasks").select("*").order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.priority) {
        query = query.eq("priority", filters.priority);
      }

      if (filters?.assignee) {
        query = query.eq("assignee", filters.assignee);
      }

      if (filters?.workflow_job_id) {
        query = query.eq("workflow_job_id", filters.workflow_job_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      let tasks = (data || []) as Task[];

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
          (t) =>
            t.due_date &&
            new Date(t.due_date) < now &&
            t.status !== "completed"
        );
      }

      return tasks;
    },
  });
};

export const useTasksByStatus = (workflowJobId?: string) => {
  const { data: tasks, ...rest } = useTasks({
    workflow_job_id: workflowJobId,
  });

  const grouped = {
    todo: tasks?.filter((t) => t.status === "todo") || [],
    in_progress: tasks?.filter((t) => t.status === "in_progress") || [],
    review: tasks?.filter((t) => t.status === "review") || [],
    completed: tasks?.filter((t) => t.status === "completed") || [],
    blocked: tasks?.filter((t) => t.status === "blocked") || [],
  };

  return { data: grouped, ...rest };
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      priority?: "low" | "medium" | "high" | "urgent";
      assigned_to?: string;
      due_date?: string;
      workflow_job_id?: string;
    }) => {
      const token = getAccessToken();

      const { data, error } = await supabase
        .from("job_tasks")
        .insert([
          {
            title: input.title,
            description: input.description || null,
            status: "todo",
            priority: input.priority || "medium",
            assigned_to: input.assigned_to || null,
            due_date: input.due_date || null,
            workflow_job_id: input.workflow_job_id || null,
            created_by: token,
          },
        ])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assigned_to?: string;
      due_date?: string;
    }) => {
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (input.title) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;
      if (input.status) updates.status = input.status;
      if (input.priority) updates.priority = input.priority;
      if (input.assigned_to !== undefined) updates.assigned_to = input.assigned_to;
      if (input.due_date !== undefined) updates.due_date = input.due_date;

      const { data, error } = await supabase
        .from("job_tasks")
        .update(updates)
        .eq("id", input.id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("job_tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};
