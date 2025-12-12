import { db } from "../db";
import { notifications } from "@shared/schema";

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  try {
    await db.insert(notifications).values({
      userId,
      type,
      title,
      message,
      link,
      isRead: false,
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}
