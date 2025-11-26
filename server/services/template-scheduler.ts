// Template Scheduler Service
// Handles cron expression parsing, next run calculation, and scheduled task creation

import { db } from "../db";
import { taskTemplates, clients } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import cron from "node-cron";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { instantiateTemplate } from "./template-instantiation";

dayjs.extend(utc);
dayjs.extend(timezone);

export interface ScheduleConfig {
  cronExpression: string;
  timezone?: string;
  perClient?: boolean;
  perUser?: boolean;
  clientSchedules?: Record<string, {
    cronExpression: string;
    assignedTo?: number;
  }>;
  lastRunAt?: string;
  nextRunAt?: string;
}

/**
 * Validate a cron expression
 */
export function parseCronExpression(cronExpression: string): boolean {
  try {
    return cron.validate(cronExpression);
  } catch (error) {
    return false;
  }
}

/**
 * Calculate the next run time for a cron expression
 */
export function calculateNextRun(
  cronExpression: string,
  timezone?: string
): Date | null {
  if (!parseCronExpression(cronExpression)) {
    return null;
  }

  try {
    // Get current time in the specified timezone or UTC
    const tz = timezone || "UTC";
    const now = dayjs().tz(tz);
    
    // Parse cron expression to get schedule
    const cronParts = cronExpression.split(" ");
    if (cronParts.length !== 5) {
      return null;
    }

    // Use dayjs to calculate next occurrence
    // This is a simplified approach - for production, consider using a library like later.js
    // or calculate based on cron expression parts
    let nextRun = now.add(1, "minute"); // Start with 1 minute ahead
    
    // For now, we'll use a simple approach: check if current time matches cron
    // and calculate next occurrence based on the pattern
    // In production, you'd want a more robust cron parser
    
    // For simplicity, we'll calculate next run by checking each minute
    // until we find a match (this is not efficient but works for now)
    for (let i = 0; i < 525600; i++) { // Max 1 year ahead
      const checkTime = now.add(i, "minute");
      if (matchesCron(checkTime, cronExpression, tz)) {
        return checkTime.toDate();
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error calculating next run:", error);
    return null;
  }
}

/**
 * Check if a given time matches a cron expression
 */
function matchesCron(time: dayjs.Dayjs, cronExpression: string, timezone: string): boolean {
  try {
    const cronParts = cronExpression.split(" ");
    if (cronParts.length !== 5) return false;

    const [minute, hour, dayOfMonth, month, dayOfWeek] = cronParts;
    
    const tzTime = time.tz(timezone);
    const currentMinute = tzTime.minute();
    const currentHour = tzTime.hour();
    const currentDayOfMonth = tzTime.date();
    const currentMonth = tzTime.month() + 1; // dayjs months are 0-indexed
    const currentDayOfWeek = tzTime.day(); // 0 = Sunday, 6 = Saturday

    // Check minute
    if (minute !== "*" && !matchesCronPart(currentMinute, minute)) return false;
    
    // Check hour
    if (hour !== "*" && !matchesCronPart(currentHour, hour)) return false;
    
    // Check day of month
    if (dayOfMonth !== "*" && !matchesCronPart(currentDayOfMonth, dayOfMonth)) return false;
    
    // Check month
    if (month !== "*" && !matchesCronPart(currentMonth, month)) return false;
    
    // Check day of week
    if (dayOfWeek !== "*" && !matchesCronPart(currentDayOfWeek, dayOfWeek)) return false;

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a value matches a cron part (supports *, ranges, lists, steps)
 */
function matchesCronPart(value: number, cronPart: string): boolean {
  // Exact match
  if (cronPart === value.toString()) return true;
  
  // Wildcard
  if (cronPart === "*") return true;
  
  // Range (e.g., "1-5")
  const rangeMatch = cronPart.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    return value >= start && value <= end;
  }
  
  // List (e.g., "1,3,5")
  if (cronPart.includes(",")) {
    const parts = cronPart.split(",").map(p => parseInt(p.trim()));
    return parts.includes(value);
  }
  
  // Step (e.g., "*/5" or "1-10/2")
  const stepMatch = cronPart.match(/^(.+)\/(\d+)$/);
  if (stepMatch) {
    const base = stepMatch[1];
    const step = parseInt(stepMatch[2]);
    
    if (base === "*") {
      return value % step === 0;
    }
    
    const baseRangeMatch = base.match(/^(\d+)-(\d+)$/);
    if (baseRangeMatch) {
      const start = parseInt(baseRangeMatch[1]);
      const end = parseInt(baseRangeMatch[2]);
      if (value >= start && value <= end) {
        return (value - start) % step === 0;
      }
    }
  }
  
  return false;
}

/**
 * Get all templates with enabled scheduling
 */
export async function getScheduledTemplates() {
  return await db
    .select()
    .from(taskTemplates)
    .where(eq(taskTemplates.scheduleEnabled, true));
}

/**
 * Check if a template should run now based on its schedule
 */
export function shouldRunTemplate(template: any): boolean {
  if (!template.scheduleEnabled || !template.scheduleConfig) {
    return false;
  }

  const config: ScheduleConfig = template.scheduleConfig as ScheduleConfig;
  const now = new Date();
  
  // Check if we have a nextRunAt and if it's time to run
  if (config.nextRunAt) {
    const nextRun = new Date(config.nextRunAt);
    // Run if nextRunAt is in the past or within the current minute
    const timeDiff = now.getTime() - nextRun.getTime();
    return timeDiff >= 0 && timeDiff < 60000; // Within 1 minute
  }

  // If no nextRunAt, check if current time matches cron
  const tz = config.timezone || "UTC";
  const tzNow = dayjs(now).tz(tz);
  
  if (config.perClient && config.clientSchedules) {
    // For per-client schedules, we'll check in the worker
    return false;
  }

  return matchesCron(tzNow, config.cronExpression, tz);
}

/**
 * Create tasks from a template based on schedule
 */
export async function createScheduledTasks(
  template: any,
  clientId?: number,
  assignedTo?: number
): Promise<void> {
  try {
    // Use the instantiateTemplate service to create the task
    // Use template's createdBy as the creator, or fallback to assignedTo if available
    const createdBy = template.createdBy || assignedTo || 1; // Fallback to system user
    
    await instantiateTemplate(
      template.id,
      clientId || template.clientId,
      createdBy,
      {} // Can be extended to support variables in scheduled tasks
    );

    // Update lastRunAt and calculate nextRunAt
    const config: ScheduleConfig = template.scheduleConfig as ScheduleConfig || {};
    const tz = config.timezone || "UTC";
    
    config.lastRunAt = new Date().toISOString();
    
    if (clientId && config.perClient && config.clientSchedules?.[clientId.toString()]) {
      // Calculate next run for this specific client
      const clientSchedule = config.clientSchedules[clientId.toString()];
      config.nextRunAt = calculateNextRun(clientSchedule.cronExpression, tz)?.toISOString() || undefined;
    } else {
      // Calculate next run for global schedule
      config.nextRunAt = calculateNextRun(config.cronExpression, tz)?.toISOString() || undefined;
    }

    // Update template with new schedule config
    await db
      .update(taskTemplates)
      .set({
        scheduleConfig: config,
        updatedAt: new Date(),
      })
      .where(eq(taskTemplates.id, template.id));
  } catch (error) {
    console.error(`Error creating scheduled tasks for template ${template.id}:`, error);
    throw error;
  }
}

