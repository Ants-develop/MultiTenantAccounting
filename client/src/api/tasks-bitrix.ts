// Tasks Bitrix API Client
import { apiRequest } from "@/lib/queryClient";

// Type definitions
export interface Task {
  id: number;
  clientId: number;
  templateId?: number;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "review" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  tags: string[];
  assignedTo?: number;
  estimatedMinutes?: number;
  metadata?: Record<string, any>;
  dueAt?: string;
  reminderAt?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
  checklists?: TaskChecklist[];
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  dependencies?: Task[];
}

export interface TaskChecklist {
  id: number;
  taskId: number;
  text: string;
  completed: boolean;
  assignedTo?: number;
  orderIdx: number;
  createdAt: string;
}

export interface TaskComment {
  id: number;
  taskId: number;
  userId: number;
  comment: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: number;
  taskId: number;
  uploadedBy: number;
  filename: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
}

export interface TaskTemplate {
  id: number;
  clientId: number;
  name: string;
  description?: string;
  data: TaskTemplateData;
  createdBy?: number;
  isPublic: boolean;
  scheduleEnabled?: boolean;
  scheduleConfig?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTemplateData {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "critical";
  tags: string[];
  estimated_minutes?: number;
  deadline_offset?: string;
  checklists: Array<{
    text: string;
    assigned_to_role?: string;
  }>;
  metadata?: Record<string, any>;
}

export interface CreateTaskPayload {
  clientId: number;
  templateId?: number;
  title: string;
  description?: string;
  status?: "open" | "in_progress" | "review" | "done" | "cancelled";
  priority?: "low" | "medium" | "high" | "critical";
  tags?: string[];
  assignedTo?: number;
  estimatedMinutes?: number;
  metadata?: Record<string, any>;
  dueAt?: string;
  reminderAt?: string;
}

export interface CreateChecklistPayload {
  text: string;
  assignedTo?: number;
  orderIdx?: number;
}

export interface UpdateChecklistPayload {
  text?: string;
  completed?: boolean;
  assignedTo?: number;
  orderIdx?: number;
}

export interface CreateTemplatePayload {
  clientId: number;
  name: string;
  description?: string;
  data: TaskTemplateData;
  isPublic?: boolean;
}

export interface TaskFilters {
  clientIds?: number[];
  status?: string[];
  priority?: string[];
  assignedTo?: number;
  tags?: string[];
  autoCreated?: boolean; // Filter for auto-created tasks (tasks with templateId)
}

export const tasksBitrixApi = {
  // Tasks
  fetchTasks: async (filters?: TaskFilters): Promise<Task[]> => {
    const params = new URLSearchParams();
    if (filters?.clientIds && filters.clientIds.length > 0) {
      params.append("clientIds", filters.clientIds.join(","));
    }
    if (filters?.autoCreated !== undefined) {
      params.append("autoCreated", filters.autoCreated.toString());
    }
    if (filters?.status && filters.status.length > 0) {
      params.append("status", filters.status.join(","));
    }
    if (filters?.priority && filters.priority.length > 0) {
      params.append("priority", filters.priority.join(","));
    }
    if (filters?.assignedTo) {
      params.append("assigned_to", filters.assignedTo.toString());
    }
    if (filters?.tags && filters.tags.length > 0) {
      params.append("tags", filters.tags.join(","));
    }
    
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await apiRequest("GET", `/api/tasks-bitrix${query}`);
    return response.json();
  },

  fetchTask: async (id: number): Promise<Task> => {
    const response = await apiRequest("GET", `/api/tasks-bitrix/${id}`);
    return response.json();
  },

  createTask: async (data: CreateTaskPayload): Promise<Task> => {
    const response = await apiRequest("POST", "/api/tasks-bitrix", data);
    return response.json();
  },

  updateTask: async (id: number, data: Partial<CreateTaskPayload>): Promise<Task> => {
    const response = await apiRequest("PUT", `/api/tasks-bitrix/${id}`, data);
    return response.json();
  },

  deleteTask: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/tasks-bitrix/${id}`);
  },

  updateTaskStatus: async (id: number, status: Task["status"]): Promise<Task> => {
    const response = await apiRequest("PATCH", `/api/tasks-bitrix/${id}/status`, { status });
    return response.json();
  },

  // Checklists
  addChecklistItem: async (taskId: number, data: CreateChecklistPayload): Promise<TaskChecklist> => {
    const response = await apiRequest("POST", `/api/tasks-bitrix/${taskId}/checklists`, data);
    return response.json();
  },

  updateChecklistItem: async (taskId: number, checklistId: number, data: UpdateChecklistPayload): Promise<TaskChecklist> => {
    const response = await apiRequest("PUT", `/api/tasks-bitrix/${taskId}/checklists/${checklistId}`, data);
    return response.json();
  },

  deleteChecklistItem: async (taskId: number, checklistId: number): Promise<void> => {
    await apiRequest("DELETE", `/api/tasks-bitrix/${taskId}/checklists/${checklistId}`);
  },

  // Comments
  addComment: async (taskId: number, comment: string): Promise<TaskComment> => {
    const response = await apiRequest("POST", `/api/tasks-bitrix/${taskId}/comments`, { comment });
    return response.json();
  },

  // Attachments
  fetchAttachments: async (taskId: number): Promise<TaskAttachment[]> => {
    const response = await apiRequest("GET", `/api/tasks-bitrix/${taskId}/attachments`);
    return response.json();
  },

  uploadAttachment: async (taskId: number, file: File): Promise<TaskAttachment> => {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await fetch(`/api/tasks-bitrix/${taskId}/attachments`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status}: ${text}`);
    }

    return response.json();
  },

  deleteAttachment: async (taskId: number, attachmentId: number): Promise<void> => {
    await apiRequest("DELETE", `/api/tasks-bitrix/${taskId}/attachments/${attachmentId}`);
  },

  // Dependencies
  addDependency: async (taskId: number, dependsOnId: number): Promise<{ taskId: number; dependsOn: number }> => {
    const response = await apiRequest("POST", `/api/tasks-bitrix/${taskId}/dependencies`, { dependsOnId });
    return response.json();
  },

  removeDependency: async (taskId: number, dependsOnId: number): Promise<void> => {
    await apiRequest("DELETE", `/api/tasks-bitrix/${taskId}/dependencies/${dependsOnId}`);
  },

  // Templates
  fetchTemplates: async (clientIds?: number[], isPublic?: boolean): Promise<TaskTemplate[]> => {
    const params = new URLSearchParams();
    if (clientIds && clientIds.length > 0) {
      params.append("clientIds", clientIds.join(","));
    }
    if (isPublic !== undefined) {
      params.append("isPublic", isPublic.toString());
    }
    
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await apiRequest("GET", `/api/task-templates${query}`);
    return response.json();
  },

  fetchTemplate: async (id: number): Promise<TaskTemplate> => {
    const response = await apiRequest("GET", `/api/task-templates/${id}`);
    return response.json();
  },

  createTemplate: async (data: CreateTemplatePayload): Promise<TaskTemplate> => {
    const response = await apiRequest("POST", "/api/task-templates", data);
    return response.json();
  },

  updateTemplate: async (id: number, data: Partial<CreateTemplatePayload>): Promise<TaskTemplate> => {
    const response = await apiRequest("PUT", `/api/task-templates/${id}`, data);
    return response.json();
  },

  deleteTemplate: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/task-templates/${id}`);
  },

  instantiateTemplate: async (templateId: number, clientId: number, variables?: Record<string, string>): Promise<Task> => {
    const response = await apiRequest("POST", `/api/task-templates/${templateId}/instantiate`, {
      clientId,
      variables,
    });
    return response.json();
  },

  // Template Scheduling
  updateTemplateSchedule: async (
    templateId: number,
    scheduleConfig: {
      scheduleEnabled?: boolean;
      scheduleConfig?: {
        cronExpression?: string;
        timezone?: string;
        perClient?: boolean;
        perUser?: boolean;
        clientSchedules?: Record<string, {
          cronExpression: string;
          assignedTo?: number;
        }>;
      };
    }
  ): Promise<TaskTemplate> => {
    const response = await apiRequest("PATCH", `/api/task-templates/${templateId}/schedule`, scheduleConfig);
    return response.json();
  },

  getTemplateSchedule: async (templateId: number): Promise<{
    scheduleEnabled: boolean;
    scheduleConfig: any;
  }> => {
    const response = await apiRequest("GET", `/api/task-templates/${templateId}/schedule`);
    return response.json();
  },

  testTemplateSchedule: async (
    templateId: number,
    cronExpression?: string,
    timezone?: string
  ): Promise<{
    cronExpression: string;
    timezone: string;
    nextRunAt: string;
    nextRunAtFormatted: string;
  }> => {
    const response = await apiRequest("POST", `/api/task-templates/${templateId}/test-schedule`, {
      cronExpression,
      timezone,
    });
    return response.json();
  },
};

