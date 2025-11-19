import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateWorkflowInput, UpdateWorkflowInput, StageTransitionInput } from "@/types/workflow";

export const useWorkflowMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createWorkflow = useMutation({
    mutationFn: async (input: CreateWorkflowInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Get template to find initial stage
      const { data: template, error: templateError } = await supabase
        .from("workflow_templates")
        .select("*, workflow_stages(*)")
        .eq("id", input.template_id)
        .single();

      if (templateError) throw templateError;

      const stages = template.workflow_stages || [];
      const initialStage = stages.sort((a: any, b: any) => a.order_position - b.order_position)[0];

      // Create workflow
      const { data: workflow, error: workflowError } = await supabase
        .from("workflows")
        .insert({
          ...input,
          current_stage_id: initialStage?.id,
          status: "active",
          started_at: new Date().toISOString(),
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create initial stage history entry
      if (initialStage) {
        const { error: historyError } = await supabase
          .from("workflow_stage_history")
          .insert({
            workflow_id: workflow.id,
            stage_id: initialStage.id,
            entered_at: new Date().toISOString(),
            entered_by: userData.user.id,
            notes: "Workflow created",
          });

        if (historyError) throw historyError;
      }

      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast({
        title: "Success",
        description: "Workflow created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create workflow: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateWorkflow = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateWorkflowInput;
    }) => {
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
      queryClient.invalidateQueries({ queryKey: ["workflow"] });
      toast({
        title: "Success",
        description: "Workflow updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update workflow: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflows").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast({
        title: "Success",
        description: "Workflow deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete workflow: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const transitionWorkflowStage = useMutation({
    mutationFn: async ({ workflow_id, new_stage_id, notes }: StageTransitionInput) => {
      const { data, error } = await supabase.rpc("transition_workflow_stage", {
        _workflow_id: workflow_id,
        _new_stage_id: new_stage_id,
        _notes: notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-stage-history"] });
      toast({
        title: "Success",
        description: "Stage transitioned successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to transition stage: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const completeWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("workflows")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow"] });
      toast({
        title: "Success",
        description: "Workflow completed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to complete workflow: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    transitionWorkflowStage,
    completeWorkflow,
  };
};
