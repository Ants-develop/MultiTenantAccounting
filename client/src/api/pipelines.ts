// Pipelines API Client
import { apiRequest } from "@/lib/queryClient";

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  taskTemplates?: Array<{
    title: string;
    description?: string;
    assigneeId?: number;
    priority?: "low" | "medium" | "high" | "urgent";
  }>;
}

export interface Pipeline {
  id: number;
  workspaceId: number;
  name: string;
  description?: string;
  stages: PipelineStage[];
  isActive: boolean;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePipelinePayload {
  workspaceId: number;
  name: string;
  description?: string;
  stages: PipelineStage[];
  isActive?: boolean;
}

export const pipelinesApi = {
  fetchPipelines: async (workspaceId?: number): Promise<Pipeline[]> => {
    const query = workspaceId ? `?workspaceId=${workspaceId}` : "";
    const response = await apiRequest("GET", `/api/pipelines${query}`);
    return response.json();
  },

  fetchPipeline: async (id: number): Promise<Pipeline> => {
    const response = await apiRequest("GET", `/api/pipelines/${id}`);
    return response.json();
  },

  createPipeline: async (data: CreatePipelinePayload): Promise<Pipeline> => {
    const response = await apiRequest("POST", "/api/pipelines", data);
    return response.json();
  },

  updatePipeline: async (id: number, data: Partial<CreatePipelinePayload>): Promise<Pipeline> => {
    const response = await apiRequest("PUT", `/api/pipelines/${id}`, data);
    return response.json();
  },

  deletePipeline: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/pipelines/${id}`);
  },
};

