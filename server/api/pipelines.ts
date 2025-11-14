// Pipelines API Routes
import express from "express";
import { db } from "../db";
import { pipelines, workspaces } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Validation schemas
const createPipelineSchema = z.object({
  workspaceId: z.number().int().positive(),
  name: z.string().min(1, "Pipeline name is required"),
  description: z.string().optional(),
  stages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    order: z.number().int(),
    taskTemplates: z.array(z.object({
      title: z.string(),
      description: z.string().optional(),
      assigneeId: z.number().int().positive().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    })).optional(),
  })).min(1, "At least one stage is required"),
  isActive: z.boolean().optional().default(true),
});

const updatePipelineSchema = createPipelineSchema.partial().extend({
  id: z.number().int().positive(),
});

// GET /api/pipelines - List pipelines
router.get("/", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : undefined;

    let query = db.select().from(pipelines);

    if (workspaceId) {
      query = query.where(eq(pipelines.workspaceId, workspaceId)) as any;
    }

    const result = await query;
    res.json(result);
  } catch (error) {
    console.error("[Pipelines API] Error fetching pipelines:", error);
    res.status(500).json({ message: "Failed to fetch pipelines" });
  }
});

// GET /api/pipelines/:id - Get pipeline by ID
router.get("/:id", async (req: any, res: any) => {
  try {
    const pipelineId = parseInt(req.params.id);
    if (isNaN(pipelineId)) {
      return res.status(400).json({ message: "Invalid pipeline ID" });
    }

    const [pipeline] = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, pipelineId))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({ message: "Pipeline not found" });
    }

    res.json(pipeline);
  } catch (error) {
    console.error("[Pipelines API] Error fetching pipeline:", error);
    res.status(500).json({ message: "Failed to fetch pipeline" });
  }
});

// POST /api/pipelines - Create pipeline
router.post("/", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const data = createPipelineSchema.parse(req.body);

    // Verify workspace exists and user has access
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, data.workspaceId))
      .limit(1);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const [pipeline] = await db
      .insert(pipelines)
      .values({
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        stages: data.stages as any,
        isActive: data.isActive,
        createdBy: userId,
      })
      .returning();

    res.status(201).json(pipeline);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[Pipelines API] Error creating pipeline:", error);
    res.status(500).json({ message: "Failed to create pipeline" });
  }
});

// PUT /api/pipelines/:id - Update pipeline
router.put("/:id", async (req: any, res: any) => {
  try {
    const pipelineId = parseInt(req.params.id);
    if (isNaN(pipelineId)) {
      return res.status(400).json({ message: "Invalid pipeline ID" });
    }

    const data = updatePipelineSchema.parse({ ...req.body, id: pipelineId });

    const [existing] = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, pipelineId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Pipeline not found" });
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.stages !== undefined) updateData.stages = data.stages;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await db
      .update(pipelines)
      .set(updateData)
      .where(eq(pipelines.id, pipelineId))
      .returning();

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[Pipelines API] Error updating pipeline:", error);
    res.status(500).json({ message: "Failed to update pipeline" });
  }
});

// DELETE /api/pipelines/:id - Delete pipeline
router.delete("/:id", async (req: any, res: any) => {
  try {
    const pipelineId = parseInt(req.params.id);
    if (isNaN(pipelineId)) {
      return res.status(400).json({ message: "Invalid pipeline ID" });
    }

    const [existing] = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, pipelineId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Pipeline not found" });
    }

    await db.delete(pipelines).where(eq(pipelines.id, pipelineId));

    res.status(204).send();
  } catch (error) {
    console.error("[Pipelines API] Error deleting pipeline:", error);
    res.status(500).json({ message: "Failed to delete pipeline" });
  }
});

export default router;

