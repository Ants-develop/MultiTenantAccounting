import express from "express";
import { z } from "zod";
import { and, eq, gte, ilike, lte, sql, desc } from "drizzle-orm";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import {
  deals,
  dealStages,
  dealActivities,
  dealContacts,
  clientContacts,
  clients,
  users,
} from "@shared/schema";

const router = express.Router();
router.use(requireAuth);

const createDealSchema = z.object({
  title: z.string().min(1),
  value: z.number().optional(),
  currency: z.string().min(1).optional(),
  stageId: z.number().int().optional(),
  clientId: z.number().int().optional(),
  ownerId: z.number().int().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().optional(),
  actualCloseDate: z.string().datetime().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateDealSchema = createDealSchema.partial();

const moveStageSchema = z.object({
  stageId: z.number().int(),
});

router.get("/deals", async (req: any, res: any) => {
  try {
    const conditions: any[] = [];

    if (req.query.owner_id) conditions.push(eq(deals.ownerId, parseInt(req.query.owner_id)));
    if (req.query.stage_id) conditions.push(eq(deals.stageId, parseInt(req.query.stage_id)));
    if (req.query.status) conditions.push(eq(deals.status, req.query.status as string));
    if (req.query.min_value) conditions.push(gte(deals.value, req.query.min_value as any));
    if (req.query.max_value) conditions.push(lte(deals.value, req.query.max_value as any));
    if (req.query.lead_source) conditions.push(eq(deals.source, req.query.lead_source as string));
    if (req.query.from_date) conditions.push(gte(deals.expectedCloseDate, new Date(req.query.from_date as string)));
    if (req.query.to_date) conditions.push(lte(deals.expectedCloseDate, new Date(req.query.to_date as string)));
    if (req.query.search) {
      const search = `%${(req.query.search as string).toLowerCase()}%`;
      conditions.push(ilike(deals.title, search));
    }

    let query = db.select().from(deals).orderBy(desc(deals.createdAt));
    if (conditions.length > 0) {
      query = (query as any).where(and(...conditions));
    }

    const result = await query;
    res.json(result);
  } catch (error) {
    console.error("[CRM] Failed to fetch deals", error);
    res.status(500).json({ message: "Failed to fetch deals" });
  }
});

router.get("/deals/:id", async (req: any, res: any) => {
  try {
    const dealId = parseInt(req.params.id);
    if (Number.isNaN(dealId)) return res.status(400).json({ message: "Invalid deal id" });

    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    const [stage, activities, contacts] = await Promise.all([
      deal.stageId ? db.select().from(dealStages).where(eq(dealStages.id, deal.stageId)).limit(1) : Promise.resolve([]),
      db.select().from(dealActivities).where(eq(dealActivities.dealId, dealId)).orderBy(desc(dealActivities.createdAt)),
      db.select({
        id: dealContacts.id,
        role: dealContacts.role,
        createdAt: dealContacts.createdAt,
        contact: clientContacts,
      })
        .from(dealContacts)
        .leftJoin(clientContacts, eq(dealContacts.contactId, clientContacts.id))
        .where(eq(dealContacts.dealId, dealId)),
    ]);

    res.json({ ...deal, stage: stage?.[0], activities, contacts });
  } catch (error) {
    console.error("[CRM] Failed to fetch deal", error);
    res.status(500).json({ message: "Failed to fetch deal" });
  }
});

router.post("/deals", async (req: any, res: any) => {
  try {
    const data = createDealSchema.parse(req.body);
    const [inserted] = await db
      .insert(deals)
      .values({
        title: data.title,
        value: data.value?.toString(),
        currency: data.currency,
        stageId: data.stageId,
        clientId: data.clientId,
        ownerId: data.ownerId ?? req.session.userId,
        probability: data.probability,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
        actualCloseDate: data.actualCloseDate ? new Date(data.actualCloseDate) : undefined,
        status: data.status,
        source: data.source,
        notes: data.notes,
        metadata: data.metadata as any,
        createdBy: req.session.userId,
      })
      .returning();

    res.status(201).json(inserted);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[CRM] Failed to create deal", error);
    res.status(500).json({ message: "Failed to create deal" });
  }
});

router.patch("/deals/:id", async (req: any, res: any) => {
  try {
    const dealId = parseInt(req.params.id);
    if (Number.isNaN(dealId)) return res.status(400).json({ message: "Invalid deal id" });

    const data = updateDealSchema.parse(req.body);
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.value !== undefined) updateData.value = data.value.toString();
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.stageId !== undefined) updateData.stageId = data.stageId;
    if (data.clientId !== undefined) updateData.clientId = data.clientId;
    if (data.ownerId !== undefined) updateData.ownerId = data.ownerId;
    if (data.probability !== undefined) updateData.probability = data.probability;
    if (data.expectedCloseDate !== undefined) updateData.expectedCloseDate = data.expectedCloseDate ? new Date(data.expectedCloseDate) : null;
    if (data.actualCloseDate !== undefined) updateData.actualCloseDate = data.actualCloseDate ? new Date(data.actualCloseDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.metadata !== undefined) updateData.metadata = data.metadata as any;

    const [updated] = await db.update(deals).set(updateData).where(eq(deals.id, dealId)).returning();
    if (!updated) return res.status(404).json({ message: "Deal not found" });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[CRM] Failed to update deal", error);
    res.status(500).json({ message: "Failed to update deal" });
  }
});

router.patch("/deals/:id/stage", async (req: any, res: any) => {
  try {
    const dealId = parseInt(req.params.id);
    if (Number.isNaN(dealId)) return res.status(400).json({ message: "Invalid deal id" });
    const { stageId } = moveStageSchema.parse(req.body);

    const [stage] = await db.select().from(dealStages).where(eq(dealStages.id, stageId)).limit(1);
    if (!stage) return res.status(404).json({ message: "Stage not found" });

    const [updated] = await db.update(deals).set({ stageId, updatedAt: new Date() }).where(eq(deals.id, dealId)).returning();
    if (!updated) return res.status(404).json({ message: "Deal not found" });

    await db.insert(dealActivities).values({
      dealId,
      type: "stage_change",
      title: `Moved to ${stage.name}`,
      createdBy: req.session.userId,
      createdAt: new Date(),
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("[CRM] Failed to move stage", error);
    res.status(500).json({ message: "Failed to move stage" });
  }
});

router.delete("/deals/:id", async (req: any, res: any) => {
  try {
    const dealId = parseInt(req.params.id);
    if (Number.isNaN(dealId)) return res.status(400).json({ message: "Invalid deal id" });

    const [existing] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
    if (!existing) return res.status(404).json({ message: "Deal not found" });

    await db.delete(deals).where(eq(deals.id, dealId));
    res.status(204).send();
  } catch (error) {
    console.error("[CRM] Failed to delete deal", error);
    res.status(500).json({ message: "Failed to delete deal" });
  }
});

router.get("/metrics", async (_req: any, res: any) => {
  try {
    const [agg] = await db
      .select({
        totalDeals: sql<number>`COUNT(*)`,
        totalValue: sql<number>`COALESCE(SUM(${deals.value}), 0)`,
        openDeals: sql<number>`COUNT(*) FILTER (WHERE ${deals.status} = 'open')`,
        openValue: sql<number>`COALESCE(SUM(${deals.value}) FILTER (WHERE ${deals.status} = 'open'), 0)`,
        wonDeals: sql<number>`COUNT(*) FILTER (WHERE ${deals.status} = 'won')`,
        wonValue: sql<number>`COALESCE(SUM(${deals.value}) FILTER (WHERE ${deals.status} = 'won'), 0)`,
        lostDeals: sql<number>`COUNT(*) FILTER (WHERE ${deals.status} = 'lost')`,
        lostValue: sql<number>`COALESCE(SUM(${deals.value}) FILTER (WHERE ${deals.status} = 'lost'), 0)`,
        expectedRevenue: sql<number>`COALESCE(SUM(${deals.value} * ${deals.probability} / 100.0), 0)`,
      })
      .from(deals);

    const valueByStage = await db
      .select({
        stageId: deals.stageId,
        stageName: dealStages.name,
        count: sql<number>`COUNT(*)`,
        totalValue: sql<number>`COALESCE(SUM(${deals.value}), 0)`,
      })
      .from(deals)
      .leftJoin(dealStages, eq(deals.stageId, dealStages.id))
      .groupBy(deals.stageId, dealStages.name)
      .orderBy(dealStages.order);

    const dealsByOwner = await db
      .select({
        ownerId: deals.ownerId,
        ownerName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`,
        count: sql<number>`COUNT(*)`,
        totalValue: sql<number>`COALESCE(SUM(${deals.value}), 0)`,
      })
      .from(deals)
      .leftJoin(users, eq(deals.ownerId, users.id))
      .groupBy(deals.ownerId, users.firstName, users.lastName, users.username);

    const totalDeals = agg?.totalDeals || 0;
    const totalValue = Number(agg?.totalValue || 0);
    const averageDealSize = totalDeals > 0 ? totalValue / totalDeals : 0;
    const winRate = totalDeals > 0 ? (Number(agg?.wonDeals || 0) / totalDeals) * 100 : 0;

    res.json({
      total_deals: totalDeals,
      total_value: totalValue,
      open_deals: Number(agg?.openDeals || 0),
      open_value: Number(agg?.openValue || 0),
      won_deals: Number(agg?.wonDeals || 0),
      won_value: Number(agg?.wonValue || 0),
      lost_deals: Number(agg?.lostDeals || 0),
      lost_value: Number(agg?.lostValue || 0),
      average_deal_size: averageDealSize,
      win_rate: winRate,
      expected_revenue: Number(agg?.expectedRevenue || 0),
      value_by_stage: valueByStage.map((row) => ({
        stage_id: row.stageId,
        stage_name: row.stageName,
        count: Number(row.count || 0),
        total_value: Number(row.totalValue || 0),
      })),
      deals_by_owner: dealsByOwner.map((row) => ({
        owner_id: row.ownerId,
        owner_name: row.ownerName,
        count: Number(row.count || 0),
        total_value: Number(row.totalValue || 0),
      })),
    });
  } catch (error) {
    console.error("[CRM] Failed to fetch metrics", error);
    res.status(500).json({ message: "Failed to fetch metrics" });
  }
});

export default router;
