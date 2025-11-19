import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService, Notification } from "@/services/notificationService";
import { useToast } from "@/hooks/use-toast";

export function useNotifications() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: notificationService.getNotifications,
        refetchInterval: 30000, // Poll every 30 seconds
    });

    const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

    const markAsReadMutation = useMutation({
        mutationFn: notificationService.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to mark notification as read",
                variant: "destructive",
            });
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: notificationService.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            toast({
                title: "Success",
                description: "All notifications marked as read",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to mark all notifications as read",
                variant: "destructive",
            });
        },
    });

    const deleteNotificationMutation = useMutation({
        mutationFn: notificationService.deleteNotification,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            toast({
                title: "Success",
                description: "Notification deleted",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to delete notification",
                variant: "destructive",
            });
        },
    });

    const clearReadMutation = useMutation({
        mutationFn: notificationService.clearRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            toast({
                title: "Success",
                description: "Read notifications cleared",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to clear read notifications",
                variant: "destructive",
            });
        },
    });

    return {
        notifications,
        unreadCount,
        isLoading,
        markAsRead: markAsReadMutation.mutate,
        markAllAsRead: markAllAsReadMutation.mutate,
        deleteNotification: deleteNotificationMutation.mutate,
        clearRead: clearReadMutation.mutate,
    };
}
