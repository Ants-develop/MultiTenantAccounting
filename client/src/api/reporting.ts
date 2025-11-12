// Reporting Module API Client
import { apiRequest } from "@/lib/queryClient";

export const reportingApi = {
  // Trial Balance
  fetchTrialBalance: async (companyId: number, date?: string) => {
    const queryParams = date ? `&date=${date}` : '';
    const response = await apiRequest('GET', `/api/reporting/trial-balance?companyId=${companyId}${queryParams}`);
    return response.json();
  },

  // Profit & Loss Statement
  fetchProfitLoss: async (companyId: number, startDate?: string, endDate?: string) => {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    const response = await apiRequest('GET', `/api/reporting/profit-loss?companyId=${companyId}&${queryParams.toString()}`);
    return response.json();
  },

  // Balance Sheet
  fetchBalanceSheet: async (companyId: number, date?: string) => {
    const queryParams = date ? `&date=${date}` : '';
    const response = await apiRequest('GET', `/api/reporting/balance-sheet?companyId=${companyId}${queryParams}`);
    return response.json();
  },

  // Cash Flow Statement
  fetchCashFlow: async (companyId: number, startDate?: string, endDate?: string) => {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    const response = await apiRequest('GET', `/api/reporting/cash-flow?companyId=${companyId}&${queryParams.toString()}`);
    return response.json();
  },

  // Financial Statements (unified - for backward compatibility)
  fetchFinancialStatements: async (companyId: number, type: 'profit-loss' | 'balance-sheet', startDate?: string, endDate?: string) => {
    const queryParams = new URLSearchParams();
    queryParams.append('type', type);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    const response = await apiRequest('GET', `/api/reporting/financial-statements?companyId=${companyId}&${queryParams.toString()}`);
    return response.json();
  },

  // Custom Reports
  fetchCustomReports: async (companyId: number) => {
    const response = await apiRequest('GET', `/api/reporting/custom?companyId=${companyId}`);
    return response.json();
  },

  createCustomReport: async (config: any) => {
    const response = await apiRequest('POST', '/api/reporting/custom', config);
    return response.json();
  },

  fetchCustomReport: async (id: number) => {
    const response = await apiRequest('GET', `/api/reporting/custom/${id}`);
    return response.json();
  },

  // Report Scheduling
  scheduleReport: async (config: any) => {
    const response = await apiRequest('POST', '/api/reporting/schedule', config);
    return response.json();
  },
};

