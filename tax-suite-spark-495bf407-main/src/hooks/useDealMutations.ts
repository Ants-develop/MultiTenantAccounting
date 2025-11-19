import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CreateDealInput,
  UpdateDealInput,
  CreateActivityInput,
  CreateDealContactInput,
} from "@/types/crm";
import { useToast } from "@/hooks/use-toast";

export const useDealMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createDeal = useMutation({
    mutationFn: async (input: CreateDealInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("deals")
        .insert({
          ...input,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-metrics"] });
      toast({
        title: "Success",
        description: "Deal created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDeal = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateDealInput;
    }) => {
      const { data, error } = await supabase
        .from("deals")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-metrics"] });
      toast({
        title: "Success",
        description: "Deal updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
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
      queryClient.invalidateQueries({ queryKey: ["pipeline-metrics"] });
      toast({
        title: "Success",
        description: "Deal deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createActivity = useMutation({
    mutationFn: async (input: CreateActivityInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("deal_activities")
        .insert({
          ...input,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["deal-activities", variables.deal_id],
      });
      toast({
        title: "Success",
        description: "Activity added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createDealContact = useMutation({
    mutationFn: async (input: CreateDealContactInput) => {
      const { data, error } = await supabase
        .from("deal_contacts")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["deal-contacts", variables.deal_id],
      });
      toast({
        title: "Success",
        description: "Contact added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDealContact = useMutation({
    mutationFn: async ({
      id,
      dealId,
      updates,
    }: {
      id: string;
      dealId: string;
      updates: {
        name?: string;
        email?: string;
        phone?: string;
        role?: string;
        is_primary?: boolean;
      };
    }) => {
      const { data, error } = await supabase
        .from("deal_contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, dealId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["deal-contacts", result.dealId],
      });
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDealContact = useMutation({
    mutationFn: async ({ id, dealId }: { id: string; dealId: string }) => {
      const { error } = await supabase
        .from("deal_contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return dealId;
    },
    onSuccess: (dealId) => {
      queryClient.invalidateQueries({
        queryKey: ["deal-contacts", dealId],
      });
      toast({
        title: "Success",
        description: "Contact removed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createDeal,
    updateDeal,
    deleteDeal,
    createActivity,
    createDealContact,
    updateDealContact,
    deleteDealContact,
  };
};
