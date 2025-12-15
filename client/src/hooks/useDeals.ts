import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Deal } from "@/types/crm";

export interface DealFilters {
  search?: string;
  stage_id?: string;
  owner_id?: string;
  status?: string;
}

export const useDeals = (filters?: DealFilters) => {
  return useQuery({
    queryKey: ["deals", filters],
    queryFn: async () => {
      let query = supabase
        .from("deals")
        .select(`
          *,
          owner:profiles!deals_owner_id_profiles_id_fk(full_name, avatar_url),
          stage:deal_stages!deals_stage_id_deal_stages_id_fk(name, color)
        `)
        .order("created_at", { ascending: false });

      if (filters?.stage_id) {
        query = query.eq("stage_id", filters.stage_id);
      }

      if (filters?.owner_id) {
        query = query.eq("owner_id", filters.owner_id);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      let deals = (data || []) as Deal[];

      // Data is already in the correct format from profiles table
      if (filters?.search) {
        const lower = filters.search.toLowerCase();
        deals = deals.filter(
          (d) =>
            d.name.toLowerCase().includes(lower) ||
            d.company_name?.toLowerCase().includes(lower) ||
            d.contact_name.toLowerCase().includes(lower)
        );
      }

      return deals;
    },
  });
};

export const useDealMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createDeal = useMutation({
    mutationFn: async (newDeal: Partial<Deal>) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("deals")
        .insert({
          ...newDeal,
          created_by: user.id,
          owner_id: newDeal.owner_id || user.id, // Default to current user if not specified
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast({
        title: "Deal created",
        description: "The deal has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating deal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDeal = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Deal> & { id: string }) => {
      const { data, error } = await supabase
        .from("deals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast({
        title: "Deal updated",
        description: "The deal has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating deal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDeal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast({
        title: "Deal deleted",
        description: "The deal has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting deal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createDeal,
    updateDeal,
    deleteDeal,
  };
};
