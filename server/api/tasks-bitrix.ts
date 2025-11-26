// Tasks API Routes (Bitrix24-style)
import express from "express";
import { db } from "../db";
import { 
  tasksTable, 
  taskChecklists, 
  taskComments, 
  taskAttachments, 
  taskDependencies,
  users,
  clients
} from "@shared/schema";
import { eq, and, inArray, desc, or, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { getUserClientsByModule, checkModulePermission } from "../middleware/permissions";
import { activityLogger, ACTIVITY_ACTIONS } from "../services/activity-logger";
import { z } from "zod";
import { insertTaskSchema, insertTaskChecklistSchema, insertTaskCommentSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Setup file upload directory
const uploadDir = path.join(process.cwd(), 'uploads', 'tasks');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const taskId = req.params.id;
    const taskUploadDir = path.join(uploadDir, taskId || 'temp');
    if (!fs.existsSync(taskUploadDir)) {
      fs.mkdirSync(taskUploadDir, { recursive: true });
    }
    cb(null, taskUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// GET /api/tasks-bitrix - List tasks
router.get("/", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    
    // Parse clientIds from query parameter (comma-separated)
    const clientIdsParam = req.query.clientIds as string;
    let clientIds: number[] = [];
    
    if (clientIdsParam) {
      clientIds = clientIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    }

    // Parse autoCreated filter
    const autoCreatedParam = req.query.autoCreated as string;
    const autoCreated = autoCreatedParam === 'true';

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
    const conditions = [inArray(tasksTable.clientId, clientIds)];
    
    // Apply filters
    if (req.query.status) {
      const statuses = (req.query.status as string).split(',');
      conditions.push(inArray(tasksTable.status, statuses));
    }
    
    if (req.query.priority) {
      const priorities = (req.query.priority as string).split(',');
      conditions.push(inArray(tasksTable.priority, priorities));
    }
    
    if (req.query.assigned_to) {
      const assigneeId = parseInt(req.query.assigned_to as string);
      if (!isNaN(assigneeId)) {
        conditions.push(eq(tasksTable.assignedTo, assigneeId));
      }
    }
    
    if (req.query.tags) {
      const tags = (req.query.tags as string).split(',');
      // PostgreSQL array contains check
      conditions.push(sql`${tasksTable.tags} && ${tags}`);
    }
    
    // Filter for auto-created tasks (tasks with templateId)
    if (autoCreatedParam === 'true') {
      conditions.push(sql`${tasksTable.templateId} IS NOT NULL`);
    }

    const tasks = await db
      .select()
      .from(tasksTable)
      .where(and(...conditions))
      .orderBy(desc(tasksTable.createdAt));

    res.json(tasks);
  } catch (error) {
    console.error("[Tasks Bitrix API] Error fetching tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// GET /api/tasks-bitrix/:id - Get task with all related data
router.get("/:id", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, task.clientId, 'tasks', 'view');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Fetch related data
    const [checklists, comments, attachments, dependencies] = await Promise.all([
      db.select().from(taskChecklists).where(eq(taskChecklists.taskId, taskId)).orderBy(taskChecklists.orderIdx),
      db.select().from(taskComments).where(eq(taskComments.taskId, taskId)).orderBy(desc(taskComments.createdAt)),
      db.select().from(taskAttachments).where(eq(taskAttachments.taskId, taskId)).orderBy(desc(taskAttachments.createdAt)),
      db.select().from(taskDependencies).where(eq(taskDependencies.taskId, taskId)),
    ]);

    // Fetch dependent tasks
    const dependentTaskIds = dependencies.map(d => d.dependsOn);
    const dependentTasks = dependentTaskIds.length > 0
      ? await db.select().from(tasksTable).where(inArray(tasksTable.id, dependentTaskIds))
      : [];

    res.json({
      ...task,
      checklists,
      comments,
      attachments,
      dependencies: dependentTasks,
    });
  } catch (error) {
    console.error("[Tasks Bitrix API] Error fetching task:", error);
    res.status(500).json({ message: "Failed to fetch task" });
  }
});

// POST /api/tasks-bitrix - Create task
router.post("/", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    
    // Validate request body
    const validationResult = insertTaskSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const data = validationResult.data;

    // Check permission
    const hasAccess = await checkModulePermission(userId, data.clientId, 'tasks', 'create');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Create task
    const [task] = await db
      .insert(tasksTable)
      .values({
        ...data,
        createdBy: userId,
      })
      .returning();

    // Log activity
    await activityLogger.logCRUD(
      "CREATE",
      "task",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: data.clientId,
      },
      task.id,
      undefined,
      data
    );

    res.status(201).json(task);
  } catch (error) {
    console.error("[Tasks Bitrix API] Error creating task:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
});

// PUT /api/tasks-bitrix/:id - Update task
router.put("/:id", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    // Get existing task
    const [existing] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, existing.clientId, 'tasks', 'edit');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Validate and build update data
    const updateData: any = {};
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.priority !== undefined) updateData.priority = req.body.priority;
    if (req.body.tags !== undefined) updateData.tags = req.body.tags;
    if (req.body.assignedTo !== undefined) updateData.assignedTo = req.body.assignedTo;
    if (req.body.estimatedMinutes !== undefined) updateData.estimatedMinutes = req.body.estimatedMinutes;
    if (req.body.metadata !== undefined) updateData.metadata = req.body.metadata;
    if (req.body.dueAt !== undefined) updateData.dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
    if (req.body.reminderAt !== undefined) updateData.reminderAt = req.body.reminderAt ? new Date(req.body.reminderAt) : null;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(tasksTable)
      .set(updateData)
      .where(eq(tasksTable.id, taskId))
      .returning();

    // Log activity
    await activityLogger.logCRUD(
      "UPDATE",
      "task",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: existing.clientId,
      },
      taskId,
      existing,
      updateData
    );

    res.json(updated);
  } catch (error) {
    console.error("[Tasks Bitrix API] Error updating task:", error);
    res.status(500).json({ message: "Failed to update task" });
  }
});

// DELETE /api/tasks-bitrix/:id - Delete task
router.delete("/:id", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    // Get existing task
    const [existing] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, existing.clientId, 'tasks', 'delete');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Delete task (cascade will delete checklists, comments, attachments, dependencies)
    await db.delete(tasksTable).where(eq(tasksTable.id, taskId));

    // Delete uploaded files
    const taskUploadDir = path.join(uploadDir, taskId.toString());
    if (fs.existsSync(taskUploadDir)) {
      fs.rmSync(taskUploadDir, { recursive: true, force: true });
    }

    // Log activity
    await activityLogger.logCRUD(
      "DELETE",
      "task",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: existing.clientId,
      },
      taskId,
      existing,
      undefined
    );

    res.status(204).send();
  } catch (error) {
    console.error("[Tasks Bitrix API] Error deleting task:", error);
    res.status(500).json({ message: "Failed to delete task" });
  }
});

// PATCH /api/tasks-bitrix/:id/status - Update task status
router.patch("/:id/status", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const taskId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    if (!status || !['open', 'in_progress', 'review', 'done', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Get existing task
    const [existing] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, existing.clientId, 'tasks', 'edit');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const [updated] = await db
      .update(tasksTable)
      .set({ 
        status,
        updatedAt: new Date(),
      })
      .where(eq(tasksTable.id, taskId))
      .returning();

    // Log activity
    await activityLogger.logCRUD(
      "UPDATE",
      "task",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: existing.clientId,
      },
      taskId,
      { status: existing.status },
      { status }
    );

    res.json(updated);
  } catch (error) {
    console.error("[Tasks Bitrix API] Error updating task status:", error);
    res.status(500).json({ message: "Failed to update task status" });
  }
});

// POST /api/tasks-bitrix/:id/checklists - Add checklist item
router.post("/:id/checklists", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    // Validate request body
    const validationResult = insertTaskChecklistSchema.safeParse({
      ...req.body,
      taskId,
    });
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    // Get task to check permission
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, task.clientId, 'tasks', 'edit');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const data = validationResult.data;
    const [checklist] = await db
      .insert(taskChecklists)
      .values(data)
      .returning();

    // Log activity
    await activityLogger.logCRUD(
      "CREATE",
      "task_checklist",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: task.clientId,
      },
      checklist.id,
      undefined,
      data
    );

    res.status(201).json(checklist);
  } catch (error) {
    console.error("[Tasks Bitrix API] Error creating checklist:", error);
    res.status(500).json({ message: "Failed to create checklist" });
  }
});

// PUT /api/tasks-bitrix/:id/checklists/:checklistId - Update checklist item
router.put("/:id/checklists/:checklistId", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const taskId = parseInt(req.params.id);
    const checklistId = parseInt(req.params.checklistId);
    
    if (isNaN(taskId) || isNaN(checklistId)) {
      return res.status(400).json({ message: "Invalid task or checklist ID" });
    }

    // Get task to check permission
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, task.clientId, 'tasks', 'edit');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get existing checklist
    const [existing] = await db
      .select()
      .from(taskChecklists)
      .where(and(
        eq(taskChecklists.id, checklistId),
        eq(taskChecklists.taskId, taskId)
      ))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Checklist item not found" });
    }

    const updateData: any = {};
    if (req.body.text !== undefined) updateData.text = req.body.text;
    if (req.body.completed !== undefined) updateData.completed = req.body.completed;
    if (req.body.assignedTo !== undefined) updateData.assignedTo = req.body.assignedTo;
    if (req.body.orderIdx !== undefined) updateData.orderIdx = req.body.orderIdx;

    const [updated] = await db
      .update(taskChecklists)
      .set(updateData)
      .where(eq(taskChecklists.id, checklistId))
      .returning();

    // Log activity
    await activityLogger.logCRUD(
      "UPDATE",
      "task_checklist",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: task.clientId,
      },
      checklistId,
      existing,
      updateData
    );

    res.json(updated);
  } catch (error) {
    console.error("[Tasks Bitrix API] Error updating checklist:", error);
    res.status(500).json({ message: "Failed to update checklist" });
  }
});

// DELETE /api/tasks-bitrix/:id/checklists/:checklistId - Delete checklist item
router.delete("/:id/checklists/:checklistId", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const taskId = parseInt(req.params.id);
    const checklistId = parseInt(req.params.checklistId);
    
    if (isNaN(taskId) || isNaN(checklistId)) {
      return res.status(400).json({ message: "Invalid task or checklist ID" });
    }

    // Get task to check permission
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, task.clientId, 'tasks', 'edit');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get existing checklist
    const [existing] = await db
      .select()
      .from(taskChecklists)
      .where(and(
        eq(taskChecklists.id, checklistId),
        eq(taskChecklists.taskId, taskId)
      ))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Checklist item not found" });
    }

    await db.delete(taskChecklists).where(eq(taskChecklists.id, checklistId));

    // Log activity
    await activityLogger.logCRUD(
      "DELETE",
      "task_checklist",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: task.clientId,
      },
      checklistId,
      existing,
      undefined
    );

    res.status(204).send();
  } catch (error) {
    console.error("[Tasks Bitrix API] Error deleting checklist:", error);
    res.status(500).json({ message: "Failed to delete checklist" });
  }
});

// POST /api/tasks-bitrix/:id/comments - Add comment
router.post("/:id/comments", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    // Validate request body
    const validationResult = insertTaskCommentSchema.safeParse({
      ...req.body,
      taskId,
      userId,
    });
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    // Get task to check permission
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, task.clientId, 'tasks', 'view');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const data = validationResult.data;
    const [comment] = await db
      .insert(taskComments)
      .values(data)
      .returning();

    // Log activity
    await activityLogger.logCRUD(
      "CREATE",
      "task_comment",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: task.clientId,
      },
      comment.id,
      undefined,
      { taskId, comment: data.comment }
    );

    res.status(201).json(comment);
  } catch (error) {
    console.error("[Tasks Bitrix API] Error creating comment:", error);
    res.status(500).json({ message: "Failed to create comment" });
  }
});

// GET /api/tasks-bitrix/:id/attachments - List attachments
router.get("/:id/attachments", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    // Get task to check permission
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, task.clientId, 'tasks', 'view');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    const attachments = await db
      .select()
      .from(taskAttachments)
      .where(eq(taskAttachments.taskId, taskId))
      .orderBy(desc(taskAttachments.createdAt));

    res.json(attachments);
  } catch (error) {
    console.error("[Tasks Bitrix API] Error fetching attachments:", error);
    res.status(500).json({ message: "Failed to fetch attachments" });
  }
});

// POST /api/tasks-bitrix/:id/attachments - Upload attachment
router.post("/:id/attachments", upload.single('file'), async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Get task to check permission
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    if (!task) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, task.clientId, 'tasks', 'edit');
    if (!hasAccess) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: "Access denied" });
    }

    // Move file to task-specific directory if needed
    const taskUploadDir = path.join(uploadDir, taskId.toString());
    if (!fs.existsSync(taskUploadDir)) {
      fs.mkdirSync(taskUploadDir, { recursive: true });
    }

    const finalPath = path.join(taskUploadDir, req.file.filename);
    if (req.file.path !== finalPath) {
      fs.renameSync(req.file.path, finalPath);
    }

    const [attachment] = await db
      .insert(taskAttachments)
      .values({
        taskId,
        uploadedBy: userId,
        filename: req.file.originalname,
        filePath: path.relative(process.cwd(), finalPath),
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      })
      .returning();

    // Log activity
    await activityLogger.logCRUD(
      "CREATE",
      "task_attachment",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: task.clientId,
      },
      attachment.id,
      undefined,
      { taskId, filename: req.file.originalname }
    );

    res.status(201).json(attachment);
  } catch (error) {
    console.error("[Tasks Bitrix API] Error uploading attachment:", error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Failed to upload attachment" });
  }
});

// DELETE /api/tasks-bitrix/:id/attachments/:attachmentId - Delete attachment
router.delete("/:id/attachments/:attachmentId", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const taskId = parseInt(req.params.id);
    const attachmentId = parseInt(req.params.attachmentId);
    
    if (isNaN(taskId) || isNaN(attachmentId)) {
      return res.status(400).json({ message: "Invalid task or attachment ID" });
    }

    // Get task to check permission
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, task.clientId, 'tasks', 'edit');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get existing attachment
    const [existing] = await db
      .select()
      .from(taskAttachments)
      .where(and(
        eq(taskAttachments.id, attachmentId),
        eq(taskAttachments.taskId, taskId)
      ))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    // Delete file
    const filePath = path.join(process.cwd(), existing.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await db.delete(taskAttachments).where(eq(taskAttachments.id, attachmentId));

    // Log activity
    await activityLogger.logCRUD(
      "DELETE",
      "task_attachment",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: task.clientId,
      },
      attachmentId,
      existing,
      undefined
    );

    res.status(204).send();
  } catch (error) {
    console.error("[Tasks Bitrix API] Error deleting attachment:", error);
    res.status(500).json({ message: "Failed to delete attachment" });
  }
});

// POST /api/tasks-bitrix/:id/dependencies - Add dependency
router.post("/:id/dependencies", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const taskId = parseInt(req.params.id);
    const { dependsOnId } = req.body;
    
    if (isNaN(taskId) || !dependsOnId || isNaN(dependsOnId)) {
      return res.status(400).json({ message: "Invalid task or dependency ID" });
    }

    // Prevent self-dependency
    if (taskId === dependsOnId) {
      return res.status(400).json({ message: "Task cannot depend on itself" });
    }

    // Get task to check permission
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Get dependent task
    const [dependsOnTask] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, dependsOnId))
      .limit(1);

    if (!dependsOnTask) {
      return res.status(404).json({ message: "Dependent task not found" });
    }

    // Check permission for both tasks
    const hasAccess = await checkModulePermission(userId, task.clientId, 'tasks', 'edit');
    const hasAccessToDependsOn = await checkModulePermission(userId, dependsOnTask.clientId, 'tasks', 'view');
    
    if (!hasAccess || !hasAccessToDependsOn) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check if dependency already exists
    const [existing] = await db
      .select()
      .from(taskDependencies)
      .where(and(
        eq(taskDependencies.taskId, taskId),
        eq(taskDependencies.dependsOn, dependsOnId)
      ))
      .limit(1);

    if (existing) {
      return res.status(400).json({ message: "Dependency already exists" });
    }

    await db.insert(taskDependencies).values({
      taskId,
      dependsOn: dependsOnId,
    });

    // Log activity
    await activityLogger.logCRUD(
      "CREATE",
      "task_dependency",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: task.clientId,
      },
      taskId,
      undefined,
      { dependsOnId }
    );

    res.status(201).json({ taskId, dependsOn: dependsOnId });
  } catch (error) {
    console.error("[Tasks Bitrix API] Error adding dependency:", error);
    res.status(500).json({ message: "Failed to add dependency" });
  }
});

// DELETE /api/tasks-bitrix/:id/dependencies/:dependsOnId - Remove dependency
router.delete("/:id/dependencies/:dependsOnId", async (req: any, res: any) => {
  try {
    const userId = req.session.userId;
    const taskId = parseInt(req.params.id);
    const dependsOnId = parseInt(req.params.dependsOnId);
    
    if (isNaN(taskId) || isNaN(dependsOnId)) {
      return res.status(400).json({ message: "Invalid task or dependency ID" });
    }

    // Get task to check permission
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .limit(1);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permission
    const hasAccess = await checkModulePermission(userId, task.clientId, 'tasks', 'edit');
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get existing dependency
    const [existing] = await db
      .select()
      .from(taskDependencies)
      .where(and(
        eq(taskDependencies.taskId, taskId),
        eq(taskDependencies.dependsOn, dependsOnId)
      ))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ message: "Dependency not found" });
    }

    await db.delete(taskDependencies).where(and(
      eq(taskDependencies.taskId, taskId),
      eq(taskDependencies.dependsOn, dependsOnId)
    ));

    // Log activity
    await activityLogger.logCRUD(
      "DELETE",
      "task_dependency",
      {
        userId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        companyId: task.clientId,
      },
      taskId,
      existing,
      undefined
    );

    res.status(204).send();
  } catch (error) {
    console.error("[Tasks Bitrix API] Error removing dependency:", error);
    res.status(500).json({ message: "Failed to remove dependency" });
  }
});

export default router;

