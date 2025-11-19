import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateClientServiceInput, UpdateClientServiceInput } from "@/types/workflow";
import { generatePeriodsForRange, getPeriodRange } from "@/utils/periodUtils";

export const useClientServiceMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const subscribeClientToService = useMutation({
    mutationFn: async (input: CreateClientServiceInput) => {
      const { data, error } = await supabase
        .from("client_services")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-services"] });
      toast({
        title: "Success",
        description: "Service subscription created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create subscription: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updateClientService = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateClientServiceInput;
    }) => {
      const { data, error } = await supabase
        .from("client_services")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-services"] });
      toast({
        title: "Success",
        description: "Service subscription updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update subscription: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deactivateClientService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_services")
        .update({ is_active: false, end_date: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-services"] });
      toast({
        title: "Success",
        description: "Service subscription deactivated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to deactivate subscription: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const autoCreateJobsForService = useMutation({
    mutationFn: async ({
      serviceId,
      startDate,
      endDate,
    }: {
      serviceId: string;
      startDate: Date;
      endDate: Date;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Fetch service details
      const { data: service, error: serviceError } = await supabase
        .from("client_services")
        .select("*, workflow_templates(*)")
        .eq("id", serviceId)
        .single();

      if (serviceError) throw serviceError;
      if (!service.frequency) throw new Error("Service frequency not set");

      // Get template stages
      const { data: stages, error: stagesError } = await supabase
        .from("workflow_stages")
        .select("*")
        .eq("template_id", service.workflow_template_id)
        .order("order_position", { ascending: true });

      if (stagesError) throw stagesError;
      const initialStage = stages[0];

      // Generate periods
      const periods = generatePeriodsForRange(
        startDate,
        endDate,
        service.frequency as any
      );

      // Create workflows for each period
      const workflows = periods.map((period) => {
        const { start_date, end_date: period_end } = getPeriodRange(period);
        return {
          name: `${service.workflow_templates?.name} - ${period}`,
          template_id: service.workflow_template_id,
          client_id: service.client_id,
          period,
          period_start_date: start_date.toISOString(),
          period_end_date: period_end.toISOString(),
          service_type: service.service_type,
          assigned_to: service.assigned_to,
          current_stage_id: initialStage?.id,
          status: "active",
          started_at: new Date().toISOString(),
          created_by: userData.user.id,
        };
      });

      const { data: createdWorkflows, error: workflowsError } = await supabase
        .from("workflows")
        .insert(workflows)
        .select();

      if (workflowsError) throw workflowsError;

      // Create initial stage history for each workflow
      if (initialStage && createdWorkflows) {
        const historyEntries = createdWorkflows.map((wf) => ({
          workflow_id: wf.id,
          stage_id: initialStage.id,
          entered_at: new Date().toISOString(),
          entered_by: userData.user.id,
          notes: "Auto-created from service subscription",
        }));

        const { error: historyError } = await supabase
          .from("workflow_stage_history")
          .insert(historyEntries);

        if (historyError) throw historyError;
      }

      return createdWorkflows;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast({
        title: "Success",
        description: `${data?.length || 0} jobs created successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create jobs: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    subscribeClientToService,
    updateClientService,
    deactivateClientService,
    autoCreateJobsForService,
  };
};
