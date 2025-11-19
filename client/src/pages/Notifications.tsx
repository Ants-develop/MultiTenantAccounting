import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Trash2 } from "lucide-react";

export default function Notifications() {
    const {
        notifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearRead,
    } = useNotifications();

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => markAllAsRead()}>
                        <Check className="mr-2 h-4 w-4" />
                        Mark all as read
                    </Button>
                    <Button variant="outline" onClick={() => clearRead()}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear read
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                    {notifications.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No notifications found
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onRead={markAsRead}
                                    onDelete={deleteNotification}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
