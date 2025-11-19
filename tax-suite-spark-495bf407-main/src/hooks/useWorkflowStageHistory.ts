import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WorkflowStageHistoryWithDetails } from "@/types/workflow";

export const useWorkflowStageHistory = (workflowId: string | undefined) => {
  return useQuery({
    queryKey: ["workflow-stage-history", workflowId],
    queryFn: async () => {
      if (!workflowId) throw new Error("Workflow ID is required");

      const { data, error } = await supabase
        .from("workflow_stage_history")
        .select(`
          *,
          workflow_stages (
            id,
            name,
            color,
            order_position
          ),
          entered_by_user:profiles!workflow_stage_history_entered_by_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq("workflow_id", workflowId)
        .order("entered_at", { ascending: true });

      if (error) throw error;
      return data as WorkflowStageHistoryWithDetails[];
    },
    enabled: !!workflowId,
  });
};
