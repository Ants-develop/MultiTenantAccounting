// Tasks API Routes (TaxDome-style)
import express from "express";
import { db } from "../db";
import { tasks, jobs, workspaces, subtasks } from "@shared/schema";
import { eq, and, inArray, desc, or, isNull } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Validation schemas
const createTaskSchema = z.object({
  workspaceId: z.number().int().positive(),
  jobId: z.number().int().positive().optional(),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "done", "cancelled", "blocked"]).optional().default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  assigneeId: z.number().int().positive().optional(),
  reporterId: z.number().int().positive().optional(),
  dueDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  recurrence: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  createMatrixRoom: z.boolean().optional().default(false), // Flag to create Matrix room
});

const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.number().int().positive(),
});

// GET /api/tasks - List tasks (Kanban-ready)
router.get("/", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : undefined;
    const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : undefined;
    const status = req.query.status as string | undefined;
    const assigneeId = req.query.assigneeId ? parseInt(req.query.assigneeId as string) : undefined;
    const priority = req.query.priority as string | undefined;

    let query = db.select().from(tasks);

    const conditions = [];
    if (workspaceId) {
      conditions.push(eq(tasks.workspaceId, workspaceId));
    }
    if (jobId) {
      conditions.push(eq(tasks.jobId, jobId));
    }
    if (status) {
      conditions.push(eq(tasks.status, status));
    }
    if (assigneeId) {
      conditions.push(eq(tasks.assigneeId, assigneeId));
    }
    if (priority) {
      conditions.push(eq(tasks.priority, priority));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(tasks.createdAt)) as any;

    const result = await query;
    res.json(result);
  } catch (error) {
    console.error("[Tasks API] Error fetching tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// GET /api/tasks/:id - Get task by ID
router.get("/:id", async (req: any, res: any) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Fetch subtasks
    const taskSubtasks = await db
      .select()
      .from(subtasks)
      .where(eq(subtasks.taskId, taskId))
      .orderBy(subtasks.orderIndex);

    res.json({ ...task, subtasks: taskSubtasks });
  } catch (error) {
    console.error("[Tasks API] Error fetching task:", error);
    res.status(500).json({ message: "Failed to fetch task" });
  }
});

// POST /api/tasks - Create task
router.post("/", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const data = createTaskSchema.parse(req.body);

    // Verify workspace exists
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, data.workspaceId))
      .limit(1);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // If jobId provided, verify it exists
    if (data.jobId) {
      const [job] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, data.jobId))
        .limit(1);

      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
    }

    // TODO: Create Matrix room if createMatrixRoom is true
    // This will be implemented when Matrix bridge is ready
    const matrixRoomId = data.createMatrixRoom ? null : null; // Placeholder

    const [task] = await db
      .insert(tasks)
      .values({
        workspaceId: data.workspaceId,
        jobId: data.jobId,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        assigneeId: data.assigneeId,
        reporterId: data.reporterId || userId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        recurrence: data.recurrence as any,
        metadata: data.metadata as any,
        matrixRoomId: matrixRoomId,
      })
      .returning();

    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[Tasks API] Error creating task:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
});

// PATCH /api/tasks/:id - Update task
router.patch("/:id", async (req: any, res: any) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const data = updateTaskSchema.parse({ ...req.body, id: taskId });

    const [existing] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.recurrence !== undefined) updateData.recurrence = data.recurrence;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;
    if (data.status === "done") {
      updateData.completedAt = new Date();
    } else if (data.status !== "done" && existing.status === "done") {
      updateData.completedAt = null;
    }

    const [updated] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning();

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[Tasks API] Error updating task:", error);
    res.status(500).json({ message: "Failed to update task" });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete("/:id", async (req: any, res: any) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const [existing] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    await db.delete(tasks).where(eq(tasks.id, taskId));

    res.status(204).send();
  } catch (error) {
    console.error("[Tasks API] Error deleting task:", error);
    res.status(500).json({ message: "Failed to delete task" });
  }
});

// POST /api/tasks/:id/subtasks - Add subtask
router.post("/:id/subtasks", async (req: any, res: any) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const { title, orderIndex } = z.object({
      title: z.string().min(1, "Subtask title is required"),
      orderIndex: z.number().int().optional().default(0),
    }).parse(req.body);

    const [subtask] = await db
      .insert(subtasks)
      .values({
        taskId,
        title,
        done: false,
        orderIndex,
      })
      .returning();

    res.status(201).json(subtask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[Tasks API] Error creating subtask:", error);
    res.status(500).json({ message: "Failed to create subtask" });
  }
});

// PATCH /api/tasks/:id/subtasks/:subtaskId - Update subtask
router.patch("/:id/subtasks/:subtaskId", async (req: any, res: any) => {
  try {
    const subtaskId = parseInt(req.params.subtaskId);
    if (isNaN(subtaskId)) {
      return res.status(400).json({ message: "Invalid subtask ID" });
    }

    const { title, done, orderIndex } = z.object({
      title: z.string().optional(),
      done: z.boolean().optional(),
      orderIndex: z.number().int().optional(),
    }).parse(req.body);

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (done !== undefined) updateData.done = done;
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex;

    const [updated] = await db
      .update(subtasks)
      .set(updateData)
      .where(eq(subtasks.id, subtaskId))
      .returning();

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[Tasks API] Error updating subtask:", error);
    res.status(500).json({ message: "Failed to update subtask" });
  }
});

// DELETE /api/tasks/:id/subtasks/:subtaskId - Delete subtask
router.delete("/:id/subtasks/:subtaskId", async (req: any, res: any) => {
  try {
    const subtaskId = parseInt(req.params.subtaskId);
    if (isNaN(subtaskId)) {
      return res.status(400).json({ message: "Invalid subtask ID" });
    }

    await db.delete(subtasks).where(eq(subtasks.id, subtaskId));

    res.status(204).send();
  } catch (error) {
    console.error("[Tasks API] Error deleting subtask:", error);
    res.status(500).json({ message: "Failed to delete subtask" });
  }
});

export default router;

