import React, { useState, useEffect, useRef } from "react";
import { useMessenger } from "@/hooks/useMessenger";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { TaxDomeCard } from "@/components/taxdome";

interface ChatPanelProps {
  roomId: string;
  roomName?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ roomId, roomName }) => {
  const { messages, sendMessage, selectRoom, isLoading } = useMessenger();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectRoom(roomId);
  }, [roomId, selectRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    try {
      await sendMessage(roomId, inputValue);
      setInputValue("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <TaxDomeCard className="h-full flex flex-col">
      {roomName && (
        <div className="border-b border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900">{roomName}</h3>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading messages...</p>
          </div>
        ) : (
          <>
            <MessageList messages={messages} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="border-t border-gray-200 p-4">
        <MessageInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          placeholder="Type a message..."
        />
      </div>
    </TaxDomeCard>
  );
};

