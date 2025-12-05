import express from "express";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { dealActivities } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const router = express.Router();
router.use(requireAuth);

const createActivitySchema = z.object({
  type: z.enum(["call", "email", "meeting", "note", "task", "stage_change"]),
  title: z.string().min(1),
  description: z.string().optional(),
  outcome: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

const updateActivitySchema = createActivitySchema.partial();

router.get("/deals/:dealId/activities", async (req: any, res: any) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (Number.isNaN(dealId)) return res.status(400).json({ message: "Invalid deal id" });

    const activities = await db
      .select()
      .from(dealActivities)
      .where(eq(dealActivities.dealId, dealId))
      .orderBy(desc(dealActivities.createdAt));

    res.json(activities);
  } catch (error) {
    console.error("[CRM] Failed to fetch activities", error);
    res.status(500).json({ message: "Failed to fetch activities" });
  }
});

router.post("/deals/:dealId/activities", async (req: any, res: any) => {
  try {
    const dealId = parseInt(req.params.dealId);
    if (Number.isNaN(dealId)) return res.status(400).json({ message: "Invalid deal id" });

    const data = createActivitySchema.parse(req.body);
    const [created] = await db
      .insert(dealActivities)
      .values({
        dealId,
        type: data.type,
        title: data.title,
        description: data.description,
        outcome: data.outcome,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
        createdBy: req.session.userId,
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[CRM] Failed to create activity", error);
    res.status(500).json({ message: "Failed to create activity" });
  }
});

router.patch("/activities/:id", async (req: any, res: any) => {
  try {
    const activityId = parseInt(req.params.id);
    if (Number.isNaN(activityId)) return res.status(400).json({ message: "Invalid activity id" });

    const data = updateActivitySchema.parse(req.body);
    const [updated] = await db
      .update(dealActivities)
      .set({
        type: data.type,
        title: data.title,
        description: data.description,
        outcome: data.outcome,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      })
      .where(eq(dealActivities.id, activityId))
      .returning();

    if (!updated) return res.status(404).json({ message: "Activity not found" });
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[CRM] Failed to update activity", error);
    res.status(500).json({ message: "Failed to update activity" });
  }
});

router.delete("/activities/:id", async (req: any, res: any) => {
  try {
    const activityId = parseInt(req.params.id);
    if (Number.isNaN(activityId)) return res.status(400).json({ message: "Invalid activity id" });

    const [deleted] = await db.delete(dealActivities).where(eq(dealActivities.id, activityId)).returning();
    if (!deleted) return res.status(404).json({ message: "Activity not found" });

    res.status(204).send();
  } catch (error) {
    console.error("[CRM] Failed to delete activity", error);
    res.status(500).json({ message: "Failed to delete activity" });
  }
});

export default router;
