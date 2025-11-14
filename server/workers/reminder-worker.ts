// Reminder Worker
// Processes task reminders and sends notifications

import { db } from "../db";
import { tasks } from "@shared/schema";
import { eq, and, lte, ne } from "drizzle-orm";

class ReminderWorker {
  /**
   * Process task reminders
   * Should be called periodically (e.g., every 5 minutes)
   */
  async processReminders(): Promise<void> {
    const now = new Date();
    const reminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Find tasks with due dates in the next 24 hours that haven't been completed
    const tasksNeedingReminders = await db
      .select()
      .from(tasks)
      .where(
        and(
          ne(tasks.status, "done"),
          lte(tasks.dueDate, reminderTime),
          lte(tasks.dueDate, now) // Due date is in the past or near future
        )
      );

    console.log(`[Reminder Worker] Found ${tasksNeedingReminders.length} tasks needing reminders`);

    // TODO: Send notifications via Matrix, email, or push
    for (const task of tasksNeedingReminders) {
      console.log(`[Reminder Worker] Sending reminder for task ${task.id}: ${task.title}`);
      // await notificationService.sendReminder(task);
    }
  }
}

// Export singleton instance
export const reminderWorker = new ReminderWorker();

