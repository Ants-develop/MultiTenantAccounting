// Tasks Module API Client
import { apiRequest } from "@/lib/queryClient";

export interface Task {
  id: number;
  companyId: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  createdBy: number;
  assignedTo?: number;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  creatorName?: string;
  assigneeName?: string;
  commentCount?: number;
  attachmentCount?: number;
}

export interface TaskComment {
  id: number;
  taskId: number;
  userId: number;
  comment: string;
  createdAt: string;
  username?: string;
}

export const tasksApi = {
  // Tasks CRUD
  fetchTasks: async (companyId: number, filters?: { status?: string; priority?: string; assignedTo?: number }) => {
    const queryParams = new URLSearchParams({ companyId: companyId.toString() });
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.priority) queryParams.append('priority', filters.priority);
    if (filters?.assignedTo) queryParams.append('assignedTo', filters.assignedTo.toString());
    
    const response = await apiRequest('GET', `/api/tasks?${queryParams.toString()}`);
    return response.json();
  },

  fetchMyTasks: async (companyId: number) => {
    const response = await apiRequest('GET', `/api/tasks/assigned-to-me?companyId=${companyId}`);
    return response.json();
  },

  fetchCreatedTasks: async (companyId: number) => {
    const response = await apiRequest('GET', `/api/tasks/created-by-me?companyId=${companyId}`);
    return response.json();
  },

  fetchTask: async (id: number) => {
    const response = await apiRequest('GET', `/api/tasks/${id}`);
    return response.json();
  },

  createTask: async (data: Partial<Task>) => {
    const response = await apiRequest('POST', '/api/tasks', data);
    return response.json();
  },

  updateTask: async (id: number, data: Partial<Task>) => {
    const response = await apiRequest('PUT', `/api/tasks/${id}`, data);
    return response.json();
  },

  deleteTask: async (id: number) => {
    const response = await apiRequest('DELETE', `/api/tasks/${id}`);
    return response.json();
  },

  // Task Assignment & Status
  assignTask: async (id: number, userId: number) => {
    const response = await apiRequest('PUT', `/api/tasks/${id}/assign`, { userId });
    return response.json();
  },

  updateTaskStatus: async (id: number, status: Task['status']) => {
    const response = await apiRequest('PUT', `/api/tasks/${id}/status`, { status });
    return response.json();
  },

  // Task Comments
  addComment: async (taskId: number, comment: string) => {
    const response = await apiRequest('POST', `/api/tasks/${taskId}/comments`, { comment });
    return response.json();
  },
};

