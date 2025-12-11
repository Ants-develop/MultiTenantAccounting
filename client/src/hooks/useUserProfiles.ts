import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole?: string;
  isActive: boolean;
  displayName: string;
  avatarUrl?: string;
  fullName: string;
}

/**
 * Fetch all active users for user directory/search
 */
export const useUserProfiles = () => {
  return useQuery({
    queryKey: ["user-profiles"],
    queryFn: async (): Promise<UserProfile[]> => {
      const response = await apiRequest("GET", "/api/users");
      const users = await response.json();
      
      // Transform users to include computed fields
      return users.map((user: any) => ({
        ...user,
        displayName: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.username,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        avatarUrl: user.avatarUrl || undefined,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Fetch a specific user's profile by ID
 */
export const useUserProfile = (userId: number | undefined) => {
  return useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!userId) return null;
      
      const response = await apiRequest("GET", `/api/users/${userId}`);
      const user = await response.json();
      
      return {
        ...user,
        displayName: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.username,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        avatarUrl: user.avatarUrl || undefined,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Search users by name, username, or email
 */
export const useSearchUsers = (searchTerm: string) => {
  return useQuery({
    queryKey: ["search-users", searchTerm],
    queryFn: async (): Promise<UserProfile[]> => {
      const response = await apiRequest("GET", "/api/users");
      const users = await response.json();
      
      const term = searchTerm.toLowerCase();
      const filtered = users.filter((user: any) => 
        user.username.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.firstName?.toLowerCase().includes(term) ||
        user.lastName?.toLowerCase().includes(term)
      );
      
      return filtered.map((user: any) => ({
        ...user,
        displayName: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.username,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        avatarUrl: user.avatarUrl || undefined,
      }));
    },
    enabled: searchTerm.length >= 2, // Only search if at least 2 characters
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Get user's message history
 */
export const useUserMessageHistory = (userId: number | undefined) => {
  return useQuery({
    queryKey: ["user-message-history", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // This would be implemented on the backend
      // For now, we'll return empty array
      // const response = await apiRequest("GET", `/api/messages/user/${userId}`);
      // return response.json();
      
      return [];
    },
    enabled: !!userId,
  });
};

/**
 * Get conversation with specific user
 */
export const useDirectConversation = (userId: number | undefined) => {
  return useQuery({
    queryKey: ["direct-conversation", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      // This would check if a direct conversation exists with this user
      // For now, return null
      // const response = await apiRequest("GET", `/api/conversations/direct/${userId}`);
      // return response.json();
      
      return null;
    },
    enabled: !!userId,
  });
};
