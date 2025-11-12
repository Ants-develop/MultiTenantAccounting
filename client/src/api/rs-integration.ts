// RS Integration Module API Client
import { apiRequest } from "@/lib/queryClient";

export interface RSIntegrationData {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export const rsIntegrationApi = {
  // Fetch RS.ge table data with pagination
  fetchTableData: async (
    tableName: string,
    companyId: number,
    page: number = 1,
    limit: number = 500
  ): Promise<RSIntegrationData> => {
    const response = await apiRequest(
      'GET',
      `/api/rs-integration/${tableName}?page=${page}&limit=${limit}&companyId=${companyId}`
    );
    return response.json();
  },
};

