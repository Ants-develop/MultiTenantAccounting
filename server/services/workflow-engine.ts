// Workflow Engine Service
// Handles pipeline execution and task creation from pipeline templates

import { db } from "../db";
import { pipelines, jobs, tasks } from "@shared/schema";
import { eq } from "drizzle-orm";

interface PipelineStage {
  id: string;
  name: string;
  order: number;
  taskTemplates?: Array<{
    title: string;
    description?: string;
    assigneeId?: number;
    priority?: "low" | "medium" | "high" | "urgent";
  }>;
}

interface CreateJobFromPipelineOptions {
  pipelineId: number;
  workspaceId: number;
  clientId?: number;
  title: string;
  description?: string;
  assignedTo?: number;
  dueDate?: Date;
}

class WorkflowEngine {
  /**
   * Create a job from a pipeline and generate all tasks
   */
  async createJobFromPipeline(options: CreateJobFromPipelineOptions): Promise<number> {
    // Fetch pipeline
    const [pipeline] = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, options.pipelineId))
      .limit(1);

    if (!pipeline) {
      throw new Error("Pipeline not found");
    }

    if (!pipeline.isActive) {
      throw new Error("Pipeline is not active");
    }

    const stages = pipeline.stages as unknown as PipelineStage[];

    // Create job
    const [job] = await db
      .insert(jobs)
      .values({
        workspaceId: options.workspaceId,
        pipelineId: options.pipelineId,
        clientId: options.clientId,
        title: options.title,
        description: options.description,
        status: "active",
        currentStage: stages[0]?.id || null,
        assignedTo: options.assignedTo,
        dueDate: options.dueDate,
        createdBy: options.assignedTo, // Use assignedTo as creator for now
      })
      .returning();

    // Create tasks from pipeline stages
    const createdTasks = [];
    for (const stage of stages) {
      if (stage.taskTemplates && stage.taskTemplates.length > 0) {
        for (const template of stage.taskTemplates) {
          const [task] = await db
            .insert(tasks)
            .values({
              workspaceId: options.workspaceId,
              jobId: job.id,
              title: template.title,
              description: template.description,
              status: "todo",
              priority: template.priority || "medium",
              assigneeId: template.assigneeId || options.assignedTo,
              reporterId: options.assignedTo,
            })
            .returning();

          createdTasks.push(task);
        }
      }
    }

    console.log(`[Workflow Engine] Created job ${job.id} with ${createdTasks.length} tasks from pipeline ${options.pipelineId}`);

    return job.id;
  }

  /**
   * Move job to next stage
   */
  async moveJobToStage(jobId: number, stageId: string): Promise<void> {
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!job) {
      throw new Error("Job not found");
    }

    if (!job.pipelineId) {
      throw new Error("Job does not have a pipeline");
    }

    const [pipeline] = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, job.pipelineId))
      .limit(1);

    if (!pipeline) {
      throw new Error("Pipeline not found");
    }

    const stages = pipeline.stages as unknown as PipelineStage[];
    const targetStage = stages.find(s => s.id === stageId);

    if (!targetStage) {
      throw new Error("Stage not found in pipeline");
    }

    // Update job stage
    await db
      .update(jobs)
      .set({ currentStage: stageId })
      .where(eq(jobs.id, jobId));

    // Create tasks for the new stage if templates exist
    if (targetStage.taskTemplates && targetStage.taskTemplates.length > 0) {
      for (const template of targetStage.taskTemplates) {
        await db
          .insert(tasks)
          .values({
            workspaceId: job.workspaceId,
            jobId: job.id,
            title: template.title,
            description: template.description,
            status: "todo",
            priority: template.priority || "medium",
            assigneeId: template.assigneeId || job.assignedTo,
            reporterId: job.createdBy,
          });
      }
    }

    console.log(`[Workflow Engine] Moved job ${jobId} to stage ${stageId}`);
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();

