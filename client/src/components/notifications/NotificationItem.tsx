import { formatDistanceToNow } from "date-fns";
import { Check, Trash2, Bell, Info, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Notification } from "@/services/notificationService";

interface NotificationItemProps {
    notification: Notification;
    onRead: (id: number) => void;
    onDelete: (id: number) => void;
}

export function NotificationItem({ notification, onRead, onDelete }: NotificationItemProps) {
    const getIcon = (type: string) => {
        switch (type) {
            case "success":
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "warning":
                return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
            case "error":
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <div
            className={cn(
                "relative flex gap-4 p-4 transition-colors hover:bg-muted/50 group",
                !notification.isRead && "bg-muted/30"
            )}
        >
            <div className="mt-1">{getIcon(notification.type)}</div>
            <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm font-medium leading-none", !notification.isRead && "font-semibold")}>
                        {notification.title}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                    {notification.message}
                </p>
                {!notification.isRead && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                        onClick={() => onRead(notification.id)}
                    >
                        Mark as read
                    </Button>
                )}
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onDelete(notification.id)}
            >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
            </Button>
            {!notification.isRead && (
                <div className="absolute left-0 top-4 h-2 w-2 -translate-x-1 rounded-full bg-primary" />
            )}
        </div>
    );
}
