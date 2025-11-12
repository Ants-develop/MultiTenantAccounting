// Reports API Client
import { apiRequest } from "@/lib/queryClient";

export const reportsApi = {
  /**
   * Fetch trial balance report
   */
  fetchTrialBalance: async (date?: string) => {
    const url = date 
      ? `/api/reports/trial-balance?date=${date}`
      : '/api/reports/trial-balance';
    const response = await apiRequest('GET', url);
    return response.json();
  },

  /**
   * Fetch financial statements (profit-loss or balance-sheet)
   */
  fetchFinancialStatements: async (type: 'profit-loss' | 'balance-sheet', startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ type });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await apiRequest('GET', `/api/reports/financial-statements?${params.toString()}`);
    return response.json();
  },
};

