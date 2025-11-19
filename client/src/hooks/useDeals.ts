import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Deal, DealFilters } from "@/types/crm";

// Mock deals data
const mockDeals: Deal[] = [
    {
        id: "1",
        name: "Acme Corp - Tax Services",
        description: "Annual tax filing services for Acme Corporation",
        stage_id: "2",
        deal_value: 50000,
        currency: "USD",
        expected_close_date: "2025-02-15",
        actual_close_date: null,
        probability: 25,
        client_id: null,
        contact_name: "Sarah Johnson",
        contact_email: "sarah@acme.com",
        contact_phone: "(555) 123-4567",
        company_name: "Acme Corporation",
        owner_id: "1",
        lead_source: "Referral",
        status: "open",
        lost_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: "1",
    },
    {
        id: "2",
        name: "Tech Startup - CFO Services",
        description: "Fractional CFO services package",
        stage_id: "3",
        deal_value: 120000,
        currency: "USD",
        expected_close_date: "2025-03-01",
        actual_close_date: null,
        probability: 50,
        client_id: null,
        contact_name: "Mike Chen",
        contact_email: "mike@techstartup.io",
        contact_phone: "(555) 987-6543",
        company_name: "Tech Startup Inc",
        owner_id: "2",
        lead_source: "Website",
        status: "open",
        lost_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: "1",
    },
    {
        id: "3",
        name: "Restaurant Group - Bookkeeping",
        description: "Monthly bookkeeping for 3 locations",
        stage_id: "4",
        deal_value: 36000,
        currency: "USD",
        expected_close_date: "2025-01-30",
        actual_close_date: null,
        probability: 75,
        client_id: null,
        contact_name: "Lisa Martinez",
        contact_email: "lisa@restaurantgroup.com",
        contact_phone: "(555) 456-7890",
        company_name: "Martinez Restaurant Group",
        owner_id: "1",
        lead_source: "Cold Call",
        status: "open",
        lost_reason: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: "2",
    },
];

export function useDeals(filters?: DealFilters) {
    return useQuery({
        queryKey: ["deals", filters],
        queryFn: async () => {
            // TODO: Replace with actual API call
            // const params = new URLSearchParams(filters as any);
            // const response = await fetch(`/api/crm/deals?${params}`);
            // return await response.json();

            // Simple client-side filtering for mock data
            let filtered = [...mockDeals];

            if (filters?.search) {
                const search = filters.search.toLowerCase();
                filtered = filtered.filter(deal =>
                    deal.name.toLowerCase().includes(search) ||
                    deal.contact_name.toLowerCase().includes(search) ||
                    deal.company_name?.toLowerCase().includes(search)
                );
            }

            if (filters?.stage_id) {
                filtered = filtered.filter(deal => deal.stage_id === filters.stage_id);
            }

            if (filters?.owner_id) {
                filtered = filtered.filter(deal => deal.owner_id === filters.owner_id);
            }

            if (filters?.status) {
                filtered = filtered.filter(deal => deal.status === filters.status);
            }

            return filtered;
        },
    });
}

export function useDeal(id: string) {
    return useQuery({
        queryKey: ["deal", id],
        queryFn: async () => {
            // TODO: Replace with actual API call
            // const response = await fetch(`/api/crm/deals/${id}`);
            // return await response.json();
            return mockDeals.find(d => d.id === id) || null;
        },
        enabled: !!id,
    });
}

export function useDealMutations() {
    const queryClient = useQueryClient();

    const createDeal = useMutation({
        mutationFn: async (data: any) => {
            // TODO: Replace with actual API call
            // const response = await fetch("/api/crm/deals", {
            //   method: "POST",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify(data),
            // });
            // return await response.json();
            console.log("Create deal:", data);
            return { id: Date.now().toString(), ...data };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deals"] });
            queryClient.invalidateQueries({ queryKey: ["pipeline-metrics"] });
        },
    });

    const updateDeal = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            // TODO: Replace with actual API call
            // const response = await fetch(`/api/crm/deals/${id}`, {
            //   method: "PATCH",
            //   headers: { "Content-Type": "application/json" },
            //   body: JSON.stringify(data),
            // });
            // return await response.json();
            console.log("Update deal:", id, data);
            return { id, ...data };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deals"] });
            queryClient.invalidateQueries({ queryKey: ["deal"] });
            queryClient.invalidateQueries({ queryKey: ["pipeline-metrics"] });
        },
    });

    const deleteDeal = useMutation({
        mutationFn: async (id: string) => {
            // TODO: Replace with actual API call
            // await fetch(`/api/crm/deals/${id}`, { method: "DELETE" });
            console.log("Delete deal:", id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deals"] });
            queryClient.invalidateQueries({ queryKey: ["pipeline-metrics"] });
        },
    });

    return { createDeal, updateDeal, deleteDeal };
}
