// Pipelines API Client
import { apiRequest } from "@/lib/queryClient";

export interface PipelineStage {
  id?: number;
  name: string;
  order: number;
  color?: string;
  automationId?: number;
}

export interface Pipeline {
  id: number;
  workspaceId: number;
  name: string;
  description?: string;
  isActive: boolean;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePipelinePayload {
  workspaceId: number;
  name: string;
  description?: string;
  isActive?: boolean;
  stages?: PipelineStage[];
}

export const pipelinesApi = {
  /**
   * Fetch all pipelines for a workspace
   */
  fetchPipelines: async (workspaceId: number): Promise<Pipeline[]> => {
    const response = await apiRequest('GET', `/api/pipelines?workspaceId=${workspaceId}`);
    return response.json();
  },

  /**
   * Fetch a single pipeline
   */
  fetchPipeline: async (id: number): Promise<Pipeline> => {
    const response = await apiRequest('GET', `/api/pipelines/${id}`);
    return response.json();
  },

  /**
   * Create a new pipeline
   */
  createPipeline: async (data: CreatePipelinePayload): Promise<Pipeline> => {
    const response = await apiRequest('POST', '/api/pipelines', data);
    return response.json();
  },

  /**
   * Update a pipeline
   */
  updatePipeline: async (id: number, data: Partial<CreatePipelinePayload>): Promise<Pipeline> => {
    const response = await apiRequest('PUT', `/api/pipelines/${id}`, data);
    return response.json();
  },

  /**
   * Delete a pipeline
   */
  deletePipeline: async (id: number): Promise<void> => {
    await apiRequest('DELETE', `/api/pipelines/${id}`);
  },
};
