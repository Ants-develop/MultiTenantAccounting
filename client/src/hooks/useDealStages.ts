import { useQuery } from "@tanstack/react-query";
import { DealStage } from "@/types/crm";

// Mock data - replace with actual API call later
const mockStages: DealStage[] = [
    {
        id: "1",
        name: "Lead",
        description: "Initial contact",
        color: "#94a3b8",
        order_position: 1,
        is_closed: false,
        is_won: false,
        probability: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "2",
        name: "Qualified",
        description: "Qualified opportunity",
        color: "#60a5fa",
        order_position: 2,
        is_closed: false,
        is_won: false,
        probability: 25,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "3",
        name: "Proposal",
        description: "Proposal sent",
        color: "#a78bfa",
        order_position: 3,
        is_closed: false,
        is_won: false,
        probability: 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "4",
        name: "Negotiation",
        description: "In negotiation",
        color: "#fb923c",
        order_position: 4,
        is_closed: false,
        is_won: false,
        probability: 75,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "5",
        name: "Closed Won",
        description: "Deal won",
        color: "#34d399",
        order_position: 5,
        is_closed: true,
        is_won: true,
        probability: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

export function useDealStages() {
    return useQuery({
        queryKey: ["deal-stages"],
        queryFn: async () => {
            // TODO: Replace with actual API call
            // const response = await fetch("/api/crm/stages");
            // return await response.json();
            return mockStages;
        },
    });
}
