// Matrix Integration API Routes
import express from "express";
import { db } from "../db";
import { users, tasks, jobs, events } from "@shared/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Validation schemas
const createRoomSchema = z.object({
  targetType: z.enum(["task", "job", "event"]),
  targetId: z.number().int().positive(),
  name: z.string().optional(),
});

// GET /api/matrix/user/:userId - Get Matrix ID for user
router.get("/user/:userId", async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const [user] = await db
      .select({ id: users.id, matrixId: users.matrixId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ userId: user.id, matrixId: user.matrixId });
  } catch (error) {
    console.error("[Matrix API] Error fetching user Matrix ID:", error);
    res.status(500).json({ message: "Failed to fetch Matrix ID" });
  }
});

// POST /api/matrix/rooms - Create or get Matrix room for task/job/event
router.post("/rooms", async (req: any, res: any) => {
  try {
    const data = createRoomSchema.parse(req.body);

    // Find the target entity
    let entity: any = null;
    let matrixRoomId: string | null = null;

    if (data.targetType === "task") {
      const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, data.targetId))
        .limit(1);
      entity = task;
      matrixRoomId = task?.matrixRoomId || null;
    } else if (data.targetType === "job") {
      const [job] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, data.targetId))
        .limit(1);
      entity = job;
      matrixRoomId = job?.matrixRoomId || null;
    } else if (data.targetType === "event") {
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, data.targetId))
        .limit(1);
      entity = event;
      matrixRoomId = event?.matrixRoomId || null;
    }

    if (!entity) {
      return res.status(404).json({ message: `${data.targetType} not found` });
    }

    // If room already exists, return it
    if (matrixRoomId) {
      return res.json({ roomId: matrixRoomId, exists: true });
    }

    // TODO: Create Matrix room using Matrix bridge service
    // For now, return placeholder
    const newRoomId = `!${Math.random().toString(36).substring(2, 15)}:matrix.example.com`;

    // Update entity with room ID
    if (data.targetType === "task") {
      await db
        .update(tasks)
        .set({ matrixRoomId: newRoomId })
        .where(eq(tasks.id, data.targetId));
    } else if (data.targetType === "job") {
      await db
        .update(jobs)
        .set({ matrixRoomId: newRoomId })
        .where(eq(jobs.id, data.targetId));
    } else if (data.targetType === "event") {
      await db
        .update(events)
        .set({ matrixRoomId: newRoomId })
        .where(eq(events.id, data.targetId));
    }

    res.json({ roomId: newRoomId, exists: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[Matrix API] Error creating room:", error);
    res.status(500).json({ message: "Failed to create Matrix room" });
  }
});

// POST /api/matrix/rooms/:roomId/invite - Invite user to Matrix room
router.post("/rooms/:roomId/invite", async (req: any, res: any) => {
  try {
    const roomId = req.params.roomId;
    const { userId } = z.object({
      userId: z.number().int().positive(),
    }).parse(req.body);

    // Get user's Matrix ID
    const [user] = await db
      .select({ matrixId: users.matrixId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.matrixId) {
      return res.status(400).json({ message: "User does not have a Matrix ID" });
    }

    // TODO: Invite user to Matrix room using Matrix bridge service
    // For now, return success
    res.json({ success: true, message: "User invited to room" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[Matrix API] Error inviting user:", error);
    res.status(500).json({ message: "Failed to invite user to room" });
  }
});

export default router;

