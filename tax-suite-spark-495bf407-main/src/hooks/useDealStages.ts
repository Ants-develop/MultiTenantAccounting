import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DealStage } from "@/types/crm";
import { useEffect } from "react";

export const useDealStages = () => {
  const query = useQuery({
    queryKey: ["deal-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_stages")
        .select("*")
        .order("order_position", { ascending: true });

      if (error) throw error;
      return data as DealStage[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes as stages rarely change
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("deal-stages-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deal_stages",
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

export const useDealStage = (stageId: string | undefined) => {
  return useQuery({
    queryKey: ["deal-stage", stageId],
    queryFn: async () => {
      if (!stageId) throw new Error("Stage ID is required");

      const { data, error } = await supabase
        .from("deal_stages")
        .select("*")
        .eq("id", stageId)
        .single();

      if (error) throw error;
      return data as DealStage;
    },
    enabled: !!stageId,
    staleTime: 1000 * 60 * 5,
  });
};
