import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WorkflowStage } from "@/types/workflow";
import { useToast } from "@/hooks/use-toast";

export const useWorkflowStages = (templateId: string | undefined) => {
  return useQuery({
    queryKey: ["workflow-stages", templateId],
    queryFn: async () => {
      if (!templateId) throw new Error("Template ID is required");

      const { data, error } = await supabase
        .from("workflow_stages")
        .select("*")
        .eq("template_id", templateId)
        .order("order_position", { ascending: true });

      if (error) throw error;
      return data as WorkflowStage[];
    },
    enabled: !!templateId,
  });
};

export const useWorkflowStageMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createStage = useMutation({
    mutationFn: async (input: {
      template_id: string;
      name: string;
      description?: string;
      order_position: number;
      color?: string;
      automation_rules?: any;
    }) => {
      const { data, error } = await supabase
        .from("workflow_stages")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workflow-stages", variables.template_id],
      });
      queryClient.invalidateQueries({
        queryKey: ["workflow-template", variables.template_id],
      });
      toast({
        title: "Success",
        description: "Stage created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create stage: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        name?: string;
        description?: string;
        order_position?: number;
        color?: string;
        automation_rules?: any;
      };
    }) => {
      const { data, error } = await supabase
        .from("workflow_stages")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-stages"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-template"] });
      toast({
        title: "Success",
        description: "Stage updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update stage: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflow_stages")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-stages"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-template"] });
      toast({
        title: "Success",
        description: "Stage deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete stage: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const reorderStages = useMutation({
    mutationFn: async ({
      templateId,
      stageIds,
    }: {
      templateId: string;
      stageIds: string[];
    }) => {
      const updates = stageIds.map((id, index) =>
        supabase
          .from("workflow_stages")
          .update({ order_position: index })
          .eq("id", id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workflow-stages", variables.templateId],
      });
      toast({
        title: "Success",
        description: "Stages reordered successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reorder stages: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
  };
};
