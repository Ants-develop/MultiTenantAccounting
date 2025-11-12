// Accounts API Client
import { apiRequest } from "@/lib/queryClient";

export const accountsApi = {
  /**
   * Fetch all accounts for the current company
   */
  fetchAccounts: async () => {
    const response = await apiRequest('GET', '/api/accounts');
    return response.json();
  },

  /**
   * Fetch account balances
   */
  fetchBalances: async () => {
    const response = await apiRequest('GET', '/api/accounts/balances');
    return response.json();
  },

  /**
   * Create a new account
   */
  createAccount: async (data: any) => {
    const response = await apiRequest('POST', '/api/accounts', data);
    return response.json();
  },

  /**
   * Update an existing account
   */
  updateAccount: async (id: number, data: any) => {
    const response = await apiRequest('PUT', `/api/accounts/${id}`, data);
    return response.json();
  },

  /**
   * Delete an account
   */
  deleteAccount: async (id: number) => {
    const response = await apiRequest('DELETE', `/api/accounts/${id}`);
    return response.json();
  },
};

