import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WorkflowTemplateWithStages } from "@/types/workflow";
import { useEffect } from "react";

interface UseWorkflowTemplatesFilters {
  type?: string;
  is_active?: boolean;
  search?: string;
}

export const useWorkflowTemplates = (filters?: UseWorkflowTemplatesFilters) => {
  const query = useQuery({
    queryKey: ["workflow-templates", filters],
    queryFn: async () => {
      let queryBuilder = supabase
        .from("workflow_templates")
        .select(`
          *,
          workflow_stages (*)
        `)
        .order("created_at", { ascending: false });

      if (filters?.type) {
        queryBuilder = queryBuilder.eq("type", filters.type);
      }

      if (filters?.is_active !== undefined) {
        queryBuilder = queryBuilder.eq("is_active", filters.is_active);
      }

      if (filters?.search) {
        queryBuilder = queryBuilder.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

    const { data, error } = await queryBuilder.select(`
      *,
      workflow_stages (*),
      workflow_template_clients (
        client_id,
        clients (id, name, status)
      )
    `);

      if (error) throw error;
      return data as WorkflowTemplateWithStages[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("workflow-templates-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflow_templates",
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

export const useWorkflowTemplate = (id: string | undefined) => {
  return useQuery({
    queryKey: ["workflow-template", id],
    queryFn: async () => {
      if (!id) throw new Error("Template ID is required");

      const { data, error } = await supabase
        .from("workflow_templates")
        .select(`
          *,
          workflow_stages (
            *,
            task_templates (*)
          )
        `)
        .eq("id", id)
        .order("order_position", { 
          referencedTable: "workflow_stages",
          ascending: true 
        })
        .single();

      if (error) throw error;
      return data as WorkflowTemplateWithStages;
    },
    enabled: !!id,
  });
};
