import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PipelineMetrics } from "@/types/crm";

export const usePipelineMetrics = () => {
  return useQuery({
    queryKey: ["pipeline-metrics"],
    queryFn: async () => {
      // Fetch all deals with stages and owners
      const { data: deals, error } = await supabase
        .from("deals")
        .select(`
          *,
          deal_stages (
            id,
            name,
            order_position
          ),
          profiles:owner_id (
            id,
            full_name
          )
        `);

      if (error) throw error;

      // Calculate metrics
      const total_deals = deals.length;
      const total_value = deals.reduce(
        (sum, deal) => sum + (deal.deal_value || 0),
        0
      );

      const open_deals = deals.filter((d) => d.status === "open").length;
      const open_value = deals
        .filter((d) => d.status === "open")
        .reduce((sum, deal) => sum + (deal.deal_value || 0), 0);

      const won_deals = deals.filter((d) => d.status === "won").length;
      const won_value = deals
        .filter((d) => d.status === "won")
        .reduce((sum, deal) => sum + (deal.deal_value || 0), 0);

      const lost_deals = deals.filter((d) => d.status === "lost").length;
      const lost_value = deals
        .filter((d) => d.status === "lost")
        .reduce((sum, deal) => sum + (deal.deal_value || 0), 0);

      const closed_deals = won_deals + lost_deals;
      const win_rate = closed_deals > 0 ? (won_deals / closed_deals) * 100 : 0;

      const average_deal_size = total_deals > 0 ? total_value / total_deals : 0;

      const expected_revenue = deals
        .filter((d) => d.status === "open")
        .reduce(
          (sum, deal) =>
            sum + (deal.deal_value || 0) * (deal.probability / 100),
          0
        );

      // Value by stage
      const stageMap = new Map<string, { name: string; count: number; value: number }>();
      deals.forEach((deal) => {
        if (deal.status === "open" && deal.deal_stages) {
          const stageId = deal.stage_id;
          const existing = stageMap.get(stageId) || {
            name: deal.deal_stages.name,
            count: 0,
            value: 0,
          };
          stageMap.set(stageId, {
            name: existing.name,
            count: existing.count + 1,
            value: existing.value + (deal.deal_value || 0),
          });
        }
      });

      const value_by_stage = Array.from(stageMap.entries()).map(
        ([stage_id, data]) => ({
          stage_id,
          stage_name: data.name,
          count: data.count,
          total_value: data.value,
        })
      );

      // Deals by owner
      const ownerMap = new Map<string, { name: string; count: number; value: number }>();
      deals.forEach((deal) => {
        if (deal.profiles) {
          const ownerId = deal.owner_id;
          const existing = ownerMap.get(ownerId) || {
            name: deal.profiles.full_name,
            count: 0,
            value: 0,
          };
          ownerMap.set(ownerId, {
            name: existing.name,
            count: existing.count + 1,
            value: existing.value + (deal.deal_value || 0),
          });
        }
      });

      const deals_by_owner = Array.from(ownerMap.entries()).map(
        ([owner_id, data]) => ({
          owner_id,
          owner_name: data.name,
          count: data.count,
          total_value: data.value,
        })
      );

      const metrics: PipelineMetrics = {
        total_deals,
        total_value,
        open_deals,
        open_value,
        won_deals,
        won_value,
        lost_deals,
        lost_value,
        average_deal_size,
        win_rate,
        expected_revenue,
        value_by_stage,
        deals_by_owner,
      };

      return metrics;
    },
  });
};
