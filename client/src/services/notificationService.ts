export interface Notification {
    id: number;
    userId: number;
    type: string;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    readAt?: string;
    createdAt: string;
}


export const notificationService = {
    async getNotifications(): Promise<Notification[]> {
        const response = await fetch("/api/notifications");
        if (!response.ok) {
            throw new Error("Failed to fetch notifications");
        }
        return response.json();
    },

    async markAsRead(id: number): Promise<Notification> {
        const response = await fetch(`/api/notifications/${id}/read`, {
            method: "PATCH",
        });
        if (!response.ok) {
            throw new Error("Failed to mark notification as read");
        }
        return response.json();
    },

    async markAllAsRead(): Promise<void> {
        const response = await fetch("/api/notifications/read-all", {
            method: "PATCH",
        });
        if (!response.ok) {
            throw new Error("Failed to mark all notifications as read");
        }
    },

    async deleteNotification(id: number): Promise<void> {
        const response = await fetch(`/api/notifications/${id}`, {
            method: "DELETE",
        });
        if (!response.ok) {
            throw new Error("Failed to delete notification");
        }
    },

    async clearRead(): Promise<void> {
        const response = await fetch("/api/notifications/read", {
            method: "DELETE",
        });
        if (!response.ok) {
            throw new Error("Failed to clear read notifications");
        }
    },
};
