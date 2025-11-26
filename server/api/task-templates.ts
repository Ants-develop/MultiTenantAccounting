// Task Templates API Routes (Bitrix24-style)
import express from "express";
import { db } from "../db";
import { taskTemplates, tasksTable, taskChecklists } from "@shared/schema";
import { eq, and, inArray, or, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { getUserClientsByModule, checkModulePermission } from "../middleware/permissions";
import { activityLogger, ACTIVITY_ACTIONS } from "../services/activity-logger";
import { z } from "zod";
import { insertTaskTemplateSchema } from "@shared/schema";
import { parseCronExpression, calculateNextRun, ScheduleConfig } from "../services/template-scheduler";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Template data validation schema
const taskTemplateDataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  tags: z.array(z.string()).default([]),
  estimated_minutes: z.number().int().positive().optional(),
  deadline_offset: z.string().optional(), // e.g., "+3 days", "+1 week"
  checklists: z.array(z.object({
    text: z.string().min(1),
    assigned_to_role: z.string().optional(),
  })).default([]),
  metadata: z.record(z.any()).optional(),
});

// GET /api/task-templates - List templates
router.get("/", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    
    // Parse clientIds from query parameter (comma-separated)
    const clientIdsParam = req.query.clientIds as string;
    let clientIds: number[] = [];
    
    if (clientIdsParam) {
      clientIds = clientIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    }

    // Get user's accessible clients for tasks module
    const userClients = await getUserClientsByModule(userId, 'tasks');
    const allowedClientIds = userClients.map(c => c.clientId);

    // If clientIds specified, validate access
    if (clientIds.length > 0) {
      const invalidIds = clientIds.filter(id => !allowedClientIds.includes(id));
      if (invalidIds.length > 0) {
        return res.status(403).json({ message: 'Access denied to some clients' });
      }
    } else {
      // If no clientIds specified, use all accessible clients
      clientIds = allowedClientIds;
    }

    if (clientIds.length === 0) {
      return res.json([]);
    }

    // Build query conditions
    const conditions = [inArray(taskTemplates.clientId, clientIds)];
    
    // Filter by isPublic if specified
    if (req.query.isPublic !== undefined) {
      const isPublic = req.query.isPublic === 'true';
      if (isPublic) {
        conditions.push(eq(taskTemplates.isPublic, true));
      } else {
        // For non-public, show only templates user created or has access to
        conditions.push(
          or(
            eq(taskTemplates.isPublic, false),
            eq(taskTemplates.createdBy, userId)
          )
        );
      }
    }

    const templates = await db
      .select()
      .from(taskTemplates)
      .where(and(...conditions))
      .orderBy(desc(taskTemplates.createdAt));

    res.json(templates);
  } catch (error) {
    console.error("[Task Templates API] Error fetching templates:", error);
    res.status(500).json({ message: "Failed to fetch templates" });
  }
});

// GET /api/task-templates/:id - Get template details
router.get("/:id", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({ message: "Invalid template ID" });
    }

    const [template] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, templateId))
      .limit(1);

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, template.clientId, 'tasks', 'view');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(template);
  } catch (error) {
    console.error("[Task Templates API] Error fetching template:", error);
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

// POST /api/task-templates - Create template
router.post("/", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    
    // Validate request body
    const validationResult = insertTaskTemplateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const data = validationResult.data;

    // Validate template data structure
    const dataValidation = taskTemplateDataSchema.safeParse(data.data);
    if (!dataValidation.success) {
      return res.status(400).json({
        message: "Invalid template data structure",
        errors: dataValidation.error.flatten().fieldErrors,
      });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, data.clientId, 'tasks', 'create');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Create template
    const [template] = await db
      .insert(taskTemplates)
      .values({
        ...data,
        createdBy: userId,
      })
      .returning();

    // Log activity
    await activityLogger.logCRUD(
      "CREATE",
      "task_template",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: data.clientId,
      },
      template.id,
      undefined,
      data
    );

    res.status(201).json(template);
  } catch (error) {
    console.error("[Task Templates API] Error creating template:", error);
    res.status(500).json({ message: "Failed to create template" });
  }
});

// PUT /api/task-templates/:id - Update template
router.put("/:id", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({ message: "Invalid template ID" });
    }

    // Get existing template
    const [existing] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, templateId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, existing.clientId, 'tasks', 'edit');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Validate update data
    const updateData: any = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.isPublic !== undefined) updateData.isPublic = req.body.isPublic;
    if (req.body.data !== undefined) {
      // Validate template data structure
      const dataValidation = taskTemplateDataSchema.safeParse(req.body.data);
      if (!dataValidation.success) {
        return res.status(400).json({
          message: "Invalid template data structure",
          errors: dataValidation.error.flatten().fieldErrors,
        });
      }
      updateData.data = req.body.data;
    }
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(taskTemplates)
      .set(updateData)
      .where(eq(taskTemplates.id, templateId))
      .returning();

    // Log activity
    await activityLogger.logCRUD(
      "UPDATE",
      "task_template",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: existing.clientId,
      },
      templateId,
      existing,
      updateData
    );

    res.json(updated);
  } catch (error) {
    console.error("[Task Templates API] Error updating template:", error);
    res.status(500).json({ message: "Failed to update template" });
  }
});

// DELETE /api/task-templates/:id - Delete template
router.delete("/:id", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({ message: "Invalid template ID" });
    }

    // Get existing template
    const [existing] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, templateId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, existing.clientId, 'tasks', 'delete');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    await db
      .delete(taskTemplates)
      .where(eq(taskTemplates.id, templateId));

    // Log activity
    await activityLogger.logCRUD(
      "DELETE",
      "task_template",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: existing.clientId,
      },
      templateId,
      existing,
      undefined
    );

    res.status(204).send();
  } catch (error) {
    console.error("[Task Templates API] Error deleting template:", error);
    res.status(500).json({ message: "Failed to delete template" });
  }
});

// POST /api/task-templates/:id/instantiate - Create task from template
router.post("/:id/instantiate", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({ message: "Invalid template ID" });
    }

    // Get template
    const [template] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, templateId))
      .limit(1);

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Parse request body
    const { clientId, variables } = req.body;
    
    if (!clientId) {
      return res.status(400).json({ message: "clientId is required" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, clientId, 'tasks', 'create');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Import template instantiation service (will create this next)
    const { instantiateTemplate } = await import("../services/template-instantiation");
    
    // Instantiate template
    const taskId = await instantiateTemplate(templateId, clientId, userId, variables || {});

    // Fetch created task
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    // Log activity
    await activityLogger.logCRUD(
      "CREATE",
      "task",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: clientId,
      },
      taskId,
      undefined,
      { templateId, clientId }
    );

    res.status(201).json(task);
  } catch (error) {
    console.error("[Task Templates API] Error instantiating template:", error);
    res.status(500).json({ message: "Failed to instantiate template" });
  }
});

// PATCH /api/task-templates/:id/schedule - Update schedule configuration
router.patch("/:id/schedule", checkModulePermission("tasks", "edit"), async (req: any, res: any) => {
  try {
    const templateId = parseInt(req.params.id);
    const userId = req.session.userId;

    if (isNaN(templateId)) {
      return res.status(400).json({ message: "Invalid template ID" });
    }

    // Get template
    const [template] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, templateId))
      .limit(1);

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Validate request body
    const scheduleSchema = z.object({
      scheduleEnabled: z.boolean().optional(),
      scheduleConfig: z.object({
        cronExpression: z.string().optional(),
        timezone: z.string().optional(),
        perClient: z.boolean().optional(),
        perUser: z.boolean().optional(),
        clientSchedules: z.record(z.object({
          cronExpression: z.string(),
          assignedTo: z.number().optional(),
        })).optional(),
      }).optional(),
    });

    const body = scheduleSchema.parse(req.body);

    // Validate cron expression if provided
    if (body.scheduleConfig?.cronExpression) {
      if (!parseCronExpression(body.scheduleConfig.cronExpression)) {
        return res.status(400).json({ message: "Invalid cron expression" });
      }
    }

    // Merge with existing config
    const existingConfig: ScheduleConfig = (template.scheduleConfig as ScheduleConfig) || {};
    const newConfig: ScheduleConfig = {
      ...existingConfig,
      ...(body.scheduleConfig || {}),
    };

    // Calculate next run if cron expression is provided
    if (newConfig.cronExpression) {
      const tz = newConfig.timezone || "UTC";
      const nextRun = calculateNextRun(newConfig.cronExpression, tz);
      if (nextRun) {
        newConfig.nextRunAt = nextRun.toISOString();
      }
    }

    // Update template
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.scheduleEnabled !== undefined) {
      updateData.scheduleEnabled = body.scheduleEnabled;
    }

    if (body.scheduleConfig) {
      updateData.scheduleConfig = newConfig;
    }

    await db
      .update(taskTemplates)
      .set(updateData)
      .where(eq(taskTemplates.id, templateId));

    // Fetch updated template
    const [updatedTemplate] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, templateId))
      .limit(1);

    // Log activity
    await activityLogger.logCRUD(
      "UPDATE",
      "task_template",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: template.clientId,
      },
      templateId,
      template,
      updatedTemplate
    );

    res.json(updatedTemplate);
  } catch (error) {
    console.error("[Task Templates API] Error updating schedule:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid request data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to update schedule" });
  }
});

// GET /api/task-templates/:id/schedule - Get schedule configuration
router.get("/:id/schedule", checkModulePermission("tasks", "view"), async (req: any, res: any) => {
  try {
    const templateId = parseInt(req.params.id);

    if (isNaN(templateId)) {
      return res.status(400).json({ message: "Invalid template ID" });
    }

    // Get template
    const [template] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, templateId))
      .limit(1);

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    res.json({
      scheduleEnabled: template.scheduleEnabled,
      scheduleConfig: template.scheduleConfig || {},
    });
  } catch (error) {
    console.error("[Task Templates API] Error getting schedule:", error);
    res.status(500).json({ message: "Failed to get schedule" });
  }
});

// POST /api/task-templates/:id/test-schedule - Test schedule calculation
router.post("/:id/test-schedule", checkModulePermission("tasks", "view"), async (req: any, res: any) => {
  try {
    const templateId = parseInt(req.params.id);

    if (isNaN(templateId)) {
      return res.status(400).json({ message: "Invalid template ID" });
    }

    // Get template
    const [template] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, templateId))
      .limit(1);

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    // Get cron expression from request body or template config
    const testSchema = z.object({
      cronExpression: z.string().optional(),
      timezone: z.string().optional(),
    });

    const body = testSchema.parse(req.body);
    const cronExpression = body.cronExpression || (template.scheduleConfig as ScheduleConfig)?.cronExpression;
    const timezone = body.timezone || (template.scheduleConfig as ScheduleConfig)?.timezone || "UTC";

    if (!cronExpression) {
      return res.status(400).json({ message: "Cron expression is required" });
    }

    // Validate cron expression
    if (!parseCronExpression(cronExpression)) {
      return res.status(400).json({ message: "Invalid cron expression" });
    }

    // Calculate next run
    const nextRun = calculateNextRun(cronExpression, timezone);

    if (!nextRun) {
      return res.status(400).json({ message: "Could not calculate next run time" });
    }

    res.json({
      cronExpression,
      timezone,
      nextRunAt: nextRun.toISOString(),
      nextRunAtFormatted: nextRun.toLocaleString(),
    });
  } catch (error) {
    console.error("[Task Templates API] Error testing schedule:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid request data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to test schedule" });
  }
});

export default router;

