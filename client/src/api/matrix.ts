// Matrix API Client
import { apiRequest } from "@/lib/queryClient";

export interface MatrixUser {
  userId: number;
  matrixId: string | null;
}

export interface CreateRoomPayload {
  targetType: "task" | "job" | "event";
  targetId: number;
  name?: string;
}

export interface CreateRoomResponse {
  roomId: string;
  exists: boolean;
}

export interface InviteUserPayload {
  userId: number;
}

export const matrixApi = {
  getUserMatrixId: async (userId: number): Promise<MatrixUser> => {
    const response = await apiRequest("GET", `/api/matrix/user/${userId}`);
    return response.json();
  },

  createRoom: async (data: CreateRoomPayload): Promise<CreateRoomResponse> => {
    const response = await apiRequest("POST", "/api/matrix/rooms", data);
    return response.json();
  },

  inviteUser: async (roomId: string, userId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiRequest("POST", `/api/matrix/rooms/${roomId}/invite`, { userId });
    return response.json();
  },
};

