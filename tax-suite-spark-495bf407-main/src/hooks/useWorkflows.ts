import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WorkflowWithDetails, WorkflowFilters } from "@/types/workflow";
import { useEffect } from "react";

export const useWorkflows = (filters?: WorkflowFilters) => {
  const query = useQuery({
    queryKey: ["workflows", filters],
    queryFn: async () => {
      let queryBuilder = supabase
        .from("workflows")
        .select(`
          *,
          workflow_templates (
            id,
            name,
            type,
            estimated_duration_days
          ),
          clients (
            id,
            name
          ),
          workflow_stages!workflows_current_stage_id_fkey (
            id,
            name,
            color
          ),
          profiles!workflows_assigned_to_fkey (
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });

      if (filters?.client_id) {
        queryBuilder = queryBuilder.eq("client_id", filters.client_id);
      }

      if (filters?.period) {
        queryBuilder = queryBuilder.eq("period", filters.period);
      }

      if (filters?.status) {
        queryBuilder = queryBuilder.eq("status", filters.status);
      }

      if (filters?.service_type) {
        queryBuilder = queryBuilder.eq("service_type", filters.service_type);
      }

      if (filters?.assigned_to) {
        queryBuilder = queryBuilder.eq("assigned_to", filters.assigned_to);
      }

      if (filters?.current_stage_id) {
        queryBuilder = queryBuilder.eq("current_stage_id", filters.current_stage_id);
      }

      if (filters?.template_id) {
        queryBuilder = queryBuilder.eq("template_id", filters.template_id);
      }

      if (filters?.search) {
        queryBuilder = queryBuilder.or(`name.ilike.%${filters.search}%`);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data as WorkflowWithDetails[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("workflows-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflows",
        },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query]);

  return query;
};

export const useWorkflow = (id: string | undefined) => {
  return useQuery({
    queryKey: ["workflow", id],
    queryFn: async () => {
      if (!id) throw new Error("Workflow ID is required");

      const { data, error } = await supabase
        .from("workflows")
        .select(`
          *,
          workflow_templates (
            *,
            workflow_stages (*)
          ),
          clients (
            id,
            name,
            email
          ),
          workflow_stages!workflows_current_stage_id_fkey (
            id,
            name,
            color,
            order_position
          ),
          profiles!workflows_assigned_to_fkey (
            full_name,
            avatar_url,
            email
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Fetch tasks for this workflow
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          assigned_to_user:profiles!tasks_assigned_to_fkey (
            full_name,
            avatar_url
          ),
          workflow_stages (
            name,
            color
          )
        `)
        .eq("workflow_id", id)
        .order("stage_id", { ascending: true })
        .order("order_position", { ascending: true });

      if (tasksError) throw tasksError;

      return {
        ...data,
        tasks,
      } as WorkflowWithDetails & { tasks: any[] };
    },
    enabled: !!id,
  });
};
