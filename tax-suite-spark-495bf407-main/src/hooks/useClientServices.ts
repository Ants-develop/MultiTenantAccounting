import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClientServiceWithTemplate } from "@/types/workflow";
import { useEffect } from "react";

export const useClientServices = (clientId?: string) => {
  const query = useQuery({
    queryKey: ["client-services", clientId],
    queryFn: async () => {
      let queryBuilder = supabase
        .from("client_services")
        .select(`
          *,
          workflow_templates (
            id,
            name,
            type,
            estimated_duration_days
          ),
          clients (
            id,
            name
          ),
          assigned_to_user:profiles!client_services_assigned_to_fkey (
            full_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });

      if (clientId) {
        queryBuilder = queryBuilder.eq("client_id", clientId);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data as ClientServiceWithTemplate[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("client-services-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_services",
        },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query]);

  return query;
};

export const useClientService = (id: string | undefined) => {
  return useQuery({
    queryKey: ["client-service", id],
    queryFn: async () => {
      if (!id) throw new Error("Client service ID is required");

      const { data, error } = await supabase
        .from("client_services")
        .select(`
          *,
          workflow_templates (*),
          clients (*),
          assigned_to_user:profiles!client_services_assigned_to_fkey (
            full_name,
            avatar_url,
            email
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as ClientServiceWithTemplate;
    },
    enabled: !!id,
  });
};
