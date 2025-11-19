import { formatDistanceToNow } from "date-fns";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Notification } from "@/hooks/useNotifications";

interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
  onDelete: (id: string) => void;
  getIcon: (type: string) => JSX.Element;
}

export const NotificationItem = ({
  notification,
  onClick,
  onDelete,
  getIcon,
}: NotificationItemProps) => {
  return (
    <div
      className={cn(
        "p-4 hover:bg-accent/50 transition-colors cursor-pointer relative group",
        !notification.is_read && "bg-accent/30"
      )}
      onClick={() => onClick(notification)}
    >
      {/* Unread indicator dot */}
      {!notification.is_read && (
        <div className="absolute left-2 top-6 w-2 h-2 bg-blue-500 rounded-full" />
      )}

      <div className="flex gap-3 pl-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-xl">
          {getIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight mb-1">
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>

        {/* Delete button (shown on hover) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
