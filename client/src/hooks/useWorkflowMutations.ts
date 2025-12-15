import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { CreateWorkflowInput, StageTransitionInput } from "@/types/workflow";
import { toast } from "sonner";

export const useWorkflowMutations = () => {
  const queryClient = useQueryClient();

  const createWorkflow = useMutation({
    mutationFn: async (input: CreateWorkflowInput) => {
      // First get the first stage of the template
      const { data: stages, error: stagesError } = await supabase
        .from("workflow_stages")
        .select("id")
        .eq("template_id", input.template_id)
        .order("order", { ascending: true })
        .limit(1);

      if (stagesError) throw stagesError;
      if (!stages || stages.length === 0) {
        throw new Error("Template has no stages");
      }

      const { data, error } = await supabase
        .from("workflows")
        .insert([
          {
            name: input.name,
            template_id: input.template_id,
            client_id: input.client_id,
            current_stage_id: stages[0].id,
            status: "active",
            period: input.period,
            period_start_date: input.period_start_date,
            period_end_date: input.period_end_date,
            service_type: input.service_type,
            due_date: input.due_date,
            assigned_to: input.assigned_to,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Job created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create job");
    },
  });

  const updateWorkflow = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("workflows")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Job updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update job");
    },
  });

  const deleteWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflows")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Job deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete job");
    },
  });

  const transitionWorkflowStage = useMutation({
    mutationFn: async (input: StageTransitionInput) => {
      const { data, error } = await supabase.rpc("transition_workflow_stage", {
        _workflow_id: input.workflow_id,
        _new_stage_id: input.new_stage_id,
        _notes: input.notes,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Job moved to new stage");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to move job");
    },
  });

  return {
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    transitionWorkflowStage,
  };
};
