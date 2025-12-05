import express from "express";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { dealStages, deals } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const router = express.Router();
router.use(requireAuth);

const createStageSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  order: z.number().int().optional(),
  pipeline: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateStageSchema = createStageSchema.partial();

router.get("/stages", async (_req: any, res: any) => {
  try {
    const stages = await db.select().from(dealStages).orderBy(dealStages.order);
    res.json(stages);
  } catch (error) {
    console.error("[CRM] Failed to fetch stages", error);
    res.status(500).json({ message: "Failed to fetch stages" });
  }
});

router.post("/stages", async (req: any, res: any) => {
  try {
    const data = createStageSchema.parse(req.body);
    let order = data.order;
    if (order === undefined) {
      const [maxStage] = await db.select({ value: dealStages.order }).from(dealStages).orderBy(desc(dealStages.order)).limit(1);
      order = (maxStage?.value || 0) + 1;
    }

    const [stage] = await db
      .insert(dealStages)
      .values({
        name: data.name,
        color: data.color,
        order,
        pipeline: data.pipeline,
        isActive: data.isActive,
      })
      .returning();

    res.status(201).json(stage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[CRM] Failed to create stage", error);
    res.status(500).json({ message: "Failed to create stage" });
  }
});

router.patch("/stages/:id", async (req: any, res: any) => {
  try {
    const stageId = parseInt(req.params.id);
    if (Number.isNaN(stageId)) return res.status(400).json({ message: "Invalid stage id" });
    const data = updateStageSchema.parse(req.body);

    const [updated] = await db
      .update(dealStages)
      .set({
        name: data.name,
        color: data.color,
        order: data.order,
        pipeline: data.pipeline,
        isActive: data.isActive,
        updatedAt: new Date(),
      })
      .where(eq(dealStages.id, stageId))
      .returning();

    if (!updated) return res.status(404).json({ message: "Stage not found" });
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[CRM] Failed to update stage", error);
    res.status(500).json({ message: "Failed to update stage" });
  }
});

router.patch("/stages/reorder", async (req: any, res: any) => {
  try {
    const body = z.object({ stageIds: z.array(z.number().int()) }).parse(req.body);
    const updates = body.stageIds.map((id, idx) => db.update(dealStages).set({ order: idx + 1 }).where(eq(dealStages.id, id)));
    for (const update of updates) {
      await update;
    }
    res.json({ message: "Reordered" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[CRM] Failed to reorder stages", error);
    res.status(500).json({ message: "Failed to reorder stages" });
  }
});

router.delete("/stages/:id", async (req: any, res: any) => {
  try {
    const stageId = parseInt(req.params.id);
    if (Number.isNaN(stageId)) return res.status(400).json({ message: "Invalid stage id" });

    const [dealUsingStage] = await db.select().from(deals).where(eq(deals.stageId, stageId)).limit(1);
    if (dealUsingStage) {
      return res.status(400).json({ message: "Cannot delete stage with active deals" });
    }

    const [deleted] = await db.delete(dealStages).where(eq(dealStages.id, stageId)).returning();
    if (!deleted) return res.status(404).json({ message: "Stage not found" });

    res.status(204).send();
  } catch (error) {
    console.error("[CRM] Failed to delete stage", error);
    res.status(500).json({ message: "Failed to delete stage" });
  }
});

export default router;
