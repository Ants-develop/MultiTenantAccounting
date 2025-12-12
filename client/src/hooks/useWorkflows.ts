import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { WorkflowWithDetails, WorkflowFilters } from "@/types/workflow";

export const useWorkflows = (filters?: WorkflowFilters) => {
  const queryKey = ["workflows", filters];

  return useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from("workflows")
        .select(`
          *,
          clients:client_id(id, name),
          workflow_stages:current_stage_id(id, name, color),
          assigned_to_user:assigned_to(full_name, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (filters?.template_id) {
        query = query.eq("template_id", filters.template_id);
      }

      if (filters?.client_id) {
        query = query.eq("client_id", filters.client_id);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.service_type) {
        query = query.eq("service_type", filters.service_type);
      }

      if (filters?.assigned_to) {
        query = query.eq("assigned_to", filters.assigned_to);
      }

      if (filters?.current_stage_id) {
        query = query.eq("current_stage_id", filters.current_stage_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Client-side search filter
      let workflows = (data || []) as unknown as WorkflowWithDetails[];

      workflows = (workflows as any[]).map((w) => {
        const u = w.assigned_to_user;
        if (!u) return w;
        const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || "User";
        return {
          ...w,
          assigned_to_user: { full_name: fullName, avatar_url: null },
        };
      }) as WorkflowWithDetails[];
      
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        workflows = workflows.filter((w) =>
          w.name.toLowerCase().includes(searchLower) ||
          w.clients?.name?.toLowerCase().includes(searchLower)
        );
      }

      return workflows;
    },
  });
};

export const useWorkflow = (workflowId?: string) => {
  return useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: async () => {
      if (!workflowId) return null;

      const { data, error } = await supabase
        .from("workflows")
        .select(`
          *,
          clients:client_id(id, name),
          workflow_stages:current_stage_id(id, name, color),
          assigned_to_user:assigned_to(full_name, avatar_url)
        `)
        .eq("id", workflowId)
        .single();

      if (error) throw error;
      return data as WorkflowWithDetails;
    },
    enabled: !!workflowId,
  });
};
