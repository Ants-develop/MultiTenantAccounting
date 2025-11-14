import express from "express";
import { requireAuth } from "../middleware/auth";
import { db } from "../db";
import { emailAccounts, emailMessages, emailTemplates, emailRoutingRules } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { emailService } from "../services/email-service";
import { activityLogger } from "../services/activity-logger";

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// =====================================================
// Email Accounts Endpoints
// =====================================================

/**
 * GET /api/email/accounts
 * List email accounts for the current user
 */
router.get("/accounts", async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const accounts = await db
      .select()
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, userId))
      .orderBy(desc(emailAccounts.createdAt));

    // Don't return tokens
    const safeAccounts = accounts.map((acc) => ({
      ...acc,
      accessToken: undefined,
      refreshToken: undefined,
      imapPassword: undefined,
      smtpPassword: undefined,
    }));

    res.json(safeAccounts);
  } catch (error: any) {
    console.error("Error fetching email accounts:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email/accounts
 * Add a new email account
 */
router.post("/accounts", async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const {
      emailAddress,
      accessToken,
      refreshToken,
      tokenExpiry,
      clientId,
    } = req.body;

    if (!emailAddress || !accessToken || !refreshToken) {
      return res.status(400).json({ error: "Email address, access token, and refresh token are required" });
    }

    // Encrypt OAuth tokens
    const crypto = require("crypto");
    const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || "default-key-change-in-production";
    const ALGORITHM = "aes-256-cbc";

    const encryptToken = (token: string): string => {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
      let encrypted = cipher.update(token, "utf8", "hex");
      encrypted += cipher.final("hex");
      return iv.toString("hex") + ":" + encrypted;
    };

    const [account] = await db
      .insert(emailAccounts)
      .values({
        userId,
        clientId: clientId || null,
        emailAddress,
        provider: "gmail",
        accessToken: encryptToken(accessToken),
        refreshToken: encryptToken(refreshToken),
        tokenExpiry: tokenExpiry ? new Date(tokenExpiry) : null,
        // Store tokens in legacy fields as fallback
        imapPassword: encryptToken(accessToken),
        smtpPassword: encryptToken(refreshToken),
        isActive: true,
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
        action: "SYSTEM_UPDATE",
        resource: "SYSTEM",
        metadata: { type: "email_account_created", emailAddress },
      }
    );

    // Don't return tokens
    const safeAccount = {
      ...account,
      accessToken: undefined,
      refreshToken: undefined,
      imapPassword: undefined,
      smtpPassword: undefined,
    };

    res.status(201).json(safeAccount);
  } catch (error: any) {
    console.error("Error creating email account:", error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Email Inbox Endpoints
// =====================================================

/**
 * GET /api/email/inbox
 * Get inbox messages for user's email accounts
 */
router.get("/inbox", async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;

    const whereConditions = accountId
      ? and(
          eq(emailAccounts.userId, userId),
          eq(emailMessages.emailAccountId, accountId),
          eq(emailMessages.isArchived, false)
        )
      : and(
          eq(emailAccounts.userId, userId),
          eq(emailMessages.isArchived, false)
        );

    const messages = await db
      .select({
        id: emailMessages.id,
        emailAccountId: emailMessages.emailAccountId,
        clientId: emailMessages.clientId,
        subject: emailMessages.subject,
        fromAddress: emailMessages.fromAddress,
        toAddresses: emailMessages.toAddresses,
        receivedAt: emailMessages.receivedAt,
        isRead: emailMessages.isRead,
        labels: emailMessages.labels,
        emailAccount: {
          emailAddress: emailAccounts.emailAddress,
        },
      })
      .from(emailMessages)
      .leftJoin(emailAccounts, eq(emailMessages.emailAccountId, emailAccounts.id))
      .where(whereConditions)
      .orderBy(desc(emailMessages.receivedAt))
      .limit(limit);

    res.json(messages);
  } catch (error: any) {
    console.error("Error fetching inbox:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email/messages/:id
 * Get a specific email message
 */
router.get("/messages/:id", async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const messageId = parseInt(req.params.id);

    const [message] = await db
      .select({
        id: emailMessages.id,
        emailAccountId: emailMessages.emailAccountId,
        clientId: emailMessages.clientId,
        subject: emailMessages.subject,
        fromAddress: emailMessages.fromAddress,
        toAddresses: emailMessages.toAddresses,
        ccAddresses: emailMessages.ccAddresses,
        bccAddresses: emailMessages.bccAddresses,
        bodyText: emailMessages.bodyText,
        bodyHtml: emailMessages.bodyHtml,
        attachments: emailMessages.attachments,
        receivedAt: emailMessages.receivedAt,
        isRead: emailMessages.isRead,
        labels: emailMessages.labels,
      })
      .from(emailMessages)
      .leftJoin(emailAccounts, eq(emailMessages.emailAccountId, emailAccounts.id))
      .where(and(eq(emailMessages.id, messageId), eq(emailAccounts.userId, userId)))
      .limit(1);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Mark as read
    await db
      .update(emailMessages)
      .set({ isRead: true })
      .where(eq(emailMessages.id, messageId));

    res.json(message);
  } catch (error: any) {
    console.error("Error fetching message:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email/send
 * Send an email
 */
router.post("/send", async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { accountId, to, subject, body, bodyHtml, attachments } = req.body;

    if (!accountId || !to || !subject || !body) {
      return res.status(400).json({ error: "Account ID, recipient, subject, and body are required" });
    }

    const success = await emailService.sendEmail(accountId, to, subject, body, bodyHtml, attachments);

    if (success) {
      await activityLogger.logActivity(
        {
          userId,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        },
        {
          action: "SYSTEM_UPDATE",
          resource: "SYSTEM",
          metadata: { type: "email_sent", to, subject },
        }
      );
    }

    res.json({ success });
  } catch (error: any) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email/sync
 * Manually trigger email sync for an account
 */
router.post("/sync", async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: "Account ID is required" });
    }

    // Verify account belongs to user
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(and(eq(emailAccounts.id, accountId), eq(emailAccounts.userId, userId)))
      .limit(1);

    if (!account) {
      return res.status(404).json({ error: "Email account not found" });
    }

    // Fetch emails
    const emails = await emailService.fetchEmails(accountId, 50);

    // Process routing rules for each email
    for (const email of emails) {
      await emailService.processRoutingRules(email);
    }

    // Update last sync time
    await db
      .update(emailAccounts)
      .set({ lastSyncAt: new Date() })
      .where(eq(emailAccounts.id, accountId));

    res.json({ success: true, emailsFetched: emails.length });
  } catch (error: any) {
    console.error("Error syncing emails:", error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Email Templates Endpoints
// =====================================================

/**
 * GET /api/email/templates
 * List email templates
 */
router.get("/templates", async (req: any, res: any) => {
  try {
    const category = req.query.category as string | undefined;

    const whereConditions = category
      ? and(eq(emailTemplates.isActive, true), eq(emailTemplates.category, category))
      : eq(emailTemplates.isActive, true);

    const templates = await db
      .select()
      .from(emailTemplates)
      .where(whereConditions)
      .orderBy(desc(emailTemplates.createdAt));

    res.json(templates);
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/email/templates
 * Create an email template
 */
router.post("/templates", async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { name, subject, bodyHtml, bodyText, variables, category } = req.body;

    if (!name || !subject) {
      return res.status(400).json({ error: "Name and subject are required" });
    }

    const [template] = await db
      .insert(emailTemplates)
      .values({
        name,
        subject,
        bodyHtml,
        bodyText,
        variables: variables || {},
        category,
        createdBy: userId,
        isActive: true,
      })
      .returning();

    res.status(201).json(template);
  } catch (error: any) {
    console.error("Error creating template:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

