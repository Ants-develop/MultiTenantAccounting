// Tasks API Client
import { apiRequest } from "@/lib/queryClient";

export interface Task {
  id: number;
  workspaceId?: number;
  jobId?: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedTo?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  workspaceId?: number;
  jobId?: number;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assignedTo?: number;
}

export const tasksApi = {
  /**
   * Fetch all tasks
   */
  fetchTasks: async (params?: { workspaceId?: number; jobId?: number; status?: string }): Promise<Task[]> => {
    const searchParams = new URLSearchParams();
    if (params?.workspaceId) searchParams.set('workspaceId', params.workspaceId.toString());
    if (params?.jobId) searchParams.set('jobId', params.jobId.toString());
    if (params?.status) searchParams.set('status', params.status);
    
    const url = searchParams.toString() ? `/api/tasks?${searchParams}` : '/api/tasks';
    const response = await apiRequest('GET', url);
    return response.json();
  },

  /**
   * Fetch a single task
   */
  fetchTask: async (id: number): Promise<Task> => {
    const response = await apiRequest('GET', `/api/tasks/${id}`);
    return response.json();
  },

  /**
   * Create a new task
   */
  createTask: async (data: CreateTaskPayload): Promise<Task> => {
    const response = await apiRequest('POST', '/api/tasks', data);
    return response.json();
  },

  /**
   * Update a task
   */
  updateTask: async (id: number, data: Partial<CreateTaskPayload>): Promise<Task> => {
    const response = await apiRequest('PUT', `/api/tasks/${id}`, data);
    return response.json();
  },

  /**
   * Delete a task
   */
  deleteTask: async (id: number): Promise<void> => {
    await apiRequest('DELETE', `/api/tasks/${id}`);
  },
};
