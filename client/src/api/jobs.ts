// Jobs API Client
import { apiRequest } from "@/lib/queryClient";

export interface Job {
  id: number;
  workspaceId: number;
  pipelineId?: number;
  clientId?: number;
  title: string;
  description?: string;
  status: "active" | "completed" | "cancelled" | "on_hold";
  currentStage?: string;
  metadata?: Record<string, any>;
  matrixRoomId?: string;
  createdBy?: number;
  assignedTo?: number;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobPayload {
  workspaceId: number;
  pipelineId?: number;
  clientId?: number;
  title: string;
  description?: string;
  status?: "active" | "completed" | "cancelled" | "on_hold";
  currentStage?: string;
  assignedTo?: number;
  dueDate?: string;
  metadata?: Record<string, any>;
}

export const jobsApi = {
  fetchJobs: async (filters?: {
    workspaceId?: number;
    status?: string;
    assignedTo?: number;
  }): Promise<Job[]> => {
    const params = new URLSearchParams();
    if (filters?.workspaceId) params.append("workspaceId", filters.workspaceId.toString());
    if (filters?.status) params.append("status", filters.status);
    if (filters?.assignedTo) params.append("assignedTo", filters.assignedTo.toString());
    
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await apiRequest("GET", `/api/jobs${query}`);
    return response.json();
  },

  fetchJob: async (id: number): Promise<Job> => {
    const response = await apiRequest("GET", `/api/jobs/${id}`);
    return response.json();
  },

  createJob: async (data: CreateJobPayload): Promise<Job> => {
    const response = await apiRequest("POST", "/api/jobs", data);
    return response.json();
  },

  updateJob: async (id: number, data: Partial<CreateJobPayload>): Promise<Job> => {
    const response = await apiRequest("PATCH", `/api/jobs/${id}`, data);
    return response.json();
  },

  deleteJob: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/jobs/${id}`);
  },
};

