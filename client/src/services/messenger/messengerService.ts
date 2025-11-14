// High-level Messenger Service
// Provides business logic for messaging operations

import { messengerClient, MatrixMessage, MatrixRoom } from "./messengerClient";

export interface SendMessageOptions {
  roomId: string;
  message: string;
  formattedMessage?: string;
}

export interface CreateRoomOptions {
  name: string;
  topic?: string;
  inviteUserIds?: string[];
}

class MessengerService {
  /**
   * Send a message and return the message object
   */
  async sendMessage(options: SendMessageOptions): Promise<MatrixMessage> {
    const eventId = await messengerClient.sendMessage(options.roomId, options.message);

    return {
      id: eventId,
      roomId: options.roomId,
      sender: "current_user", // TODO: Get from auth context
      content: options.message,
      timestamp: new Date(),
      formattedContent: options.formattedMessage,
    };
  }

  /**
   * Get recent messages from a room
   */
  async getRecentMessages(roomId: string, limit: number = 50): Promise<MatrixMessage[]> {
    return await messengerClient.getMessages(roomId, limit);
  }

  /**
   * Get all rooms for the current user
   */
  async getUserRooms(): Promise<MatrixRoom[]> {
    return await messengerClient.getRooms();
  }

  /**
   * Create a new room
   */
  async createRoom(options: CreateRoomOptions): Promise<MatrixRoom> {
    // TODO: Implement room creation via Matrix bridge API
    // For now, return placeholder
    return {
      id: `!${Math.random().toString(36).substring(2, 15)}:matrix.example.com`,
      name: options.name,
      topic: options.topic,
      members: options.inviteUserIds || [],
      unreadCount: 0,
    };
  }

  /**
   * Mark messages as read
   */
  async markAsRead(roomId: string, eventId: string): Promise<void> {
    // TODO: Implement read receipt
    console.log("[Messenger Service] Marking as read:", roomId, eventId);
  }
}

// Export singleton instance
export const messengerService = new MessengerService();

