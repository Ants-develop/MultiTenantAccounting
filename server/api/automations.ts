import express from "express";
import { requireAuth } from "../middleware/auth";
import { db } from "../db";
import { automations } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { automationEngine } from "../services/automation-engine";
import { activityLogger } from "../services/activity-logger";

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// =====================================================
// Automation CRUD Endpoints
// =====================================================

/**
 * GET /api/automations
 * List automations for a workspace
 */
router.get("/", async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const workspaceId = req.query.workspaceId ? parseInt(req.query.workspaceId as string) : undefined;

    let query = db.select().from(automations);

    if (workspaceId) {
      query = query.where(eq(automations.workspaceId, workspaceId));
    }

    const automationsList = await query.orderBy(desc(automations.createdAt));

    res.json(automationsList);
  } catch (error: any) {
    console.error("Error fetching automations:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automations
 * Create a new automation
 */
router.post("/", async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const {
      workspaceId,
      name,
      description,
      triggerType,
      triggerConfig,
      actions,
      isActive,
    } = req.body;

    if (!name || !triggerType || !actions || !Array.isArray(actions)) {
      return res.status(400).json({
        error: "Name, triggerType, and actions array are required",
      });
    }

    const [automation] = await db
      .insert(automations)
      .values({
        workspaceId: workspaceId || null,
        name,
        description,
        triggerType,
        triggerConfig: triggerConfig || {},
        actions,
        isActive: isActive !== false,
        createdBy: userId,
      })
      .returning();

    await activityLogger.logActivity(
      {
        userId,
        companyId: workspaceId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      {
        action: "SYSTEM_UPDATE",
        resource: "SYSTEM",
        resourceId: automation.id,
        metadata: { type: "automation_created", name },
      }
    );

    res.status(201).json(automation);
  } catch (error: any) {
    console.error("Error creating automation:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/automations/:id
 * Update an automation
 */
router.put("/:id", async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const automationId = parseInt(req.params.id);
    const updates = req.body;

    const [updated] = await db
      .update(automations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(automations.id, automationId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Automation not found" });
    }

    await activityLogger.logActivity(
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      {
        action: "SYSTEM_UPDATE",
        resource: "SYSTEM",
        resourceId: automationId,
        metadata: { type: "automation_updated" },
      }
    );

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating automation:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/automations/:id
 * Delete an automation
 */
router.delete("/:id", async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const automationId = parseInt(req.params.id);

    const [deleted] = await db
      .delete(automations)
      .where(eq(automations.id, automationId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Automation not found" });
    }

    await activityLogger.logActivity(
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      {
        action: "SYSTEM_UPDATE",
        resource: "SYSTEM",
        resourceId: automationId,
        metadata: { type: "automation_deleted" },
      }
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting automation:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automations/:id/test
 * Test an automation with sample event data
 */
router.post("/:id/test", async (req: any, res: any) => {
  try {
    const automationId = parseInt(req.params.id);
    const testEventData = req.body;

    const [automation] = await db
      .select()
      .from(automations)
      .where(eq(automations.id, automationId))
      .limit(1);

    if (!automation) {
      return res.status(404).json({ error: "Automation not found" });
    }

    // Process the test event
    await automationEngine.processEvent(automation.triggerType, {
      ...testEventData,
      targetType: testEventData.targetType || "test",
      targetId: testEventData.targetId || 0,
    });

    res.json({ success: true, message: "Automation test executed" });
  } catch (error: any) {
    console.error("Error testing automation:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/automations/bulk-action
 * Execute a bulk action (for manual triggers)
 */
router.post("/bulk-action", async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { actionType, targetIds, metadata } = req.body;

    if (!actionType || !targetIds || !Array.isArray(targetIds)) {
      return res.status(400).json({
        error: "actionType and targetIds array are required",
      });
    }

    // TODO: Implement bulk actions
    // Examples: send mass emails, create tasks in batch, update multiple client settings

    res.json({
      success: true,
      message: `Bulk action ${actionType} executed on ${targetIds.length} items`,
    });
  } catch (error: any) {
    console.error("Error executing bulk action:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

