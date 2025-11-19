import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Deal, DealFilters } from "@/types/crm";
import { useEffect } from "react";

export const useDeals = (filters?: DealFilters) => {
  const query = useQuery({
    queryKey: ["deals", filters],
    queryFn: async () => {
      let query = supabase
        .from("deals")
        .select(`
          *,
          deal_stages (
            id,
            name,
            color,
            order_position,
            is_closed,
            is_won,
            probability
          ),
          profiles:owner_id (
            full_name,
            avatar_url
          ),
          clients (
            name
          )
        `)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters?.owner_id) {
        query = query.eq("owner_id", filters.owner_id);
      }
      if (filters?.stage_id) {
        query = query.eq("stage_id", filters.stage_id);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.min_value) {
        query = query.gte("deal_value", filters.min_value);
      }
      if (filters?.max_value) {
        query = query.lte("deal_value", filters.max_value);
      }
      if (filters?.lead_source) {
        query = query.eq("lead_source", filters.lead_source);
      }
      if (filters?.from_date) {
        query = query.gte("expected_close_date", filters.from_date);
      }
      if (filters?.to_date) {
        query = query.lte("expected_close_date", filters.to_date);
      }
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Deal[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("deals-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deals",
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

export const useDeal = (dealId: string | undefined) => {
  return useQuery({
    queryKey: ["deal", dealId],
    queryFn: async () => {
      if (!dealId) throw new Error("Deal ID is required");

      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          deal_stages (
            id,
            name,
            description,
            color,
            order_position,
            is_closed,
            is_won,
            probability
          ),
          profiles:owner_id (
            full_name,
            avatar_url,
            email
          ),
          clients (
            id,
            name,
            email,
            phone
          )
        `)
        .eq("id", dealId)
        .single();

      if (error) throw error;
      return data as Deal;
    },
    enabled: !!dealId,
  });
};
