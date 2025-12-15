import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface BankTransaction {
  id: number;
  date: string;
  amount: number;
  description: string;
  reference: string;
  status: string;
  // Add other fields as needed
}

export function useBankTransactions(page: number = 1, limit: number = 50) {
  return useQuery<{ data: BankTransaction[]; pagination: any }>({
    queryKey: ["bank-transactions", page, limit],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/bank/transactions?page=${page}&limit=${limit}`
      );
      return response.json();
    },
  });
}
