import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { messengerClient } from "@/services/messenger/messengerClient";
import { messengerService, MatrixMessage, MatrixRoom } from "@/services/messenger/messengerService";
import { useAuth } from "@/hooks/useAuth";

interface MessengerContextType {
  isInitialized: boolean;
  rooms: MatrixRoom[];
  currentRoom: MatrixRoom | null;
  messages: MatrixMessage[];
  isLoading: boolean;
  sendMessage: (roomId: string, message: string) => Promise<void>;
  selectRoom: (roomId: string) => Promise<void>;
  refreshRooms: () => Promise<void>;
}

const MessengerContext = createContext<MessengerContextType | undefined>(undefined);

export const useMessenger = () => {
  const context = useContext(MessengerContext);
  if (!context) {
    throw new Error("useMessenger must be used within MessengerProvider");
  }
  return context;
};

interface MessengerProviderProps {
  children: ReactNode;
}

export const MessengerProvider: React.FC<MessengerProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [rooms, setRooms] = useState<MatrixRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<MatrixRoom | null>(null);
  const [messages, setMessages] = useState<MatrixMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // TODO: Initialize Matrix client when user is available
    // For now, just mark as initialized
    if (user) {
      setIsInitialized(true);
    }
  }, [user]);

  const sendMessage = async (roomId: string, message: string) => {
    try {
      const sentMessage = await messengerService.sendMessage({ roomId, message });
      setMessages((prev) => [sentMessage, ...prev]);
    } catch (error) {
      console.error("[Messenger Context] Error sending message:", error);
      throw error;
    }
  };

  const selectRoom = async (roomId: string) => {
    setIsLoading(true);
    try {
      const roomMessages = await messengerService.getRecentMessages(roomId);
      setMessages(roomMessages);
      const room = rooms.find((r) => r.id === roomId);
      setCurrentRoom(room || null);
    } catch (error) {
      console.error("[Messenger Context] Error loading room:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshRooms = async () => {
    setIsLoading(true);
    try {
      const userRooms = await messengerService.getUserRooms();
      setRooms(userRooms);
    } catch (error) {
      console.error("[Messenger Context] Error refreshing rooms:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MessengerContext.Provider
      value={{
        isInitialized,
        rooms,
        currentRoom,
        messages,
        isLoading,
        sendMessage,
        selectRoom,
        refreshRooms,
      }}
    >
      {children}
    </MessengerContext.Provider>
  );
};

