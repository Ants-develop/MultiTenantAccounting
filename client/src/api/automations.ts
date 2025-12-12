// Automations API Client
import { apiRequest } from "@/lib/queryClient";

export interface AutomationTrigger {
  type: string;
  config: Record<string, any>;
}

export interface AutomationAction {
  type: string;
  config: Record<string, any>;
}

export interface Automation {
  id: number;
  workspaceId?: number;
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig: AutomationTrigger;
  actions: AutomationAction[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationPayload {
  workspaceId?: number;
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig: AutomationTrigger;
  actions: AutomationAction[];
  isActive?: boolean;
}

export const automationsApi = {
  /**
   * Fetch all automations
   */
  fetchAutomations: async (workspaceId?: number): Promise<Automation[]> => {
    const url = workspaceId 
      ? `/api/automations?workspaceId=${workspaceId}`
      : '/api/automations';
    const response = await apiRequest('GET', url);
    return response.json();
  },

  /**
   * Fetch a single automation
   */
  fetchAutomation: async (id: number): Promise<Automation> => {
    const response = await apiRequest('GET', `/api/automations/${id}`);
    return response.json();
  },

  /**
   * Create a new automation
   */
  createAutomation: async (data: CreateAutomationPayload): Promise<Automation> => {
    const response = await apiRequest('POST', '/api/automations', data);
    return response.json();
  },

  /**
   * Update an automation
   */
  updateAutomation: async (id: number, data: Partial<CreateAutomationPayload>): Promise<Automation> => {
    const response = await apiRequest('PUT', `/api/automations/${id}`, data);
    return response.json();
  },

  /**
   * Delete an automation
   */
  deleteAutomation: async (id: number): Promise<void> => {
    await apiRequest('DELETE', `/api/automations/${id}`);
  },

  /**
   * Run an automation manually
   */
  runAutomation: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiRequest('POST', `/api/automations/${id}/run`);
    return response.json();
  },
};
