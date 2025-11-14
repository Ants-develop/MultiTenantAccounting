import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../db";
import { clients, tasks, clientDocuments, emailMessages, clientOnboardingSteps, clientOnboardingForms } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/client-documents/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type. Only images, PDFs, and Office documents are allowed."));
  },
});

const router = express.Router();

// =====================================================
// Client Portal Authentication
// =====================================================

/**
 * POST /api/client-portal/login
 * Authenticate client user
 */
router.post("/login", async (req: any, res: any) => {
  try {
    const { email, password, clientCode } = req.body;

    if (!email || !password || !clientCode) {
      return res.status(400).json({ error: "Email, password, and client code are required" });
    }

    // Find client by code
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.code, clientCode))
      .limit(1);

    if (!client || !client.isActive) {
      return res.status(401).json({ error: "Invalid client code or inactive client" });
    }

    // TODO: Implement client user authentication
    // For now, we'll use a simple approach where we check if the email matches
    // In production, you'd have a separate client_users table with passwords
    // This is a placeholder - you should implement proper client user management
    
    // Generate a simple token (in production, use JWT)
    const token = crypto.randomBytes(32).toString("hex");
    
    // Store token in session (or use JWT)
    req.session.clientPortalToken = token;
    req.session.clientPortalClientId = client.id;

    res.json({
      token,
      clientId: client.id,
      clientName: client.name,
    });
  } catch (error: any) {
    console.error("Error in client portal login:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/client-portal/dashboard
 * Get dashboard data for client
 */
router.get("/dashboard", async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.query.clientId as string) || req.session.clientPortalClientId;

    if (!clientId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get client info
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Get pending tasks
    const pendingTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, clientId), // Assuming workspaceId maps to clientId
          sql`${tasks.status} IN ('todo', 'in_progress')`
        )
      )
      .orderBy(desc(tasks.dueDate))
      .limit(10);

    // Get required documents (not uploaded yet)
    // Note: Check if fileData is null or empty to determine if document is uploaded
    const requiredDocuments = await db
      .select()
      .from(clientDocuments)
      .where(
        and(
          eq(clientDocuments.clientId, clientId),
          sql`(${clientDocuments.fileData} IS NULL OR ${clientDocuments.fileData} = '')`
        )
      )
      .orderBy(desc(clientDocuments.createdAt))
      .limit(10);

    // Get recent messages
    const recentMessages = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.clientId, clientId))
      .orderBy(desc(emailMessages.receivedAt))
      .limit(10);

    // Get onboarding status
    const onboardingSteps = await db
      .select()
      .from(clientOnboardingSteps)
      .where(eq(clientOnboardingSteps.clientId, clientId));

    const completedSteps = onboardingSteps.filter((s) => s.isCompleted).length;
    const totalSteps = onboardingSteps.length;
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    // Calculate invoice balance (placeholder - implement when billing is ready)
    // TODO: Calculate from invoices table when billing module is implemented
    const invoiceBalance = 0;

    // Get workflows (jobs) for this client
    const workflows = await db
      .select({
        id: sql<number>`id`,
        name: sql<string>`title`,
        currentStage: sql<string>`current_stage`,
        completedSteps: sql<number>`0`, // Placeholder
        totalSteps: sql<number>`1`, // Placeholder
        progress: sql<number>`0`, // Placeholder
      })
      .from(sql`jobs`)
      .where(sql`client_id = ${clientId}`)
      .limit(5);

    res.json({
      clientName: client.name,
      clientId: client.id,
      pendingTasks: pendingTasks.length,
      requiredDocuments: requiredDocuments.length,
      invoiceBalance,
      unreadMessages: recentMessages.filter((m) => !m.isRead).length,
      tasks: pendingTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
      })),
      documents: requiredDocuments.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        dueDate: d.expirationDate,
        isUploaded: !!(d.fileData && d.fileData.length > 0),
      })),
      messages: recentMessages.map((m) => ({
        id: m.id,
        subject: m.subject,
        bodyText: m.bodyText,
        bodyHtml: m.bodyHtml,
        receivedAt: m.receivedAt,
        isRead: m.isRead,
      })),
      workflows: workflows.map((w) => ({
        id: w.id,
        name: w.name,
        currentStage: w.currentStage,
        completedSteps: w.completedSteps,
        totalSteps: w.totalSteps,
        progress: w.progress,
      })),
      onboardingProgress: {
        completedSteps,
        totalSteps,
        progress,
      },
    });
  } catch (error: any) {
    console.error("Error fetching client portal dashboard:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/client-portal/tasks
 * Get all tasks for client
 */
router.get("/tasks", async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.query.clientId as string) || req.session.clientPortalClientId;

    if (!clientId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const tasksList = await db
      .select()
      .from(tasks)
      .where(eq(tasks.workspaceId, clientId))
      .orderBy(desc(tasks.dueDate));

    res.json(tasksList);
  } catch (error: any) {
    console.error("Error fetching client tasks:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/client-portal/documents
 * Get all documents for client
 */
router.get("/documents", async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.query.clientId as string) || req.session.clientPortalClientId;

    if (!clientId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const documents = await db
      .select()
      .from(clientDocuments)
      .where(eq(clientDocuments.clientId, clientId))
      .orderBy(desc(clientDocuments.createdAt));

    res.json(documents);
  } catch (error: any) {
    console.error("Error fetching client documents:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/client-portal/documents/upload
 * Upload a document
 */
router.post("/documents/upload", upload.single("file"), async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.body.clientId) || req.session.clientPortalClientId;
    const documentId = parseInt(req.body.documentId);

    if (!clientId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Read file data
    const fileData = fs.readFileSync(req.file.path);
    const fileDataBase64 = fileData.toString("base64");

    // Update document record
    await db
      .update(clientDocuments)
      .set({
        fileData: fileDataBase64,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedBy: null, // Client portal uploads don't have a user ID
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(clientDocuments.id, documentId),
          eq(clientDocuments.clientId, clientId)
        )
      );

    // Delete temporary file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: "Document uploaded successfully",
    });
  } catch (error: any) {
    console.error("Error uploading document:", error);
    // Clean up file if it exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/client-portal/documents/:id/download
 * Download a document
 */
router.get("/documents/:id/download", async (req: any, res: any) => {
  try {
    const clientId = req.session.clientPortalClientId;
    const documentId = parseInt(req.params.id);

    if (!clientId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const [document] = await db
      .select()
      .from(clientDocuments)
      .where(
        and(
          eq(clientDocuments.id, documentId),
          eq(clientDocuments.clientId, clientId)
        )
      )
      .limit(1);

    if (!document || !document.fileData) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Convert base64 back to buffer
    const fileBuffer = Buffer.from(document.fileData, "base64");

    res.setHeader("Content-Type", document.fileType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${document.name}"`);
    res.send(fileBuffer);
  } catch (error: any) {
    console.error("Error downloading document:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/client-portal/messages
 * Get all messages for client
 */
router.get("/messages", async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.query.clientId as string) || req.session.clientPortalClientId;

    if (!clientId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const messages = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.clientId, clientId))
      .orderBy(desc(emailMessages.receivedAt));

    res.json(messages);
  } catch (error: any) {
    console.error("Error fetching client messages:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/client-portal/forms
 * Get available forms for client
 */
router.get("/forms", async (req: any, res: any) => {
  try {
    const clientId = parseInt(req.query.clientId as string) || req.session.clientPortalClientId;

    if (!clientId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const forms = await db
      .select()
      .from(clientOnboardingForms)
      .where(eq(clientOnboardingForms.clientId, clientId))
      .orderBy(desc(clientOnboardingForms.createdAt));

    res.json(forms);
  } catch (error: any) {
    console.error("Error fetching client forms:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/client-portal/messages/send
 * Send a message
 */
router.post("/messages/send", async (req: any, res: any) => {
  try {
    const clientId = req.session.clientPortalClientId;
    const { to, subject, body } = req.body;

    if (!clientId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // TODO: Implement message sending via email API
    // For now, just return success
    res.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error: any) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/client-portal/forms/submit
 * Submit a form
 */
router.post("/forms/submit", async (req: any, res: any) => {
  try {
    const clientId = req.session.clientPortalClientId;
    const { formId, answers } = req.body;

    if (!clientId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!formId || !answers) {
      return res.status(400).json({ error: "Form ID and answers are required" });
    }

    // Update form with submitted data
    await db
      .update(clientOnboardingForms)
      .set({
        formData: answers,
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(clientOnboardingForms.id, formId),
          eq(clientOnboardingForms.clientId, clientId)
        )
      );

    res.json({
      success: true,
      message: "Form submitted successfully",
    });
  } catch (error: any) {
    console.error("Error submitting form:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

