// Automation Engine Service
// Handles event-based automations and workflow triggers

import { db } from "../db";
import { automations, tasks, jobs, clients, emailTemplates, emailAccounts } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { emailService } from "./email-service";
import { activityLogger } from "./activity-logger";

/**
 * Automation Engine Class
 */
export class AutomationEngine {
  /**
   * Process an event and trigger matching automations
   */
  async processEvent(
    eventType: string,
    eventData: {
      workspaceId?: number;
      clientId?: number;
      userId?: number;
      targetType: string;
      targetId: number;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      // Find active automations that match this event type
      const matchingAutomations = await db
        .select()
        .from(automations)
        .where(
          and(
            eq(automations.isActive, true),
            eq(automations.triggerType, eventType)
          )
        );

      for (const automation of matchingAutomations) {
        // Check if workspace matches (if specified)
        if (automation.workspaceId && eventData.workspaceId !== automation.workspaceId) {
          continue;
        }

        // Evaluate trigger conditions
        const triggerConfig = automation.triggerConfig as any;
        if (this.evaluateTriggerConditions(triggerConfig, eventData)) {
          // Execute automation actions
          await this.executeActions(automation, eventData);
        }
      }
    } catch (error) {
      console.error("Error processing automation event:", error);
    }
  }

  /**
   * Evaluate trigger conditions
   */
  private evaluateTriggerConditions(
    triggerConfig: any,
    eventData: any
  ): boolean {
    if (!triggerConfig || !triggerConfig.conditions) {
      return true; // No conditions = always trigger
    }

    const conditions = triggerConfig.conditions;
    const operator = triggerConfig.operator || "AND"; // AND or OR

    const results = conditions.map((condition: any) => {
      switch (condition.type) {
        case "client_id":
          return eventData.clientId === condition.value;
        case "user_id":
          return eventData.userId === condition.value;
        case "metadata_field":
          return eventData.metadata?.[condition.field] === condition.value;
        default:
          return false;
      }
    });

    return operator === "OR"
      ? results.some((r: boolean) => r)
      : results.every((r: boolean) => r);
  }

  /**
   * Execute automation actions
   */
  private async executeActions(automation: any, eventData: any): Promise<void> {
    const actions = automation.actions as any[];
    if (!Array.isArray(actions)) return;

    for (const action of actions) {
      try {
        await this.executeAction(action, automation, eventData);
      } catch (error) {
        console.error(`Error executing action ${action.type}:`, error);
        // Continue with other actions even if one fails
      }
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: any,
    automation: any,
    eventData: any
  ): Promise<void> {
    switch (action.type) {
      case "create_folder":
        await this.createFolder(action, eventData);
        break;
      case "send_email":
        await this.sendEmail(action, automation, eventData);
        break;
      case "assign_task":
        await this.assignTask(action, automation, eventData);
        break;
      case "update_stage":
        await this.updateStage(action, eventData);
        break;
      case "send_reminder":
        await this.sendReminder(action, eventData);
        break;
      case "generate_document":
        await this.generateDocument(action, eventData);
        break;
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Create folder structure
   */
  private async createFolder(action: any, eventData: any): Promise<void> {
    // TODO: Implement folder creation logic
    // This could create client document folders, workspace folders, etc.
    console.log("Create folder action:", action, eventData);
  }

  /**
   * Send email using template
   */
  private async sendEmail(
    action: any,
    automation: any,
    eventData: any
  ): Promise<void> {
    try {
      const { templateId, to, variables } = action;

      // Get email template
      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, templateId))
        .limit(1);

      if (!template) {
        throw new Error(`Email template ${templateId} not found`);
      }

      // Render template with variables
      const rendered = emailService.renderTemplate(template, {
        ...variables,
        ...eventData.metadata,
      });

      // Get email account for the workspace/client
      const [emailAccount] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(
            eq(emailAccounts.isActive, true),
            automation.workspaceId
              ? eq(emailAccounts.clientId, automation.workspaceId)
              : undefined
          )
        )
        .limit(1);

      if (!emailAccount) {
        throw new Error("No active email account found");
      }

      // Send email
      await emailService.sendEmail(
        emailAccount.id,
        to || emailAccount.emailAddress,
        rendered.subject,
        rendered.bodyText,
        rendered.bodyHtml
      );
    } catch (error) {
      console.error("Error sending email in automation:", error);
      throw error;
    }
  }

  /**
   * Assign/create a task
   */
  private async assignTask(
    action: any,
    automation: any,
    eventData: any
  ): Promise<void> {
    try {
      const { title, description, assigneeId, priority, dueDate } = action;

      // Create task
      const [task] = await db
        .insert(tasks)
        .values({
          workspaceId: automation.workspaceId || eventData.workspaceId,
          jobId: eventData.targetType === "job" ? eventData.targetId : undefined,
          title: title || "Automated Task",
          description: description || "",
          status: "todo",
          priority: priority || "medium",
          assigneeId: assigneeId || eventData.userId,
          reporterId: eventData.userId,
          dueDate: dueDate ? new Date(dueDate) : undefined,
        })
        .returning();

      console.log("Created task via automation:", task.id);
    } catch (error) {
      console.error("Error creating task in automation:", error);
      throw error;
    }
  }

  /**
   * Update workflow stage
   */
  private async updateStage(action: any, eventData: any): Promise<void> {
    try {
      const { stageName } = action;

      if (eventData.targetType === "job") {
        await db
          .update(jobs)
          .set({ currentStage: stageName })
          .where(eq(jobs.id, eventData.targetId));
      }
    } catch (error) {
      console.error("Error updating stage in automation:", error);
      throw error;
    }
  }

  /**
   * Send reminder notification
   */
  private async sendReminder(action: any, eventData: any): Promise<void> {
    // TODO: Implement reminder sending
    // This could send email, push notification, etc.
    console.log("Send reminder action:", action, eventData);
  }

  /**
   * Generate document
   */
  private async generateDocument(action: any, eventData: any): Promise<void> {
    // TODO: Implement document generation
    // This could generate PDFs, contracts, etc.
    console.log("Generate document action:", action, eventData);
  }
}

export const automationEngine = new AutomationEngine();
