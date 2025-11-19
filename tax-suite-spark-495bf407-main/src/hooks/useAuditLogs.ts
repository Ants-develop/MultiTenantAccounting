import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuditLog, AuditLogFilters, AuditLogPagination } from "@/types/auditLog";

export const useAuditLogs = (
  filters: AuditLogFilters,
  pagination: AuditLogPagination
) => {
  return useQuery({
    queryKey: ["audit-logs", filters, pagination],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" });

      // Apply filters
      if (filters.user_id) {
        query = query.eq("user_id", filters.user_id);
      }
      if (filters.action) {
        query = query.eq("action", filters.action);
      }
      if (filters.entity_type) {
        query = query.eq("entity_type", filters.entity_type);
      }
      if (filters.search) {
        query = query.or(
          `entity_name.ilike.%${filters.search}%,changes_summary.ilike.%${filters.search}%`
        );
      }
      if (filters.from_date) {
        query = query.gte("created_at", filters.from_date);
      }
      if (filters.to_date) {
        query = query.lte("created_at", filters.to_date);
      }

      // Apply pagination and sorting
      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;

      query = query
        .order(pagination.sortBy, { ascending: pagination.sortOrder === "asc" })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        logs: data as AuditLog[],
        total: count || 0,
      };
    },
  });
};

export const useAuditLogStats = () => {
  return useQuery({
    queryKey: ["audit-log-stats"],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from("audit_logs")
        .select("action, entity_type, created_at");

      if (error) throw error;

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      return {
        total: logs.length,
        last24h: logs.filter((l) => new Date(l.created_at) > last24h).length,
        last7d: logs.filter((l) => new Date(l.created_at) > last7d).length,
        last30d: logs.filter((l) => new Date(l.created_at) > last30d).length,
        byAction: logs.reduce((acc, log) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byEntity: logs.reduce((acc, log) => {
          acc[log.entity_type] = (acc[log.entity_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
    },
  });
};
