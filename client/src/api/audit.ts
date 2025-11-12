// Audit API Client
import { apiRequest } from "@/lib/queryClient";

export const auditApi = {
  /**
   * Fetch audit table data with pagination
   */
  fetchTableData: async (tableName: string, page: number = 1, limit: number = 500) => {
    const response = await apiRequest(
      'GET',
      `/api/audit/${tableName}?page=${page}&limit=${limit}`
    );
    return response.json();
  },
};

