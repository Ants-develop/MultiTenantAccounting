import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface WorkflowAnalytics {
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  overdue_jobs: number;
  by_stage: Array<{
    stage_id: string;
    stage_name: string;
    stage_color: string;
    count: number;
    avg_time_in_stage: number; // in days
  }>;
  by_service_type: Array<{
    service_type: string;
    count: number;
  }>;
  by_assignee: Array<{
    user_id: string;
    user_name: string;
    count: number;
  }>;
}

export const useWorkflowAnalytics = (templateId?: string) => {
  return useQuery({
    queryKey: ["workflow-analytics", templateId],
    queryFn: async () => {
      let query = supabase
        .from("workflows")
        .select(`
          id,
          status,
          due_date,
          service_type,
          current_stage_id,
          assigned_to,
          workflow_stages:current_stage_id(id, name, color),
          assigned_to_user:profiles!workflows_assigned_to_profiles_id_fk(id, full_name)
        `);

      if (templateId) {
        query = query.eq("template_id", templateId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const workflows = data || [];
      const now = new Date();

      // Calculate metrics
      const total_jobs = workflows.length;
      const active_jobs = workflows.filter((w) => w.status === "active").length;
      const completed_jobs = workflows.filter((w) => w.status === "completed").length;
      const overdue_jobs = workflows.filter(
        (w) =>
          w.status !== "completed" &&
          w.due_date &&
          new Date(w.due_date) < now
      ).length;

      // Group by stage
      const stageMap = new Map<string, { name: string; color: string; count: number }>();
      workflows.forEach((w: any) => {
        if (w.workflow_stages) {
          const stageId = w.current_stage_id;
          const existing = stageMap.get(stageId);
          if (existing) {
            existing.count++;
          } else {
            stageMap.set(stageId, {
              name: w.workflow_stages.name,
              color: w.workflow_stages.color,
              count: 1,
            });
          }
        }
      });

      const by_stage = Array.from(stageMap.entries()).map(([stage_id, data]) => ({
        stage_id,
        stage_name: data.name,
        stage_color: data.color,
        count: data.count,
        avg_time_in_stage: 0, // Would need stage history to calculate
      }));

      // Group by service type
      const serviceMap = new Map<string, number>();
      workflows.forEach((w: any) => {
        if (w.service_type) {
          serviceMap.set(w.service_type, (serviceMap.get(w.service_type) || 0) + 1);
        }
      });

      const by_service_type = Array.from(serviceMap.entries()).map(([service_type, count]) => ({
        service_type,
        count,
      }));

      // Group by assignee
      const assigneeMap = new Map<string, { name: string; count: number }>();
      workflows.forEach((w: any) => {
        if (w.assigned_to && w.assigned_to_user) {
          const userId = w.assigned_to;
          const existing = assigneeMap.get(userId);
          if (existing) {
            existing.count++;
          } else {
            assigneeMap.set(userId, {
              name: w.assigned_to_user.full_name,
              count: 1,
            });
          }
        }
      });

      const by_assignee = Array.from(assigneeMap.entries()).map(([user_id, data]) => ({
        user_id,
        user_name: data.name,
        count: data.count,
      }));

      return {
        total_jobs,
        active_jobs,
        completed_jobs,
        overdue_jobs,
        by_stage,
        by_service_type,
        by_assignee,
      } as WorkflowAnalytics;
    },
  });
};
