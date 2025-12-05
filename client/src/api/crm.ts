import { Deal, DealStage, DealFilters, CreateDealInput, UpdateDealInput, DealActivity, CreateActivityInput, PipelineMetrics } from "@/types/crm";

const API_BASE = "/api/crm";

// Deals API
export const dealsApi = {
    fetchDeals: async (filters?: DealFilters): Promise<Deal[]> => {
        const params = new URLSearchParams();
        if (filters) {
            if (filters.owner_id) params.append("owner_id", filters.owner_id);
            if (filters.stage_id) params.append("stage_id", filters.stage_id);
            if (filters.status) params.append("status", filters.status);
            if (filters.search) params.append("search", filters.search);
            if (filters.min_value) params.append("min_value", filters.min_value.toString());
            if (filters.max_value) params.append("max_value", filters.max_value.toString());
            if (filters.lead_source) params.append("lead_source", filters.lead_source);
            if (filters.from_date) params.append("from_date", filters.from_date);
            if (filters.to_date) params.append("to_date", filters.to_date);
        }
        const url = `${API_BASE}/deals${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch deals");
        return res.json();
    },

    fetchDeal: async (id: string): Promise<Deal> => {
        const res = await fetch(`${API_BASE}/deals/${id}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch deal");
        return res.json();
    },

    createDeal: async (data: CreateDealInput): Promise<Deal> => {
        const res = await fetch(`${API_BASE}/deals`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to create deal");
        return res.json();
    },

    updateDeal: async (id: string, data: UpdateDealInput): Promise<Deal> => {
        const res = await fetch(`${API_BASE}/deals/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update deal");
        return res.json();
    },

    deleteDeal: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/deals/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to delete deal");
    },
};

// Deal Stages API
export const dealStagesApi = {
    fetchStages: async (): Promise<DealStage[]> => {
        const res = await fetch(`${API_BASE}/stages`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch deal stages");
        return res.json();
    },

    createStage: async (data: Partial<DealStage>): Promise<DealStage> => {
        const res = await fetch(`${API_BASE}/stages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to create stage");
        return res.json();
    },

    updateStage: async (id: string, data: Partial<DealStage>): Promise<DealStage> => {
        const res = await fetch(`${API_BASE}/stages/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update stage");
        return res.json();
    },

    deleteStage: async (id: string): Promise<void> => {
        const res = await fetch(`${API_BASE}/stages/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to delete stage");
    },
};

// Deal Activities API
export const dealActivitiesApi = {
    fetchActivities: async (dealId: string): Promise<DealActivity[]> => {
        const res = await fetch(`${API_BASE}/deals/${dealId}/activities`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch activities");
        return res.json();
    },

    createActivity: async (data: CreateActivityInput): Promise<DealActivity> => {
        const res = await fetch(`${API_BASE}/deals/${data.deal_id}/activities`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to create activity");
        return res.json();
    },
};

// Pipeline Metrics API
export const pipelineMetricsApi = {
    fetchMetrics: async (): Promise<PipelineMetrics> => {
        const res = await fetch(`${API_BASE}/metrics`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch pipeline metrics");
        return res.json();
    },
};
