import React from "react";
import { TaxDomeCard, TaxDomeBadge } from "@/components/taxdome";
import { Bell, X } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onMarkAsRead: (id: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onDismiss,
  onMarkAsRead,
}) => {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const typeColors = {
    info: "info",
    success: "success",
    warning: "warning",
    error: "error",
  } as const;

  return (
    <TaxDomeCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <TaxDomeBadge variant="error" size="sm">
              {unreadCount}
            </TaxDomeBadge>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No notifications
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border ${
                notification.read ? "bg-gray-50 border-gray-200" : "bg-white border-blue-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TaxDomeBadge variant={typeColors[notification.type]} size="sm">
                      {notification.type}
                    </TaxDomeBadge>
                    <span className="text-sm font-medium text-gray-900">{notification.title}</span>
                  </div>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <span className="text-xs text-gray-400 mt-1 block">
                    {new Date(notification.timestamp).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={() => onDismiss(notification.id)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </TaxDomeCard>
  );
};

