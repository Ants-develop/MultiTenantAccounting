// Notification Service
// High-level service for dispatching notifications

import { notificationWorker, NotificationOptions } from "../workers/notification-worker";
import { matrixBridge } from "./matrix-bridge";

class NotificationService {
  /**
   * Send a task reminder notification
   */
  async sendTaskReminder(taskId: number, taskTitle: string, assigneeId: number): Promise<void> {
    await notificationWorker.sendNotification({
      userId: assigneeId,
      title: "Task Reminder",
      message: `Task "${taskTitle}" is due soon.`,
      type: "warning",
      actionUrl: `/tasks/${taskId}`,
    });
  }

  /**
   * Send a task assignment notification
   */
  async sendTaskAssignment(taskId: number, taskTitle: string, assigneeId: number): Promise<void> {
    await notificationWorker.sendNotification({
      userId: assigneeId,
      title: "New Task Assigned",
      message: `You have been assigned to task "${taskTitle}".`,
      type: "info",
      actionUrl: `/tasks/${taskId}`,
    });
  }

  /**
   * Send a job stage change notification
   */
  async sendJobStageChange(jobId: number, jobTitle: string, stageName: string, userId: number): Promise<void> {
    await notificationWorker.sendNotification({
      userId,
      title: "Job Stage Changed",
      message: `Job "${jobTitle}" has moved to stage "${stageName}".`,
      type: "info",
      actionUrl: `/jobs/${jobId}`,
    });
  }

  /**
   * Send a Matrix message notification
   */
  async sendMatrixMessage(roomId: string, message: string): Promise<void> {
    if (matrixBridge.isReady()) {
      await matrixBridge.sendMessage({ roomId, message });
    } else {
      console.warn("[Notification Service] Matrix bridge not ready, skipping message");
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

