import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { WorkflowTemplate } from "@/types/workflow";

interface TemplateFilters {
  is_active?: boolean;
  type?: string;
}

export const useWorkflowTemplates = (filters?: TemplateFilters) => {
  return useQuery({
    queryKey: ["workflow-templates", filters],
    queryFn: async () => {
      let query = supabase
        .from("workflow_templates")
        .select("*")
        .order("name", { ascending: true });

      if (filters?.is_active !== undefined) {
        query = query.eq("is_active", filters.is_active);
      }

      if (filters?.type) {
        query = query.eq("type", filters.type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as WorkflowTemplate[];
    },
  });
};

export const useWorkflowTemplate = (templateId?: string) => {
  return useQuery({
    queryKey: ["workflow-template", templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) throw error;
      return data as WorkflowTemplate;
    },
    enabled: !!templateId,
  });
};
