import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useWorkflowTemplateMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createTemplate = useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      type: string;
      estimated_duration_days?: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("workflow_templates")
        .insert({
          ...input,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast({
        title: "Success",
        description: "Workflow template created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        name?: string;
        description?: string;
        type?: string;
        estimated_duration_days?: number;
        is_active?: boolean;
      };
    }) => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast({
        title: "Success",
        description: "Workflow template updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflow_templates")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast({
        title: "Success",
        description: "Workflow template deactivated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to deactivate template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Fetch original template with stages
      const { data: original, error: fetchError } = await supabase
        .from("workflow_templates")
        .select("*, workflow_stages(*)")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Create new template
      const { data: newTemplate, error: createError } = await supabase
        .from("workflow_templates")
        .insert({
          name: `${original.name} (Copy)`,
          description: original.description,
          type: original.type,
          estimated_duration_days: original.estimated_duration_days,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Copy stages if they exist
      if (original.workflow_stages && original.workflow_stages.length > 0) {
        const stages = original.workflow_stages.map((stage: any) => ({
          template_id: newTemplate.id,
          name: stage.name,
          description: stage.description,
          order_position: stage.order_position,
          color: stage.color,
          automation_rules: stage.automation_rules,
        }));

        const { error: stagesError } = await supabase
          .from("workflow_stages")
          .insert(stages);

        if (stagesError) throw stagesError;
      }

      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast({
        title: "Success",
        description: "Workflow template duplicated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to duplicate template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
  };
};
