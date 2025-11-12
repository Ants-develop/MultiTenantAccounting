// Companies API Client
import { apiRequest } from "@/lib/queryClient";

export const companiesApi = {
  /**
   * Fetch all companies for the current user
   */
  fetchCompanies: async () => {
    const response = await apiRequest('GET', '/api/companies');
    return response.json();
  },

  /**
   * Get current company details
   */
  getCurrentCompany: async () => {
    const response = await apiRequest('GET', '/api/companies/current');
    return response.json();
  },

  /**
   * Create a new company
   */
  createCompany: async (data: any) => {
    const response = await apiRequest('POST', '/api/companies', data);
    return response.json();
  },

  /**
   * Switch to a different company
   */
  switchCompany: async (id: number) => {
    const response = await apiRequest('POST', `/api/companies/${id}/switch`);
    return response.json();
  },

  /**
   * Delete a company
   */
  deleteCompany: async (id: number) => {
    const response = await apiRequest('DELETE', `/api/companies/${id}`);
    return response.json();
  },

  /**
   * Get company settings
   */
  getSettings: async (id: number) => {
    const response = await apiRequest('GET', `/api/companies/settings/${id}`);
    return response.json();
  },

  /**
   * Update company info
   */
  updateCompanyInfo: async (id: number, data: any) => {
    const response = await apiRequest('PUT', `/api/companies/settings/${id}/info`, data);
    return response.json();
  },

  /**
   * Update notification settings
   */
  updateNotifications: async (id: number, data: any) => {
    const response = await apiRequest('PUT', `/api/companies/settings/${id}/notifications`, data);
    return response.json();
  },

  /**
   * Update financial settings
   */
  updateFinancial: async (id: number, data: any) => {
    const response = await apiRequest('PUT', `/api/companies/settings/${id}/financial`, data);
    return response.json();
  },

  /**
   * Update security settings
   */
  updateSecurity: async (id: number, data: any) => {
    const response = await apiRequest('PUT', `/api/companies/settings/${id}/security`, data);
    return response.json();
  },

  /**
   * Export company data
   */
  exportData: async (id: number) => {
    const response = await apiRequest('GET', `/api/companies/${id}/export`);
    return response.json();
  },

  /**
   * Archive a company
   */
  archiveCompany: async (id: number) => {
    const response = await apiRequest('PUT', `/api/companies/${id}/archive`);
    return response.json();
  },

  /**
   * Restore an archived company
   */
  restoreCompany: async (id: number) => {
    const response = await apiRequest('PUT', `/api/companies/${id}/restore`);
    return response.json();
  },
};

