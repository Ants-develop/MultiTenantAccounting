import { useQuery } from "@tanstack/react-query";
import { PipelineMetrics } from "@/types/crm";

// Mock data - replace with actual API call later
const mockMetrics: PipelineMetrics = {
    total_deals: 45,
    total_value: 1250000,
    open_deals: 23,
    open_value: 850000,
    won_deals: 15,
    won_value: 320000,
    lost_deals: 7,
    lost_value: 80000,
    average_deal_size: 27777,
    win_rate: 68.2,
    expected_revenue: 595000,
    value_by_stage: [],
    deals_by_owner: [],
};

export function usePipelineMetrics() {
    return useQuery({
        queryKey: ["pipeline-metrics"],
        queryFn: async () => {
            // TODO: Replace with actual API call
            // const response = await fetch("/api/crm/metrics");
            // return await response.json();
            return mockMetrics;
        },
    });
}
