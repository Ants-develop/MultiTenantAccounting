import { apiRequest } from "@/lib/queryClient";

// =====================================================
// Types
// =====================================================

export interface Automation {
  id: number;
  workspaceId?: number;
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig: Record<string, any>;
  actions: Array<{
    type: string;
    [key: string]: any;
  }>;
  isActive: boolean;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationPayload {
  workspaceId?: number;
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig?: Record<string, any>;
  actions: Array<{
    type: string;
    [key: string]: any;
  }>;
  isActive?: boolean;
}

// =====================================================
// Automations API
// =====================================================

export async function fetchAutomations(workspaceId?: number): Promise<Automation[]> {
  const params = workspaceId ? `?workspaceId=${workspaceId}` : "";
  const res = await apiRequest("GET", `/api/automations${params}`);
  return res.json();
}

export async function createAutomation(
  payload: CreateAutomationPayload
): Promise<Automation> {
  const res = await apiRequest("POST", "/api/automations", payload);
  return res.json();
}

export async function updateAutomation(
  id: number,
  updates: Partial<Automation>
): Promise<Automation> {
  const res = await apiRequest("PUT", `/api/automations/${id}`, updates);
  return res.json();
}

export async function deleteAutomation(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/automations/${id}`);
}

export async function testAutomation(
  id: number,
  testEventData: Record<string, any>
): Promise<{ success: boolean; message: string }> {
  const res = await apiRequest("POST", `/api/automations/${id}/test`, testEventData);
  return res.json();
}

export async function executeBulkAction(
  actionType: string,
  targetIds: number[],
  metadata?: Record<string, any>
): Promise<{ success: boolean; message: string }> {
  const res = await apiRequest("POST", "/api/automations/bulk-action", { actionType, targetIds, metadata });
  return res.json();
}

// =====================================================
// API Client Export
// =====================================================

export const automationsApi = {
  fetchAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  testAutomation,
  executeBulkAction,
};

