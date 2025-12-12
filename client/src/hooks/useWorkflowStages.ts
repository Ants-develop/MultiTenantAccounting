import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { WorkflowStage } from "@/types/workflow";

export const useWorkflowStages = (templateId?: string) => {
  return useQuery({
    queryKey: ["workflow-stages", templateId],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from("workflow_stages")
        .select("*")
        .eq("template_id", templateId)
        .order("order_position", { ascending: true });

      if (error) throw error;
      return (data || []) as WorkflowStage[];
    },
    enabled: !!templateId,
  });
};
