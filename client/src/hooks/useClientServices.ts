import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface ClientService {
  id: string;
  client_id: string;
  template_id: string;
  service_type: string;
  recurrence_type: string; // monthly, quarterly, yearly
  is_active: boolean;
  start_date: string;
  end_date?: string;
  assigned_to?: string;
  clients?: {
    id: string;
    name: string;
  };
  workflow_templates?: {
    id: string;
    name: string;
  };
}

export const useClientServices = (clientId?: string) => {
  return useQuery({
    queryKey: ["client-services", clientId],
    queryFn: async () => {
      let query = supabase
        .from("client_services")
        .select(`
          *,
          clients:client_id(id, name),
          workflow_templates:template_id(id, name)
        `)
        .order("created_at", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as ClientService[];
    },
  });
};

export const useActiveClientServices = () => {
  return useQuery({
    queryKey: ["active-client-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_services")
        .select(`
          *,
          clients:client_id(id, name),
          workflow_templates:template_id(id, name)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ClientService[];
    },
  });
};
