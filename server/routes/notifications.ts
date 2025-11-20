import { Router } from "express";
import { db } from "../db";
import { notifications, insertNotificationSchema } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Get all notifications for the current user
router.get("/", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const userNotifications = await db
            .select()
            .from(notifications)
            .where(eq(notifications.userId, userId))
            .orderBy(desc(notifications.createdAt));

        res.json(userNotifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
});

// Create a notification (Internal use or via API)
router.post("/", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const data = insertNotificationSchema.parse(req.body);
        const [notification] = await db
            .insert(notifications)
            .values(data)
            .returning();

        res.status(201).json(notification);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Invalid data", errors: error.errors });
        }
        console.error("Error creating notification:", error);
        res.status(500).json({ message: "Failed to create notification" });
    }
});

// Mark a notification as read
router.patch("/:id/read", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
        return res.status(400).json({ message: "Invalid notification ID" });
    }

    try {
        const [updated] = await db
            .update(notifications)
            .set({ isRead: true, readAt: new Date() })
            .where(
                and(
                    eq(notifications.id, notificationId),
                    eq(notifications.userId, userId)
                )
            )
            .returning();

        if (!updated) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.json(updated);
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Failed to update notification" });
    }
});

// Mark all notifications as read
router.patch("/read-all", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        await db
            .update(notifications)
            .set({ isRead: true, readAt: new Date() })
            .where(eq(notifications.userId, userId));

        res.json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ message: "Failed to update notifications" });
    }
});

// Delete a notification
router.delete("/:id", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
        return res.status(400).json({ message: "Invalid notification ID" });
    }

    try {
        const [deleted] = await db
            .delete(notifications)
            .where(
                and(
                    eq(notifications.id, notificationId),
                    eq(notifications.userId, userId)
                )
            )
            .returning();

        if (!deleted) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.json({ message: "Notification deleted" });
    } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({ message: "Failed to delete notification" });
    }
});

// Delete all read notifications
router.delete("/read", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        await db
            .delete(notifications)
            .where(
                and(
                    eq(notifications.userId, userId),
                    eq(notifications.isRead, true)
                )
            );

        res.json({ message: "Read notifications deleted" });
    } catch (error) {
        console.error("Error deleting read notifications:", error);
        res.status(500).json({ message: "Failed to delete notifications" });
    }
});

export default router;
