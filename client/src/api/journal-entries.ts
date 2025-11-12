// Journal Entries API Client
import { apiRequest } from "@/lib/queryClient";

export const journalEntriesApi = {
  /**
   * Fetch journal entries with pagination
   */
  fetchEntries: async (page: number = 1, limit: number = 1000) => {
    const response = await apiRequest(
      'GET',
      `/api/journal-entries?page=${page}&limit=${limit}`
    );
    return response.json();
  },

  /**
   * Create a new journal entry
   */
  createEntry: async (data: any) => {
    const response = await apiRequest('POST', '/api/journal-entries', data);
    return response.json();
  },

  /**
   * Update an existing journal entry
   */
  updateEntry: async (id: number, data: any) => {
    const response = await apiRequest('PUT', `/api/journal-entries/${id}`, data);
    return response.json();
  },

  /**
   * Delete a journal entry
   */
  deleteEntry: async (id: number) => {
    const response = await apiRequest('DELETE', `/api/journal-entries/${id}`);
    return response.json();
  },

  /**
   * Get journal entry lines for a specific entry
   */
  fetchEntryLines: async (id: number) => {
    const response = await apiRequest('GET', `/api/journal-entries/${id}/lines`);
    return response.json();
  },
};

