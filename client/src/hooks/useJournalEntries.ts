import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface JournalEntry {
  id: number;
  date: string;
  description: string;
  reference: string;
  status: string;
  totalAmount: number;
  // Add other fields as needed
}

export function useJournalEntries(page: number = 1, limit: number = 50) {
  return useQuery<{ data: JournalEntry[]; pagination: any }>({
    queryKey: ["journal-entries", page, limit],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/journal-entries?page=${page}&limit=${limit}`
      );
      return response.json();
    },
  });
}
