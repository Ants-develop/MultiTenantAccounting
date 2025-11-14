import React from "react";
import { MatrixMessage } from "@/services/messenger/messengerClient";
import dayjs from "dayjs";

interface MessageListProps {
  messages: MatrixMessage[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No messages yet. Start the conversation!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div key={message.id} className="flex flex-col">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              {message.sender.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-medium text-gray-900 text-sm">{message.sender}</span>
                <span className="text-xs text-gray-500">
                  {dayjs(message.timestamp).format("h:mm A")}
                </span>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                {message.content}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

