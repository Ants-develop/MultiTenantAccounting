import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface RSDataResponse {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function useRSData(tableName: string, page: number = 1, limit: number = 50) {
  return useQuery<RSDataResponse>({
    queryKey: ["rs-data", tableName, page, limit],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/rs-integration/${tableName}?page=${page}&limit=${limit}`
      );
      return response.json();
    },
    enabled: !!tableName,
  });
}
