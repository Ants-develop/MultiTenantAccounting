import express from "express";
import { requireAuth } from "../middleware/auth";
import { db } from "../db";
import { clients, clientDocuments, clientServicePackages, clientTeamAssignments, clientOnboardingForms, clientOnboardingSteps, users } from "@shared/schema";
import { eq, and, desc, or, isNull, lt } from "drizzle-orm";
import { sql } from "drizzle-orm";
import multer from "multer";
import { activityLogger } from "../services/activity-logger";

const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Apply auth middleware to all routes
router.use(requireAuth);

// =====================================================
// Client Profile Endpoints
// =====================================================

/**
 * GET /api/clients/:id/profile
 * Get client profile with team assignments and service packages
 */
router.get("/:id/profile", async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.params.id);
    const userId = req.user.id;

    // Get client
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Get team assignments
    const teamAssignments = await db
      .select({
        id: clientTeamAssignments.id,
        userId: clientTeamAssignments.userId,
        role: clientTeamAssignments.role,
        assignedAt: clientTeamAssignments.assignedAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(clientTeamAssignments)
      .leftJoin(users, eq(clientTeamAssignments.userId, users.id))
      .where(eq(clientTeamAssignments.clientId, clientId));

    // Get service packages
    const servicePackages = await db
      .select()
      .from(clientServicePackages)
      .where(and(
        eq(clientServicePackages.clientId, clientId),
        eq(clientServicePackages.isActive, true)
      ));

    res.json({
      client,
      teamAssignments,
      servicePackages,
    });
  } catch (error: any) {
    console.error("Error fetching client profile:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/clients/:id/profile
 * Update client profile
 */
router.put("/:id/profile", async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.params.id);
    const userId = req.user.id;
    const updates = req.body;

    // Update client
    const [updated] = await db
      .update(clients)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Client not found" });
    }

    await activityLogger.logActivity(
      {
        userId,
        companyId: clientId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      {
        action: "COMPANY_UPDATE",
        resource: "COMPANY",
        resourceId: clientId,
        newValues: updates,
      }
    );

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating client profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Client Documents Endpoints
// =====================================================

/**
 * GET /api/clients/:id/documents
 * List documents for a client
 */
router.get("/:id/documents", async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.params.id);
    const category = req.query.category as string | undefined;

    const whereConditions = category
      ? and(
          eq(clientDocuments.clientId, clientId),
          eq(clientDocuments.category, category)
        )
      : eq(clientDocuments.clientId, clientId);

    const documents = await db
      .select({
        id: clientDocuments.id,
        name: clientDocuments.name,
        category: clientDocuments.category,
        fileType: clientDocuments.fileType,
        fileSize: clientDocuments.fileSize,
        version: clientDocuments.version,
        expirationDate: clientDocuments.expirationDate,
        uploadedBy: clientDocuments.uploadedBy,
        createdAt: clientDocuments.createdAt,
        updatedAt: clientDocuments.updatedAt,
        uploader: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(clientDocuments)
      .leftJoin(users, eq(clientDocuments.uploadedBy, users.id))
      .where(whereConditions)
      .orderBy(desc(clientDocuments.createdAt));

    res.json(documents);
  } catch (error: any) {
    console.error("Error fetching client documents:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/clients/:id/documents
 * Upload a document
 */
router.post("/:id/documents", upload.single("file"), async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.params.id);
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { name, category, expirationDate } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: "Name and category are required" });
    }

    // Convert buffer to base64 for storage (PostgreSQL bytea can also store binary directly)
    const fileData = file.buffer.toString("base64");

    const [document] = await db
      .insert(clientDocuments)
      .values({
        clientId,
        name,
        category,
        fileData,
        fileType: file.mimetype,
        fileSize: file.size,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        uploadedBy: userId,
      })
      .returning();

    await activityLogger.logActivity(
      {
        userId,
        companyId: clientId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      {
        action: "DATA_IMPORT",
        resource: "SYSTEM",
        resourceId: document.id,
        metadata: { clientId, name, category, type: "document_upload" },
      }
    );

    res.status(201).json({
      id: document.id,
      name: document.name,
      category: document.category,
      fileType: document.fileType,
      fileSize: document.fileSize,
      createdAt: document.createdAt,
    });
  } catch (error: any) {
    console.error("Error uploading document:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/clients/:id/documents/:docId
 * Download a document
 */
router.get("/:id/documents/:docId", async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.params.id);
    const docId = parseInt(req.params.docId);

    const [document] = await db
      .select()
      .from(clientDocuments)
      .where(and(
        eq(clientDocuments.id, docId),
        eq(clientDocuments.clientId, clientId)
      ))
      .limit(1);

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Convert base64 back to buffer
    const fileBuffer = Buffer.from(document.fileData, "base64");

    res.setHeader("Content-Type", document.fileType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${document.name}"`);
    res.setHeader("Content-Length", fileBuffer.length);

    res.send(fileBuffer);
  } catch (error: any) {
    console.error("Error downloading document:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/clients/:id/documents/:docId
 * Delete a document
 */
router.delete("/:id/documents/:docId", async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.params.id);
    const docId = parseInt(req.params.docId);
    const userId = req.user.id;

    const [deleted] = await db
      .delete(clientDocuments)
      .where(and(
        eq(clientDocuments.id, docId),
        eq(clientDocuments.clientId, clientId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Document not found" });
    }

    await activityLogger.logActivity(
      {
        userId,
        companyId: clientId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      {
        action: "DATA_EXPORT",
        resource: "SYSTEM",
        resourceId: docId,
        metadata: { clientId, name: deleted.name, type: "document_delete" },
      }
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/clients/:id/documents/expiring
 * Get documents expiring soon (within 30 days)
 */
router.get("/:id/documents/expiring", async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.params.id);
    const days = parseInt(req.query.days as string) || 30;
    const expirationThreshold = new Date();
    expirationThreshold.setDate(expirationThreshold.getDate() + days);

    const expiringDocuments = await db
      .select()
      .from(clientDocuments)
      .where(and(
        eq(clientDocuments.clientId, clientId),
        sql`${clientDocuments.expirationDate} IS NOT NULL`,
        sql`${clientDocuments.expirationDate} <= ${expirationThreshold}`
      ))
      .orderBy(clientDocuments.expirationDate);

    res.json(expiringDocuments);
  } catch (error: any) {
    console.error("Error fetching expiring documents:", error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Client Onboarding Endpoints
// =====================================================

/**
 * POST /api/clients/:id/onboarding/start
 * Start onboarding process
 */
router.post("/:id/onboarding/start", async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.params.id);
    const userId = req.user.id;
    const { steps } = req.body; // Array of step definitions

    // Create onboarding steps
    const createdSteps = await db
      .insert(clientOnboardingSteps)
      .values(
        steps.map((step: any) => ({
          clientId,
          stepName: step.name,
          stepType: step.type,
          metadata: step.metadata || {},
        }))
      )
      .returning();

    await activityLogger.logActivity(
      {
        userId,
        companyId: clientId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      {
        action: "COMPANY_UPDATE",
        resource: "COMPANY",
        resourceId: clientId,
        metadata: { stepsCount: createdSteps.length, type: "onboarding_started" },
      }
    );

    res.status(201).json(createdSteps);
  } catch (error: any) {
    console.error("Error starting onboarding:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/clients/:id/onboarding/status
 * Get onboarding status
 */
router.get("/:id/onboarding/status", async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.params.id);

    const steps = await db
      .select()
      .from(clientOnboardingSteps)
      .where(eq(clientOnboardingSteps.clientId, clientId))
      .orderBy(clientOnboardingSteps.createdAt);

    const forms = await db
      .select()
      .from(clientOnboardingForms)
      .where(eq(clientOnboardingForms.clientId, clientId))
      .orderBy(desc(clientOnboardingForms.createdAt));

    const completedSteps = steps.filter(s => s.isCompleted).length;
    const totalSteps = steps.length;
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    res.json({
      steps,
      forms,
      progress,
      completedSteps,
      totalSteps,
    });
  } catch (error: any) {
    console.error("Error fetching onboarding status:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/clients/:id/onboarding/complete-step
 * Complete an onboarding step
 */
router.post("/:id/onboarding/complete-step", async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.params.id);
    const userId = req.user.id;
    const { stepId } = req.body;

    const [updated] = await db
      .update(clientOnboardingSteps)
      .set({
        isCompleted: true,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(clientOnboardingSteps.id, stepId),
        eq(clientOnboardingSteps.clientId, clientId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Step not found" });
    }

    await activityLogger.logActivity(
      {
        userId,
        companyId: clientId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      {
        action: "COMPANY_UPDATE",
        resource: "COMPANY",
        resourceId: stepId,
        metadata: { clientId, stepName: updated.stepName, type: "onboarding_step_completed" },
      }
    );

    res.json(updated);
  } catch (error: any) {
    console.error("Error completing onboarding step:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

