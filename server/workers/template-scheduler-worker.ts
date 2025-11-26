// Template Scheduler Worker
// Processes scheduled templates and creates tasks automatically

import { getScheduledTemplates, shouldRunTemplate, createScheduledTasks, ScheduleConfig } from "../services/template-scheduler";
import { clients } from "@shared/schema";
import { db } from "../db";
import cron from "node-cron";

class TemplateSchedulerWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Process all scheduled templates
   * Should be called every minute
   */
  async processScheduledTemplates(): Promise<void> {
    if (this.isRunning) {
      console.log("[Template Scheduler Worker] Already running, skipping...");
      return;
    }

    this.isRunning = true;
    try {
      let templates;
      try {
        templates = await getScheduledTemplates();
      } catch (error: any) {
        // Handle database connection errors gracefully
        if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout') || error?.message?.includes('Connection terminated')) {
          console.warn("[Template Scheduler Worker] Database connection timeout, will retry on next cycle");
          return;
        }
        throw error; // Re-throw other errors
      }
      
      console.log(`[Template Scheduler Worker] Checking ${templates.length} scheduled templates`);

      for (const template of templates) {
        try {
          const config: ScheduleConfig = (template.scheduleConfig as ScheduleConfig) || {};

          if (!config.cronExpression) {
            console.warn(`[Template Scheduler Worker] Template ${template.id} has no cron expression`);
            continue;
          }

          // Check if template has per-client scheduling
          if (config.perClient && config.clientSchedules) {
            // Process each client's schedule
            for (const [clientIdStr, clientSchedule] of Object.entries(config.clientSchedules)) {
              const clientId = parseInt(clientIdStr);
              
              if (isNaN(clientId)) {
                console.warn(`[Template Scheduler Worker] Invalid client ID: ${clientIdStr}`);
                continue;
              }

              // Check if this client's schedule should run now
              const shouldRun = this.shouldRunClientSchedule(clientSchedule.cronExpression, config.timezone);
              
              if (shouldRun) {
                console.log(`[Template Scheduler Worker] Creating task from template ${template.id} for client ${clientId}`);
                await createScheduledTasks(
                  template,
                  clientId,
                  clientSchedule.assignedTo
                );
              }
            }
          } else {
            // Global schedule - check if it should run
            if (shouldRunTemplate(template)) {
              console.log(`[Template Scheduler Worker] Creating task from template ${template.id} for all clients`);
              
              // If template has a specific clientId, create for that client only
              if (template.clientId) {
                await createScheduledTasks(template, template.clientId);
              } else {
                // If template is public, create for all accessible clients
                // For now, we'll create for the template's clientId if it exists
                // In a full implementation, you might want to get all clients the template creator has access to
                console.log(`[Template Scheduler Worker] Template ${template.id} has no clientId, skipping`);
              }
            }
          }
        } catch (error) {
          console.error(`[Template Scheduler Worker] Error processing template ${template.id}:`, error);
        }
      }
    } catch (error) {
      console.error("[Template Scheduler Worker] Error processing scheduled templates:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check if a client schedule should run now
   */
  private shouldRunClientSchedule(cronExpression: string, timezone?: string): boolean {
    try {
      const now = new Date();
      const tz = timezone || "UTC";
      
      // Use a simple check: if nextRunAt is in the past or within current minute
      // For a more robust implementation, you'd want to check the actual cron expression
      // For now, we'll rely on the nextRunAt calculation in the scheduler service
      return true; // Simplified - actual implementation would check cron match
    } catch (error) {
      console.error("[Template Scheduler Worker] Error checking client schedule:", error);
      return false;
    }
  }

  /**
   * Start the worker (runs every minute)
   */
  start(): void {
    if (this.intervalId) {
      console.log("[Template Scheduler Worker] Already started");
      return;
    }

    console.log("[Template Scheduler Worker] Starting...");
    
    // Delay initial run to ensure database connection is ready
    // Run after 5 seconds to give the database connection time to establish
    setTimeout(() => {
      this.processScheduledTemplates().catch((error) => {
        console.error("[Template Scheduler Worker] Error in initial run:", error.message);
      });
    }, 5000);

    // Then run every minute
    this.intervalId = setInterval(() => {
      this.processScheduledTemplates().catch((error) => {
        // Only log if it's not a connection timeout (those are expected and handled)
        if (!error?.message?.includes('timeout') && !error?.message?.includes('Connection terminated')) {
          console.error("[Template Scheduler Worker] Error processing scheduled templates:", error);
        }
      });
    }, 60 * 1000); // 60 seconds

    console.log("[Template Scheduler Worker] Started (running every minute, initial run in 5 seconds)");
  }

  /**
   * Stop the worker
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[Template Scheduler Worker] Stopped");
    }
  }
}

// Export singleton instance
export const templateSchedulerWorker = new TemplateSchedulerWorker();

