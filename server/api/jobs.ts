// Jobs API Routes
import express from "express";
import { db } from "../db";
import { jobs, pipelines, workspaces, clients } from "@shared/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Validation schemas
const createJobSchema = z.object({
  workspaceId: z.number().int().positive(),
  pipelineId: z.number().int().positive().optional(),
  clientId: z.number().int().positive().optional(),
  title: z.string().min(1, "Job title is required"),
  description: z.string().optional(),
  status: z.enum(["active", "completed", "cancelled", "on_hold"]).optional().default("active"),
  currentStage: z.string().optional(),
  assignedTo: z.number().int().positive().optional(),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateJobSchema = createJobSchema.partial().extend({
  id: z.number().int().positive(),
});

// GET /api/jobs - List jobs with filters
router.get("/", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : undefined;
    const status = req.query.status as string | undefined;
    const assignedTo = req.query.assignedTo ? parseInt(req.query.assignedTo as string) : undefined;

    let query = db.select({
      id: jobs.id,
      workspaceId: jobs.workspaceId,
      pipelineId: jobs.pipelineId,
      clientId: jobs.clientId,
      title: jobs.title,
      description: jobs.description,
      status: jobs.status,
      currentStage: jobs.currentStage,
      metadata: jobs.metadata,
      matrixRoomId: jobs.matrixRoomId,
      createdBy: jobs.createdBy,
      assignedTo: jobs.assignedTo,
      dueDate: jobs.dueDate,
      completedAt: jobs.completedAt,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
    }).from(jobs);

    const conditions = [];
    if (workspaceId) {
      conditions.push(eq(jobs.workspaceId, workspaceId));
    }
    if (status) {
      conditions.push(eq(jobs.status, status));
    }
    if (assignedTo) {
      conditions.push(eq(jobs.assignedTo, assignedTo));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(jobs.createdAt)) as any;

    const result = await query;
    res.json(result);
  } catch (error) {
    console.error("[Jobs API] Error fetching jobs:", error);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
});

// GET /api/jobs/:id - Get job by ID
router.get("/:id", async (req: any, res: any) => {
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(job);
  } catch (error) {
    console.error("[Jobs API] Error fetching job:", error);
    res.status(500).json({ message: "Failed to fetch job" });
  }
});

// POST /api/jobs - Create job
router.post("/", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const data = createJobSchema.parse(req.body);

    // Verify workspace exists
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, data.workspaceId))
      .limit(1);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // If pipelineId provided, verify it exists
    if (data.pipelineId) {
      const [pipeline] = await db
        .select()
        .from(pipelines)
        .where(eq(pipelines.id, data.pipelineId))
        .limit(1);

      if (!pipeline) {
        return res.status(404).json({ message: "Pipeline not found" });
      }
    }

    const [job] = await db
      .insert(jobs)
      .values({
        workspaceId: data.workspaceId,
        pipelineId: data.pipelineId,
        clientId: data.clientId,
        title: data.title,
        description: data.description,
        status: data.status,
        currentStage: data.currentStage,
        assignedTo: data.assignedTo,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        metadata: data.metadata as any,
        createdBy: userId,
      })
      .returning();

    res.status(201).json(job);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[Jobs API] Error creating job:", error);
    res.status(500).json({ message: "Failed to create job" });
  }
});

// PATCH /api/jobs/:id - Update job
router.patch("/:id", async (req: any, res: any) => {
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const data = updateJobSchema.parse({ ...req.body, id: jobId });

    const [existing] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Job not found" });
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.currentStage !== undefined) updateData.currentStage = data.currentStage;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    if (data.status === "completed") {
      updateData.completedAt = new Date();
    }

    const [updated] = await db
      .update(jobs)
      .set(updateData)
      .where(eq(jobs.id, jobId))
      .returning();

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[Jobs API] Error updating job:", error);
    res.status(500).json({ message: "Failed to update job" });
  }
});

// DELETE /api/jobs/:id - Delete job
router.delete("/:id", async (req: any, res: any) => {
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const [existing] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Job not found" });
    }

    await db.delete(jobs).where(eq(jobs.id, jobId));

    res.status(204).send();
  } catch (error) {
    console.error("[Jobs API] Error deleting job:", error);
    res.status(500).json({ message: "Failed to delete job" });
  }
});

export default router;

