import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DealActivity } from "@/types/crm";
import { useEffect } from "react";

export const useDealActivities = (dealId: string | undefined) => {
  const query = useQuery({
    queryKey: ["deal-activities", dealId],
    queryFn: async () => {
      if (!dealId) throw new Error("Deal ID is required");

      const { data, error } = await supabase
        .from("deal_activities")
        .select(`
          *,
          profiles:created_by (
            full_name,
            avatar_url
          ),
          old_stage:old_stage_id (
            id,
            name,
            color
          ),
          new_stage:new_stage_id (
            id,
            name,
            color
          )
        `)
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DealActivity[];
    },
    enabled: !!dealId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!dealId) return;

    const channel = supabase
      .channel(`deal-activities-${dealId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deal_activities",
          filter: `deal_id=eq.${dealId}`,
        },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealId, query]);

  return query;
};
