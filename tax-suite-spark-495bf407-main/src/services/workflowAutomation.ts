import { supabase } from "@/integrations/supabase/client";
import { notificationService } from "./notificationService";

class WorkflowAutomationService {
  /**
   * Called when a workflow enters a new stage
   * Executes automation rules defined in the stage
   */
  async onStageEntered(workflowId: string, stageId: string) {
    try {
      // Fetch stage automation rules
      const { data: stage, error: stageError } = await supabase
        .from("workflow_stages")
        .select("*, workflow_templates(*)")
        .eq("id", stageId)
        .single();

      if (stageError) throw stageError;

      // Fetch workflow details
      const { data: workflow, error: workflowError } = await supabase
        .from("workflows")
        .select("*, clients(*)")
        .eq("id", workflowId)
        .single();

      if (workflowError) throw workflowError;

      const automationRules = stage.automation_rules || {};

      // Execute automation rules
      if (automationRules.create_tasks) {
        await this.createTasksFromTemplates(workflowId, stageId);
      }

      if (automationRules.send_notification) {
        await this.sendStageNotifications(workflow, stage);
      }

      if (automationRules.send_email) {
        await this.sendStageEmail(workflow, stage);
      }

      if (automationRules.update_due_date && workflow.assigned_to) {
        await this.updateWorkflowDueDate(workflowId, automationRules.due_date_offset_days);
      }

      console.log(`Stage automation executed for workflow ${workflowId}, stage ${stageId}`);
    } catch (error) {
      console.error("Error executing stage automation:", error);
    }
  }

  /**
   * Create tasks from task templates when entering a stage
   */
  private async createTasksFromTemplates(workflowId: string, stageId: string) {
    try {
      // Fetch task templates for this stage
      const { data: taskTemplates, error: templatesError } = await supabase
        .from("task_templates")
        .select("*")
        .eq("stage_id", stageId)
        .order("order_position", { ascending: true });

      if (templatesError) throw templatesError;
      if (!taskTemplates || taskTemplates.length === 0) return;

      // Fetch workflow details for client_id and assigned_to
      const { data: workflow, error: workflowError } = await supabase
        .from("workflows")
        .select("client_id, assigned_to")
        .eq("id", workflowId)
        .single();

      if (workflowError) throw workflowError;

      // Create tasks from templates
      const tasks = taskTemplates.map((template) => ({
        title: template.title,
        description: template.description,
        workflow_id: workflowId,
        stage_id: stageId,
        client_id: workflow.client_id,
        assigned_to: workflow.assigned_to,
        priority: template.priority,
        status: "todo" as const,
        order_position: template.order_position,
        created_by: workflow.assigned_to || "",
      }));

      const { error: insertError } = await supabase.from("tasks").insert(tasks);

      if (insertError) throw insertError;

      console.log(`Created ${tasks.length} tasks from templates for workflow ${workflowId}`);
    } catch (error) {
      console.error("Error creating tasks from templates:", error);
    }
  }

  /**
   * Send notifications when entering a stage
   */
  private async sendStageNotifications(workflow: any, stage: any) {
    try {
      if (workflow.assigned_to) {
        await notificationService.createNotification(
          workflow.assigned_to,
          "task_update",
          "Workflow Stage Updated",
          `"${workflow.name}" moved to stage: ${stage.name}`,
          `/workflows/${workflow.id}`
        );
      }

      // Notify client if they have portal access
      if (workflow.clients?.portal_enabled) {
        const { data: clientUsers } = await supabase
          .from("profiles")
          .select("id")
          .eq("client_id", workflow.client_id);

        if (clientUsers) {
          await notificationService.notifyMultipleUsers(
            clientUsers.map((u) => u.id),
            "workflow_update",
            "Work Progress Update",
            `Your ${stage.workflow_templates?.name} is now in: ${stage.name}`,
            `/portal/workflows/${workflow.id}`
          );
        }
      }
    } catch (error) {
      console.error("Error sending stage notifications:", error);
    }
  }

  /**
   * Send email when entering a stage
   */
  private async sendStageEmail(workflow: any, stage: any) {
    // TODO: Implement email sending via edge function
    console.log(`Email notification for stage change: ${workflow.id} -> ${stage.name}`);
  }

  /**
   * Update workflow due date based on stage entry
   */
  private async updateWorkflowDueDate(workflowId: string, offsetDays: number) {
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + offsetDays);

      await supabase
        .from("workflows")
        .update({ due_date: dueDate.toISOString() })
        .eq("id", workflowId);
    } catch (error) {
      console.error("Error updating due date:", error);
    }
  }

  /**
   * Check for overdue workflows and send alerts
   */
  async checkOverdueJobs() {
    try {
      const now = new Date().toISOString();

      const { data: overdueWorkflows, error } = await supabase
        .from("workflows")
        .select("*, profiles!workflows_assigned_to_fkey(id, full_name)")
        .lt("due_date", now)
        .eq("status", "active");

      if (error) throw error;
      if (!overdueWorkflows || overdueWorkflows.length === 0) return;

      // Send notifications for overdue jobs
      for (const workflow of overdueWorkflows) {
        if (workflow.assigned_to) {
          await notificationService.createNotification(
            workflow.assigned_to,
            "workflow_update",
            "Workflow Overdue",
            `"${workflow.name}" is past its due date`,
            `/workflows/${workflow.id}`
          );
        }
      }

      console.log(`Sent ${overdueWorkflows.length} overdue workflow notifications`);
    } catch (error) {
      console.error("Error checking overdue jobs:", error);
    }
  }

  /**
   * Auto-create recurring jobs for active client services
   * Should be run periodically (daily/weekly)
   */
  async autoCreateRecurringJobs() {
    try {
      const { data: activeServices, error } = await supabase
        .from("client_services")
        .select("*, workflow_templates(*, workflow_stages(*))")
        .eq("is_active", true)
        .in("frequency", ["monthly", "quarterly", "annual"]);

      if (error) throw error;
      if (!activeServices || activeServices.length === 0) return;

      // TODO: Implement logic to check which periods need jobs created
      // and create them automatically

      console.log(`Checked ${activeServices.length} active services for auto-creation`);
    } catch (error) {
      console.error("Error auto-creating recurring jobs:", error);
    }
  }
}

export const workflowAutomation = new WorkflowAutomationService();
