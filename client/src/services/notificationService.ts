import { apiRequest } from "@/lib/queryClient";

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
        const response = await apiRequest("GET", "/api/notifications");
        return response.json();
    },

    async markAsRead(id: number): Promise<Notification> {
        const response = await apiRequest("PATCH", `/api/notifications/${id}/read`);
        return response.json();
    },

    async markAllAsRead(): Promise<void> {
        await apiRequest("PATCH", "/api/notifications/read-all");
    },

    async deleteNotification(id: number): Promise<void> {
        await apiRequest("DELETE", `/api/notifications/${id}`);
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
