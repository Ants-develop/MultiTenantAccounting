// Client Management API Client
import { apiRequest } from "@/lib/queryClient";

export interface ClientProfile {
  client: {
    id: number;
    name: string;
    code: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    totalTasks: number;
    pendingTasks: number;
    overdueTasks: number;
  };
}

export const clientManagementApi = {
  /**
   * Fetch client profile with stats
   */
  fetchClientProfile: async (clientId: number): Promise<ClientProfile> => {
    const response = await apiRequest('GET', `/api/clients/${clientId}/profile`);
    return response.json();
  },

  /**
   * Update client profile
   */
  updateClientProfile: async (clientId: number, updates: Partial<ClientProfile['client']>) => {
    const response = await apiRequest('PUT', `/api/clients/${clientId}`, updates);
    return response.json();
  },

  /**
   * Fetch client tasks
   */
  fetchClientTasks: async (clientId: number) => {
    const response = await apiRequest('GET', `/api/clients/${clientId}/tasks`);
    return response.json();
  },

  /**
   * Fetch client jobs/workflows
   */
  fetchClientJobs: async (clientId: number) => {
    const response = await apiRequest('GET', `/api/clients/${clientId}/jobs`);
    return response.json();
  },

  /**
   * Fetch client calendar events
   */
  fetchClientCalendarEvents: async (clientId: number) => {
    const response = await apiRequest('GET', `/api/clients/${clientId}/calendar`);
    return response.json();
  },
};
