import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DealContact } from "@/types/crm";
import { useEffect } from "react";

export const useDealContacts = (dealId: string | undefined) => {
  const query = useQuery({
    queryKey: ["deal-contacts", dealId],
    queryFn: async () => {
      if (!dealId) throw new Error("Deal ID is required");

      const { data, error } = await supabase
        .from("deal_contacts")
        .select("*")
        .eq("deal_id", dealId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as DealContact[];
    },
    enabled: !!dealId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!dealId) return;

    const channel = supabase
      .channel(`deal-contacts-${dealId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deal_contacts",
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
