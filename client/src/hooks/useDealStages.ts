import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DealStage } from "@/types/crm";

export function useDealStages() {
    return useQuery({
        queryKey: ["deal-stages"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("deal_stages")
                .select("*")
                .order("order", { ascending: true });

            if (error) throw error;
            return data as DealStage[];
        },
    });
}
