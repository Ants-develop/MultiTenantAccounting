// Recurring Tasks Service
// Handles generation of recurring tasks based on patterns

import { db } from "../db";
import { tasks } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import dayjs from "dayjs";

/**
 * Recurring Tasks Service Class
 */
export class RecurringTasksService {
  /**
   * Generate recurring tasks based on patterns
   * Should be called by a cron job or scheduled task
   */
  async generateRecurringTasks(): Promise<void> {
    try {
      // Find all tasks with recurrence patterns that haven't ended
      const recurringTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            // Has recurrence pattern
            sql`${tasks.recurrencePattern} IS NOT NULL`,
            // Hasn't reached end date (or no end date)
            sql`(${tasks.recurrenceEndDate} IS NULL OR ${tasks.recurrenceEndDate} > NOW())`
          )
        );

      for (const task of recurringTasks) {
        await this.processRecurringTask(task);
      }
    } catch (error) {
      console.error("Error generating recurring tasks:", error);
    }
  }

  /**
   * Process a single recurring task
   */
  private async processRecurringTask(task: any): Promise<void> {
    try {
      const pattern = task.recurrencePattern as any;
      if (!pattern || !pattern.frequency) return;

      const frequency = pattern.frequency; // 'monthly', 'quarterly', 'annual'
      const interval = pattern.interval || 1; // Every N months/quarters/years
      const lastGenerated = task.metadata?.lastRecurrenceGenerated
        ? dayjs(task.metadata.lastRecurrenceGenerated)
        : dayjs(task.createdAt);

      const now = dayjs();
      let shouldGenerate = false;
      let nextDueDate: Date | null = null;

      switch (frequency) {
        case "monthly":
          // Generate if it's been at least `interval` months since last generation
          const monthsSince = now.diff(lastGenerated, "month");
          if (monthsSince >= interval) {
            shouldGenerate = true;
            nextDueDate = this.calculateNextDueDate(task.dueDate, frequency, interval);
          }
          break;

        case "quarterly":
          const quartersSince = now.diff(lastGenerated, "quarter");
          if (quartersSince >= interval) {
            shouldGenerate = true;
            nextDueDate = this.calculateNextDueDate(task.dueDate, frequency, interval);
          }
          break;

        case "annual":
          const yearsSince = now.diff(lastGenerated, "year");
          if (yearsSince >= interval) {
            shouldGenerate = true;
            nextDueDate = this.calculateNextDueDate(task.dueDate, frequency, interval);
          }
          break;
      }

      if (shouldGenerate) {
        await this.createRecurringTaskInstance(task, nextDueDate);
      }
    } catch (error) {
      console.error(`Error processing recurring task ${task.id}:`, error);
    }
  }

  /**
   * Calculate next due date based on pattern
   */
  private calculateNextDueDate(
    originalDueDate: Date | null,
    frequency: string,
    interval: number
  ): Date {
    const baseDate = originalDueDate ? dayjs(originalDueDate) : dayjs();
    let nextDate = baseDate;

    switch (frequency) {
      case "monthly":
        nextDate = baseDate.add(interval, "month");
        break;
      case "quarterly":
        nextDate = baseDate.add(interval * 3, "month");
        break;
      case "annual":
        nextDate = baseDate.add(interval, "year");
        break;
    }

    return nextDate.toDate();
  }

  /**
   * Create a new instance of a recurring task
   */
  private async createRecurringTaskInstance(
    originalTask: any,
    dueDate: Date | null
  ): Promise<void> {
    try {
      // Create new task instance
      const [newTask] = await db
        .insert(tasks)
        .values({
          workspaceId: originalTask.workspaceId,
          jobId: originalTask.jobId,
          title: originalTask.title,
          description: originalTask.description,
          status: "todo",
          priority: originalTask.priority,
          assigneeId: originalTask.assigneeId,
          reporterId: originalTask.reporterId,
          dueDate: dueDate || originalTask.dueDate,
          startDate: null,
          recurrencePattern: originalTask.recurrencePattern, // Inherit pattern
          recurrenceEndDate: originalTask.recurrenceEndDate,
          dependsOnTaskId: originalTask.dependsOnTaskId,
          metadata: {
            ...originalTask.metadata,
            isRecurringInstance: true,
            originalTaskId: originalTask.id,
          },
        })
        .returning();

      // Update original task's metadata to track last generation
      await db
        .update(tasks)
        .set({
          metadata: {
            ...originalTask.metadata,
            lastRecurrenceGenerated: new Date().toISOString(),
          },
        })
        .where(eq(tasks.id, originalTask.id));

      console.log(`Generated recurring task instance: ${newTask.id} from task ${originalTask.id}`);
    } catch (error) {
      console.error("Error creating recurring task instance:", error);
      throw error;
    }
  }

  /**
   * Resolve task dependencies
   * Returns tasks that can be started (all dependencies completed)
   */
  async getReadyTasks(workspaceId?: number): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.status, "todo"),
            sql`${tasks.dependsOnTaskId} IS NOT NULL`
          )
        );

      if (workspaceId) {
        query = query.where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.status, "todo")));
      }

      const dependentTasks = await query;

      // Filter to only tasks whose dependencies are completed
      const readyTasks = [];
      for (const task of dependentTasks) {
        if (task.dependsOnTaskId) {
          const [dependency] = await db
            .select()
            .from(tasks)
            .where(eq(tasks.id, task.dependsOnTaskId))
            .limit(1);

          if (dependency && dependency.status === "done") {
            readyTasks.push(task);
          }
        }
      }

      return readyTasks;
    } catch (error) {
      console.error("Error resolving task dependencies:", error);
      return [];
    }
  }

  /**
   * Calculate SLA due date based on priority and creation date
   */
  calculateSLADueDate(priority: string, createdAt: Date): Date {
    const baseDate = dayjs(createdAt);
    let daysToAdd = 7; // Default: 7 days

    switch (priority) {
      case "urgent":
        daysToAdd = 1; // 1 day
        break;
      case "high":
        daysToAdd = 3; // 3 days
        break;
      case "medium":
        daysToAdd = 7; // 7 days
        break;
      case "low":
        daysToAdd = 14; // 14 days
        break;
    }

    return baseDate.add(daysToAdd, "day").toDate();
  }
}

export const recurringTasksService = new RecurringTasksService();

