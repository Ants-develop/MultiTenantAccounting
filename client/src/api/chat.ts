// Chat Module API Client
import { apiRequest } from "@/lib/queryClient";

export interface ChatChannel {
  id: number;
  companyId: number;
  name: string;
  description?: string;
  isPrivate: boolean;
  createdBy: number;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  channelId: number;
  userId: number;
  message: string;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
  username?: string;
  email?: string;
}

export const chatApi = {
  // Channels
  fetchChannels: async (companyId: number) => {
    const response = await apiRequest('GET', `/api/chat/channels?companyId=${companyId}`);
    return response.json();
  },

  createChannel: async (data: { name: string; description?: string; isPrivate?: boolean; memberIds?: number[] }) => {
    const response = await apiRequest('POST', '/api/chat/channels', data);
    return response.json();
  },

  // Messages
  fetchMessages: async (channelId: number, limit: number = 50, offset: number = 0) => {
    const response = await apiRequest('GET', `/api/chat/channels/${channelId}/messages?limit=${limit}&offset=${offset}`);
    return response.json();
  },

  sendMessage: async (channelId: number, message: string) => {
    const response = await apiRequest('POST', `/api/chat/channels/${channelId}/messages`, { message });
    return response.json();
  },

  updateMessage: async (messageId: number, message: string) => {
    const response = await apiRequest('PUT', `/api/chat/messages/${messageId}`, { message });
    return response.json();
  },

  deleteMessage: async (messageId: number) => {
    const response = await apiRequest('DELETE', `/api/chat/messages/${messageId}`);
    return response.json();
  },

  // Unread Count
  fetchUnreadCount: async (companyId: number) => {
    const response = await apiRequest('GET', `/api/chat/unread-count?companyId=${companyId}`);
    return response.json();
  },
};

