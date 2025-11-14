// Calendar API Routes
import express from "express";
import { db } from "../db";
import { events, workspaces, tasks, jobs } from "@shared/schema";
import { eq, and, gte, lte, or } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Validation schemas
const createEventSchema = z.object({
  workspaceId: z.number().int().positive(),
  title: z.string().min(1, "Event title is required"),
  description: z.string().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  timezone: z.string().optional().default("UTC"),
  ownerId: z.number().int().positive().optional(),
  relatedTaskId: z.number().int().positive().optional(),
  relatedJobId: z.number().int().positive().optional(),
  location: z.string().optional(),
  isAllDay: z.boolean().optional().default(false),
  metadata: z.record(z.any()).optional(),
  createMatrixRoom: z.boolean().optional().default(false),
});

const updateEventSchema = createEventSchema.partial().extend({
  id: z.number().int().positive(),
});

// GET /api/calendar/events - Get calendar events
router.get("/events", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const ownerId = req.query.ownerId ? parseInt(req.query.ownerId as string) : undefined;

    let query = db.select().from(events);

    const conditions = [];
    if (workspaceId) {
      conditions.push(eq(events.workspaceId, workspaceId));
    }
    if (ownerId) {
      conditions.push(eq(events.ownerId, ownerId));
    }
    if (from) {
      conditions.push(gte(events.start, new Date(from)));
    }
    if (to) {
      conditions.push(lte(events.end, new Date(to)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query;
    res.json(result);
  } catch (error) {
    console.error("[Calendar API] Error fetching events:", error);
    res.status(500).json({ message: "Failed to fetch events" });
  }
});

// GET /api/calendar/aggregated - Get tasks + events combined view
router.get("/aggregated", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions = [];
    if (workspaceId) {
      conditions.push(eq(tasks.workspaceId, workspaceId));
    }
    if (from) {
      conditions.push(gte(tasks.dueDate, new Date(from)));
    }
    if (to) {
      conditions.push(lte(tasks.dueDate, new Date(to)));
    }

    // Fetch tasks with due dates in range
    const tasksQuery = conditions.length > 0
      ? db.select().from(tasks).where(and(...conditions))
      : db.select().from(tasks);

    const tasksList = await tasksQuery;

    // Fetch events in range
    const eventConditions = [];
    if (workspaceId) {
      eventConditions.push(eq(events.workspaceId, workspaceId));
    }
    if (from) {
      eventConditions.push(gte(events.start, new Date(from)));
    }
    if (to) {
      eventConditions.push(lte(events.end, new Date(to)));
    }

    const eventsQuery = eventConditions.length > 0
      ? db.select().from(events).where(and(...eventConditions))
      : db.select().from(events);

    const eventsList = await eventsQuery;

    // Transform tasks to calendar events format
    const taskEvents = tasksList
      .filter(task => task.dueDate)
      .map(task => ({
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        start: task.dueDate,
        end: task.dueDate,
        taskId: task.id,
        status: task.status,
        priority: task.priority,
      }));

    // Transform events
    const calendarEvents = eventsList.map(event => ({
      id: `event-${event.id}`,
      type: 'event',
      title: event.title,
      start: event.start,
      end: event.end,
      eventId: event.id,
      location: event.location,
      isAllDay: event.isAllDay,
    }));

    res.json({
      tasks: taskEvents,
      events: calendarEvents,
      all: [...taskEvents, ...calendarEvents].sort((a, b) => 
        new Date(a.start).getTime() - new Date(b.start).getTime()
      ),
    });
  } catch (error) {
    console.error("[Calendar API] Error fetching aggregated calendar:", error);
    res.status(500).json({ message: "Failed to fetch aggregated calendar" });
  }
});

// POST /api/calendar/events - Create event
router.post("/events", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const data = createEventSchema.parse(req.body);

    // Verify workspace exists
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, data.workspaceId))
      .limit(1);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // TODO: Create Matrix room if createMatrixRoom is true
    const matrixRoomId = data.createMatrixRoom ? null : null; // Placeholder

    const [event] = await db
      .insert(events)
      .values({
        workspaceId: data.workspaceId,
        title: data.title,
        description: data.description,
        start: new Date(data.start),
        end: new Date(data.end),
        timezone: data.timezone,
        ownerId: data.ownerId || userId,
        relatedTaskId: data.relatedTaskId,
        relatedJobId: data.relatedJobId,
        matrixRoomId: matrixRoomId,
        location: data.location,
        isAllDay: data.isAllDay,
        metadata: data.metadata as any,
      })
      .returning();

    res.status(201).json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[Calendar API] Error creating event:", error);
    res.status(500).json({ message: "Failed to create event" });
  }
});

// PATCH /api/calendar/events/:id - Update event
router.patch("/events/:id", async (req: any, res: any) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const data = updateEventSchema.parse({ ...req.body, id: eventId });

    const [existing] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Event not found" });
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.start !== undefined) updateData.start = new Date(data.start);
    if (data.end !== undefined) updateData.end = new Date(data.end);
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId;
    if (data.relatedTaskId !== undefined) updateData.relatedTaskId = data.relatedTaskId;
    if (data.relatedJobId !== undefined) updateData.relatedJobId = data.relatedJobId;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.isAllDay !== undefined) updateData.isAllDay = data.isAllDay;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    const [updated] = await db
      .update(events)
      .set(updateData)
      .where(eq(events.id, eventId))
      .returning();

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[Calendar API] Error updating event:", error);
    res.status(500).json({ message: "Failed to update event" });
  }
});

// DELETE /api/calendar/events/:id - Delete event
router.delete("/events/:id", async (req: any, res: any) => {
  try {
    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const [existing] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Event not found" });
    }

    await db.delete(events).where(eq(events.id, eventId));

    res.status(204).send();
  } catch (error) {
    console.error("[Calendar API] Error deleting event:", error);
    res.status(500).json({ message: "Failed to delete event" });
  }
});

export default router;

