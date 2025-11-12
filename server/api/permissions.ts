import express from "express";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import {
  userClientModules,
  userClientFeatures,
  clients,
  insertUserClientModuleSchema,
  insertUserClientFeatureSchema,
} from "@shared/schema";
import { requireAuth } from "../middleware/auth";
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from "../services/activity-logger";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Check if user is global admin
async function isGlobalAdmin(userId: number): Promise<boolean> {
  // TODO: Implement query to check user's globalRole from database
  return false;
}

// GET /api/permissions/user/:userId/client/:clientId - Get all permissions for user+client
router.get("/user/:userId/client/:clientId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const clientId = parseInt(req.params.clientId);

    // Only allow users to view their own permissions or global admins
    const requestUserId = (req.session as any)?.userId;
    if (requestUserId !== userId && !(await isGlobalAdmin(requestUserId))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const [modulePerms, featurePerms] = await Promise.all([
      db.select().from(userClientModules).where(
        and(
          eq(userClientModules.userId, userId),
          eq(userClientModules.clientId, clientId)
        )
      ),
      db.select().from(userClientFeatures).where(
        and(
          eq(userClientFeatures.userId, userId),
          eq(userClientFeatures.clientId, clientId)
        )
      ),
    ]);

    res.json({
      modules: modulePerms,
      features: featurePerms,
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/permissions/module - Assign module permission
router.post("/module", async (req, res) => {
  try {
    const requestUserId = (req.session as any)?.userId;
    
    // Only global admins can assign permissions
    if (!(await isGlobalAdmin(requestUserId))) {
      return res.status(403).json({ message: "Only global admins can assign permissions" });
    }

    const validationResult = insertUserClientModuleSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const data = validationResult.data;

    // Check if permission already exists
    const existing = await db
      .select()
      .from(userClientModules)
      .where(
        and(
          eq(userClientModules.userId, data.userId),
          eq(userClientModules.clientId, data.clientId),
          eq(userClientModules.module, data.module)
        )
      )
      .limit(1);

    let result;
    if (existing.length > 0) {
      // Update existing permission
      const [updated] = await db
        .update(userClientModules)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(userClientModules.id, existing[0].id))
        .returning();
      result = updated;
    } else {
      // Create new permission
      const [created] = await db
        .insert(userClientModules)
        .values(data)
        .returning();
      result = created;
    }

    // Log activity
    await activityLogger.logCRUD(
      existing.length > 0 ? "UPDATE" : "CREATE",
      "user_client_module",
      { userId: requestUserId, ipAddress: req.ip, userAgent: req.get("user-agent") },
      result.id,
      undefined,
      data
    );

    res.json(result);
  } catch (error) {
    console.error("Error assigning module permission:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /api/permissions/feature - Assign feature permission
router.post("/feature", async (req, res) => {
  try {
    const requestUserId = (req.session as any)?.userId;
    
    // Only global admins can assign permissions
    if (!(await isGlobalAdmin(requestUserId))) {
      return res.status(403).json({ message: "Only global admins can assign permissions" });
    }

    const validationResult = insertUserClientFeatureSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const data = validationResult.data;

    // Check if permission already exists
    const existing = await db
      .select()
      .from(userClientFeatures)
      .where(
        and(
          eq(userClientFeatures.userId, data.userId),
          eq(userClientFeatures.clientId, data.clientId),
          eq(userClientFeatures.module, data.module),
          eq(userClientFeatures.feature, data.feature)
        )
      )
      .limit(1);

    let result;
    if (existing.length > 0) {
      // Update existing permission
      const [updated] = await db
        .update(userClientFeatures)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(userClientFeatures.id, existing[0].id))
        .returning();
      result = updated;
    } else {
      // Create new permission
      const [created] = await db
        .insert(userClientFeatures)
        .values(data)
        .returning();
      result = created;
    }

    // Log activity
    await activityLogger.logCRUD(
      existing.length > 0 ? "UPDATE" : "CREATE",
      "user_client_feature",
      { userId: requestUserId, ipAddress: req.ip, userAgent: req.get("user-agent") },
      result.id,
      undefined,
      data
    );

    res.json(result);
  } catch (error) {
    console.error("Error assigning feature permission:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /api/permissions/:id - Remove permission (module or feature)
router.delete("/:id", async (req, res) => {
  try {
    const requestUserId = (req.session as any)?.userId;
    const permId = parseInt(req.params.id);

    // Only global admins can delete permissions
    if (!(await isGlobalAdmin(requestUserId))) {
      return res.status(403).json({ message: "Only global admins can delete permissions" });
    }

    // Try deleting from modules first, then features
    let deleted = await db
      .delete(userClientModules)
      .where(eq(userClientModules.id, permId))
      .returning();

    if (deleted.length === 0) {
      deleted = await db
        .delete(userClientFeatures)
        .where(eq(userClientFeatures.id, permId))
        .returning();
    }

    if (deleted.length === 0) {
      return res.status(404).json({ message: "Permission not found" });
    }

    // Log activity
    await activityLogger.logCRUD(
      "DELETE",
      "permission",
      { userId: requestUserId, ipAddress: req.ip, userAgent: req.get("user-agent") },
      permId,
      deleted[0],
      undefined
    );

    res.json({ message: "Permission deleted successfully" });
  } catch (error) {
    console.error("Error deleting permission:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/permissions/my-clients - Get all clients current user can access for a module
// Query params: ?module=audit
router.get("/my-clients", async (req, res) => {
  try {
    const userId = (req.session as any)?.userId;
    const module = req.query.module as string;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Build where conditions
    let whereConditions = [eq(userClientModules.userId, userId)];
    if (module) {
      whereConditions.push(eq(userClientModules.module, module));
    }

    // Get clients with read permission for this user in the specified module
    const clientsWithAccess = await db
      .select({
        id: clients.id,
        name: clients.name,
        code: clients.code,
      })
      .from(userClientModules)
      .innerJoin(clients, eq(clients.id, userClientModules.clientId))
      .where(and(
        eq(userClientModules.userId, userId),
        eq(userClientModules.canView, true),
        ...(module ? [eq(userClientModules.module, module)] : [])
      ))
      .limit(100); // Reasonable limit

    res.json(clientsWithAccess);
  } catch (error) {
    console.error("Error fetching accessible clients:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

