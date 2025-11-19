import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WorkflowAnalytics, WorkflowFilters } from "@/types/workflow";

export const useWorkflowAnalytics = (filters?: WorkflowFilters) => {
  return useQuery({
    queryKey: ["workflow-analytics", filters],
    queryFn: async () => {
      // Fetch all workflows matching filters
      let queryBuilder = supabase.from("workflows").select(`
        id,
        status,
        service_type,
        current_stage_id,
        started_at,
        completed_at,
        due_date,
        workflow_stages!workflows_current_stage_id_fkey (
          name
        )
      `);

      if (filters?.client_id) {
        queryBuilder = queryBuilder.eq("client_id", filters.client_id);
      }
      if (filters?.period) {
        queryBuilder = queryBuilder.eq("period", filters.period);
      }
      if (filters?.service_type) {
        queryBuilder = queryBuilder.eq("service_type", filters.service_type);
      }

      const { data: workflows, error } = await queryBuilder;
      if (error) throw error;

      // Calculate analytics
      const total_jobs = workflows.length;
      const completed_jobs = workflows.filter((w) => w.status === "completed").length;
      const in_progress_jobs = workflows.filter((w) => w.status === "active").length;

      // Overdue jobs
      const now = new Date();
      const overdue_jobs = workflows.filter(
        (w) => w.due_date && new Date(w.due_date) < now && w.status !== "completed"
      ).length;

      // Average completion time
      const completedWithDates = workflows.filter(
        (w) => w.completed_at && w.started_at
      );
      const avg_completion_days =
        completedWithDates.length > 0
          ? completedWithDates.reduce((sum, w) => {
              const start = new Date(w.started_at!);
              const end = new Date(w.completed_at!);
              const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
              return sum + days;
            }, 0) / completedWithDates.length
          : 0;

      const completion_rate = total_jobs > 0 ? (completed_jobs / total_jobs) * 100 : 0;

      // Jobs by stage
      const stageMap = new Map<string, number>();
      workflows.forEach((w) => {
        const stageName = (w.workflow_stages as any)?.name || "Unknown";
        stageMap.set(stageName, (stageMap.get(stageName) || 0) + 1);
      });
      const jobs_by_stage = Array.from(stageMap.entries()).map(([stage_name, count]) => ({
        stage_name,
        count,
      }));

      // Jobs by service type
      const serviceMap = new Map<string, number>();
      workflows.forEach((w) => {
        if (w.service_type) {
          serviceMap.set(w.service_type, (serviceMap.get(w.service_type) || 0) + 1);
        }
      });
      const jobs_by_service_type = Array.from(serviceMap.entries()).map(
        ([service_type, count]) => ({ service_type, count })
      );

      // Bottleneck stages (fetch stage history for duration analysis)
      const { data: stageHistory } = await supabase
        .from("workflow_stage_history")
        .select(`
          stage_id,
          duration_minutes,
          workflow_stages (name)
        `)
        .not("duration_minutes", "is", null);

      const stageDurationMap = new Map<string, { total: number; count: number }>();
      stageHistory?.forEach((h) => {
        const stageName = (h.workflow_stages as any)?.name || "Unknown";
        const existing = stageDurationMap.get(stageName) || { total: 0, count: 0 };
        stageDurationMap.set(stageName, {
          total: existing.total + (h.duration_minutes || 0),
          count: existing.count + 1,
        });
      });

      const bottleneck_stages = Array.from(stageDurationMap.entries())
        .map(([stage_name, stats]) => ({
          stage_name,
          avg_duration_days: stats.total / stats.count / (60 * 24),
        }))
        .sort((a, b) => b.avg_duration_days - a.avg_duration_days)
        .slice(0, 5);

      return {
        total_jobs,
        completed_jobs,
        in_progress_jobs,
        overdue_jobs,
        avg_completion_days: Math.round(avg_completion_days * 10) / 10,
        completion_rate: Math.round(completion_rate * 10) / 10,
        jobs_by_stage,
        jobs_by_service_type,
        bottleneck_stages,
      } as WorkflowAnalytics;
    },
  });
};
