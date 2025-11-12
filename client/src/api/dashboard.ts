// Dashboard API Client
import { apiRequest } from "@/lib/queryClient";

export const dashboardApi = {
  /**
   * Fetch dashboard metrics
   */
  fetchMetrics: async () => {
    const response = await apiRequest('GET', '/api/dashboard/metrics');
    return response.json();
  },

  /**
   * Fetch recent transactions
   */
  fetchRecentTransactions: async () => {
    const response = await apiRequest('GET', '/api/dashboard/recent-transactions');
    return response.json();
  },

  /**
   * Fetch home page KPIs
   */
  fetchKPIs: async (range?: string) => {
    const url = range 
      ? `/api/home/kpis?range=${range}`
      : '/api/home/kpis';
    const response = await apiRequest('GET', url);
    return response.json();
  },

  /**
   * Fetch top customers
   */
  fetchTopCustomers: async (range?: string) => {
    const url = range 
      ? `/api/home/top-customers?range=${range}`
      : '/api/home/top-customers';
    const response = await apiRequest('GET', url);
    return response.json();
  },

  /**
   * Fetch top vendors
   */
  fetchTopVendors: async (range?: string) => {
    const url = range 
      ? `/api/home/top-vendors?range=${range}`
      : '/api/home/top-vendors';
    const response = await apiRequest('GET', url);
    return response.json();
  },
};

