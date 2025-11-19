import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useTemplateClients = (templateId: string | undefined) => {
  return useQuery({
    queryKey: ["template-clients", templateId],
    queryFn: async () => {
      if (!templateId) throw new Error("Template ID is required");
      
      const { data, error } = await supabase
        .from("workflow_template_clients")
        .select(`
          *,
          clients (id, name, status)
        `)
        .eq("template_id", templateId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!templateId,
  });
};

export const useTemplateClientMutations = () => {
  const queryClient = useQueryClient();

  const assignClients = useMutation({
    mutationFn: async ({ templateId, clientIds }: { templateId: string; clientIds: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const inserts = clientIds.map(clientId => ({
        template_id: templateId,
        client_id: clientId,
        assigned_by: user?.id,
      }));
      
      const { error } = await supabase
        .from("workflow_template_clients")
        .insert(inserts);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-clients"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast.success("Clients assigned successfully");
    },
    onError: (error) => {
      toast.error("Failed to assign clients: " + error.message);
    },
  });

  const unassignClient = useMutation({
    mutationFn: async ({ templateId, clientId }: { templateId: string; clientId: string }) => {
      const { error } = await supabase
        .from("workflow_template_clients")
        .delete()
        .eq("template_id", templateId)
        .eq("client_id", clientId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-clients"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast.success("Client unassigned successfully");
    },
    onError: (error) => {
      toast.error("Failed to unassign client: " + error.message);
    },
  });

  return { assignClients, unassignClient };
};
