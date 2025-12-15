import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface CreateTemplateInput {
  name: string;
  description: string;
  type: string;
  estimated_duration_days?: number;
}

interface UpdateTemplateInput {
  id: string;
  name?: string;
  description?: string;
  type?: string;
  estimated_duration_days?: number;
  is_active?: boolean;
}

export const useWorkflowTemplateMutations = () => {
  const queryClient = useQueryClient();

  const createTemplate = useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const { data, error } = await supabase
        .from("workflow_templates")
        .insert([
          {
            name: input.name,
            description: input.description,
            type: input.type,
            estimated_duration_days: input.estimated_duration_days,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTemplateInput) => {
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
      toast.success("Template updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update template");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflow_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast.success("Template deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete template");
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      // Fetch original template
      const { data: original, error: fetchError } = await supabase
        .from("workflow_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (fetchError) throw fetchError;

      // Create duplicate
      const { data: duplicate, error: createError } = await supabase
        .from("workflow_templates")
        .insert([
          {
            name: `${original.name} (Copy)`,
            description: original.description,
            type: original.type,
            estimated_duration_days: original.estimated_duration_days,
            is_active: false,
          },
        ])
        .select()
        .single();

      if (createError) throw createError;

      // Fetch and duplicate stages
      const { data: stages, error: stagesError } = await supabase
        .from("workflow_stages")
        .select("*")
        .eq("template_id", templateId)
        .order("order", { ascending: true });

      if (stagesError) throw stagesError;

      if (stages && stages.length > 0) {
        const newStages = stages.map((stage) => ({
          template_id: duplicate.id,
          name: stage.name,
          description: stage.description,
          color: stage.color,
          order: stage.order,
          automation_config: stage.automation_config,
        }));

        const { error: insertStagesError } = await supabase
          .from("workflow_stages")
          .insert(newStages);

        if (insertStagesError) throw insertStagesError;
      }

      return duplicate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast.success("Template duplicated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to duplicate template");
    },
  });

  return {
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
  };
};
