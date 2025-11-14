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
  return apiRequest(`/api/automations${params}`, {
    method: "GET",
  });
}

export async function createAutomation(
  payload: CreateAutomationPayload
): Promise<Automation> {
  return apiRequest("/api/automations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAutomation(
  id: number,
  updates: Partial<Automation>
): Promise<Automation> {
  return apiRequest(`/api/automations/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteAutomation(id: number): Promise<void> {
  return apiRequest(`/api/automations/${id}`, {
    method: "DELETE",
  });
}

export async function testAutomation(
  id: number,
  testEventData: Record<string, any>
): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/automations/${id}/test`, {
    method: "POST",
    body: JSON.stringify(testEventData),
  });
}

export async function executeBulkAction(
  actionType: string,
  targetIds: number[],
  metadata?: Record<string, any>
): Promise<{ success: boolean; message: string }> {
  return apiRequest("/api/automations/bulk-action", {
    method: "POST",
    body: JSON.stringify({ actionType, targetIds, metadata }),
  });
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

