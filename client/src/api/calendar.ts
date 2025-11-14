// Calendar API Client
import { apiRequest } from "@/lib/queryClient";

export interface CalendarEvent {
  id: number;
  workspaceId: number;
  title: string;
  description?: string;
  start: string;
  end: string;
  timezone: string;
  ownerId?: number;
  relatedTaskId?: number;
  relatedJobId?: number;
  matrixRoomId?: string;
  location?: string;
  isAllDay: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventPayload {
  workspaceId: number;
  title: string;
  description?: string;
  start: string;
  end: string;
  timezone?: string;
  ownerId?: number;
  relatedTaskId?: number;
  relatedJobId?: number;
  location?: string;
  isAllDay?: boolean;
  metadata?: Record<string, any>;
  createMatrixRoom?: boolean;
}

export interface AggregatedCalendar {
  tasks: Array<{
    id: string;
    type: "task";
    title: string;
    start: string;
    end: string;
    taskId: number;
    status: string;
    priority: string;
  }>;
  events: Array<{
    id: string;
    type: "event";
    title: string;
    start: string;
    end: string;
    eventId: number;
    location?: string;
    isAllDay: boolean;
  }>;
  all: Array<any>;
}

export const calendarApi = {
  fetchEvents: async (filters?: {
    workspaceId?: number;
    from?: string;
    to?: string;
    ownerId?: number;
  }): Promise<CalendarEvent[]> => {
    const params = new URLSearchParams();
    if (filters?.workspaceId) params.append("workspaceId", filters.workspaceId.toString());
    if (filters?.from) params.append("from", filters.from);
    if (filters?.to) params.append("to", filters.to);
    if (filters?.ownerId) params.append("ownerId", filters.ownerId.toString());
    
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await apiRequest("GET", `/api/calendar/events${query}`);
    return response.json();
  },

  fetchAggregated: async (filters?: {
    workspaceId?: number;
    from?: string;
    to?: string;
  }): Promise<AggregatedCalendar> => {
    const params = new URLSearchParams();
    if (filters?.workspaceId) params.append("workspaceId", filters.workspaceId.toString());
    if (filters?.from) params.append("from", filters.from);
    if (filters?.to) params.append("to", filters.to);
    
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await apiRequest("GET", `/api/calendar/aggregated${query}`);
    return response.json();
  },

  createEvent: async (data: CreateEventPayload): Promise<CalendarEvent> => {
    const response = await apiRequest("POST", "/api/calendar/events", data);
    return response.json();
  },

  updateEvent: async (id: number, data: Partial<CreateEventPayload>): Promise<CalendarEvent> => {
    const response = await apiRequest("PATCH", `/api/calendar/events/${id}`, data);
    return response.json();
  },

  deleteEvent: async (id: number): Promise<void> => {
    await apiRequest("DELETE", `/api/calendar/events/${id}`);
  },
};

