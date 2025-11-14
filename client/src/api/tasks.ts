// Tasks API Client (TaxDome-style)
import { apiRequest } from "@/lib/queryClient";

export interface Subtask {
  id: number;
  taskId: number;
  title: string;
  done: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  workspaceId: number;
  jobId?: number;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done" | "cancelled" | "blocked";
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId?: number;
  reporterId?: number;
  dueDate?: string;
  startDate?: string;
  completedAt?: string;
  recurrence?: Record<string, any>;
  matrixRoomId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  subtasks?: Subtask[];
}

export interface CreateTaskPayload {
  workspaceId: number;
  jobId?: number;
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "done" | "cancelled" | "blocked";
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeId?: number;
  reporterId?: number;
  dueDate?: string;
  startDate?: string;
  recurrence?: Record<string, any>;
  metadata?: Record<string, any>;
  createMatrixRoom?: boolean;
}

export const tasksApi = {
  fetchTasks: async (filters?: {
    workspaceId?: number;
    jobId?: number;
    status?: string;
    assigneeId?: number;
    priority?: string;
  }): Promise<Task[]> => {
    const params = new URLSearchParams();
    if (filters?.workspaceId) params.append("workspaceId", filters.workspaceId.toString());
    if (filters?.jobId) params.append("jobId", filters.jobId.toString());
    if (filters?.status) params.append("status", filters.status);
    if (filters?.assigneeId) params.append("assigneeId", filters.assigneeId.toString());
    if (filters?.priority) params.append("priority", filters.priority);
    
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await apiRequest("GET", `/api/tasks${query}`);
    return response.json();
  },

  fetchTask: async (id: number): Promise<Task> => {
    const response = await apiRequest("GET", `/api/tasks/${id}`);
    return response.json();
  },

  createTask: async (data: CreateTaskPayload): Promise<Task> => {
    const response = await apiRequest("POST", "/api/tasks", data);
    return response.json();
  },

  updateTask: async (id: number, data: Partial<CreateTaskPayload>): Promise<Task> => {
    const response = await apiRequest("PATCH", `/api/tasks/${id}`, data);
    return response.json();
  },

  deleteTask: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/tasks/${id}`);
  },

  // Subtasks
  addSubtask: async (taskId: number, title: string, orderIndex?: number): Promise<Subtask> => {
    const response = await apiRequest("POST", `/api/tasks/${taskId}/subtasks`, {
      title,
      orderIndex: orderIndex || 0,
    });
    return response.json();
  },

  updateSubtask: async (taskId: number, subtaskId: number, data: Partial<{ title: string; done: boolean; orderIndex: number }>): Promise<Subtask> => {
    const response = await apiRequest("PATCH", `/api/tasks/${taskId}/subtasks/${subtaskId}`, data);
    return response.json();
  },

  deleteSubtask: async (taskId: number, subtaskId: number): Promise<void> => {
    await apiRequest("DELETE", `/api/tasks/${taskId}/subtasks/${subtaskId}`);
  },
};

