// Backup Restore API Routes with Supabase Storage Integration
import express from "express";
import multer from "multer";
import { requireAuth, requireGlobalAdmin } from "../middleware/auth";
import { listBackupFiles, getFileMetadata, generateAuthUrl, exchangeCodeForTokens } from "../services/google-drive";
import {
  restoreBackupFromDrive,
  restoreBackupFromStorage,
  getRestoreStatus,
  listRestoreHistory,
} from "../services/mssql-restore";
import {
  listBackupsFromStorage,
  uploadBackupToStorage,
  getBackupMetadata,
  deleteBackupFromStorage,
  ensureBackupsBucket,
} from "../services/backup-storage";
import { db } from "../db";
import { backupRestoreHistory } from "@shared/schema";
import { sql as drizzleSql, desc, eq, and } from "drizzle-orm";
import { activityLogger, ACTIVITY_ACTIONS, RESOURCE_TYPES } from "../services/activity-logger";
import { calculateFileHash } from "../services/google-drive";

const router = express.Router();

// Configure multer for direct file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB limit for .bak files
  },
  fileFilter: (req: express.Request, file: Express.Multer.File, cb: any) => {
    if (file.originalname.endsWith('.bak')) {
      cb(null, true);
    } else {
      cb(new Error('Only .bak files are allowed'));
    }
  },
});

// Apply authentication middleware to all routes
router.use(requireAuth);

// Active restore operations
const activeRestores = new Map<number, { status: string; progress?: number; message?: string }>();

/**
 * GET /api/backup-restore/config-status
 * Check if Google Drive is configured
 */
router.get("/config-status", async (req: any, res: any) => {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const googleDriveConfigured = !!(clientId && clientSecret && refreshToken);
  const supabaseConfigured = !!(supabaseUrl && supabaseKey);
  
  res.json({
    googleDrive: {
      configured: googleDriveConfigured,
      missing: {
        clientId: !clientId,
        clientSecret: !clientSecret,
        refreshToken: !refreshToken,
      },
    },
    supabase: {
      configured: supabaseConfigured,
      missing: {
        url: !supabaseUrl,
        serviceRoleKey: !supabaseKey,
      },
    },
    message: googleDriveConfigured && supabaseConfigured
      ? "Both Google Drive and Supabase Storage are configured"
      : "Some services are not configured. Please check environment variables.",
  });
});

/**
 * GET /api/backup-restore/auth-url
 * Generate OAuth2 authorization URL for Google Drive
 */
router.get("/auth-url", async (req: any, res: any) => {
  try {
    const { url, clientId } = generateAuthUrl();
    res.json({ url, clientId });
  } catch (error: any) {
    console.error("Error generating auth URL:", error);
    res.status(400).json({ 
      error: error.message || "Failed to generate authorization URL",
    });
  }
});

/**
 * POST /api/backup-restore/exchange-code
 * Exchange authorization code for refresh token
 */
router.post("/exchange-code", async (req: any, res: any) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    const { refreshToken, accessToken } = await exchangeCodeForTokens(code);
    
    res.json({
      refreshToken,
      message: "Refresh token obtained successfully. Set GOOGLE_DRIVE_REFRESH_TOKEN environment variable.",
      instructions: [
        "1. Copy the refresh token above",
        "2. Add it to your .env file: GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token",
        "3. Restart your server",
      ],
    });
  } catch (error: any) {
    console.error("Error exchanging code:", error);
    res.status(400).json({ 
      error: error.message || "Failed to exchange authorization code",
    });
  }
});

/**
 * GET /api/backup-restore/drive-files
 * Fetch available .bak files from Google Drive
 */
router.get("/drive-files", async (req: any, res: any) => {
  try {
    const files = await listBackupFiles();
    res.json(files);
  } catch (error: any) {
    console.error("Error fetching drive files:", error);
    res.status(500).json({ 
      error: error.message || "Failed to fetch Google Drive files",
    });
  }
});

/**
 * GET /api/backup-restore/storage-files
 * List backup files from Supabase Storage
 */
router.get("/storage-files", async (req: any, res: any) => {
  try {
    const backups = await listBackupsFromStorage();
    res.json(backups);
  } catch (error: any) {
    console.error("Error listing storage backups:", error);
    res.status(500).json({ 
      error: error.message || "Failed to list Supabase Storage backups",
    });
  }
});

/**
 * POST /api/backup-restore/upload-to-storage
 * Upload .bak file directly to Supabase Storage
 */
router.post("/upload-to-storage", upload.single("file"), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileName = req.file.originalname;

    // Upload to Supabase Storage
    const result = await uploadBackupToStorage(
      req.file.buffer,
      fileName
    );

    // Create history record
    const [record] = await db
      .insert(backupRestoreHistory)
      .values({
        supabaseStoragePath: result.path,
        googleDriveFileName: fileName,
        fileHash: result.hash,
        storageSource: 'supabase_storage',
        restoreStatus: 'completed',
        clientId: null, // Global storage, no clientId
        startedAt: new Date(),
        completedAt: new Date(),
        createdBy: req.session.userId,
      })
      .returning();

    await activityLogger.logActivity(
      {
        userId: req.session.userId,
        companyId: undefined,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      {
        action: 'BACKUP_UPLOAD_TO_STORAGE',
        resource: RESOURCE_TYPES.SYSTEM,
        resourceId: undefined,
        metadata: { 
          fileName,
          storagePath: result.path,
          size: result.size,
        },
      }
    );

    res.status(201).json({
      id: record.id,
      path: result.path,
      hash: result.hash,
      size: result.size,
      message: "Backup uploaded to Supabase Storage successfully",
    });
  } catch (error: any) {
    console.error("Error uploading backup to storage:", error);
    res.status(500).json({ 
      error: error.message || "Failed to upload backup to storage",
    });
  }
});

/**
 * GET /api/backup-restore/storage-files/:path/metadata
 * Get backup file metadata from Supabase Storage
 */
router.get("/storage-files/*/metadata", async (req: any, res: any) => {
  try {
    const storagePath = req.params[0];
    const metadata = await getBackupMetadata(storagePath);
    res.json(metadata);
  } catch (error: any) {
    console.error("Error getting backup metadata:", error);
    res.status(500).json({ 
      error: error.message || "Failed to get backup metadata",
    });
  }
});

/**
 * POST /api/backup-restore/restore
 * Start restore process from Google Drive or Supabase Storage
 */
router.post("/restore", async (req: any, res: any) => {
  try {
    const { fileId, fileName, storagePath, options } = req.body;

    if (!fileId && !storagePath) {
      return res.status(400).json({ error: "Either fileId (Google Drive) or storagePath (Supabase Storage) is required" });
    }

    let restoreId: number;

    if (storagePath) {
      // Restore from Supabase Storage
      restoreId = await restoreBackupFromStorage(
        storagePath,
        options || {},
        (progress) => {
          activeRestores.set(restoreId, {
            status: progress.status,
            progress: progress.progress,
            message: progress.message,
          });
        }
      );
    } else {
      // Restore from Google Drive (and upload to Supabase Storage)
      restoreId = await restoreBackupFromDrive(
        fileId,
        fileName,
        options || {},
        (progress) => {
          activeRestores.set(restoreId, {
            status: progress.status,
            progress: progress.progress,
            message: progress.message,
          });
        }
      );
    }

    res.json({
      restoreId,
      message: "Restore process started",
    });
  } catch (error: any) {
    console.error("Error starting restore:", error);
    res.status(500).json({ 
      error: error.message || "Failed to start restore process",
    });
  }
});

/**
 * GET /api/backup-restore/status/:id
 * Get restore status
 */
router.get("/status/:id", async (req: any, res: any) => {
  try {
    const restoreId = parseInt(req.params.id);
    const status = activeRestores.get(restoreId);
    const record = await getRestoreStatus(restoreId);

    if (!record) {
      return res.status(404).json({ error: "Restore record not found" });
    }

    res.json({
      ...record,
      progress: status?.progress,
      message: status?.message,
    });
  } catch (error: any) {
    console.error("Error getting restore status:", error);
    res.status(500).json({ 
      error: error.message || "Failed to get restore status",
    });
  }
});

/**
 * POST /api/backup-restore/cancel/:id
 * Cancel active restore
 */
router.post("/cancel/:id", async (req: any, res: any) => {
  try {
    const restoreId = parseInt(req.params.id);
    
    await db
      .update(backupRestoreHistory)
      .set({
        restoreStatus: 'failed',
        errorMessage: 'Cancelled by user',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(backupRestoreHistory.id, restoreId));

    activeRestores.delete(restoreId);

    res.json({ message: "Restore cancelled successfully" });
  } catch (error: any) {
    console.error("Error cancelling restore:", error);
    res.status(500).json({ 
      error: error.message || "Failed to cancel restore",
    });
  }
});

/**
 * GET /api/backup-restore/history
 * Fetch restore history
 */
router.get("/history", async (req: any, res: any) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await listRestoreHistory(clientId, limit, offset);
    res.json(history);
  } catch (error: any) {
    console.error("Error fetching restore history:", error);
    res.status(500).json({ 
      error: error.message || "Failed to fetch restore history",
    });
  }
});

/**
 * DELETE /api/backup-restore/storage-files/*
 * Delete backup file from Supabase Storage
 */
router.delete("/storage-files/*", async (req: any, res: any) => {
  try {
    const storagePath = req.params[0];
    
    // Delete from storage
    await deleteBackupFromStorage(storagePath);

    // Update or delete history record
    await db
      .update(backupRestoreHistory)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(backupRestoreHistory.supabaseStoragePath, storagePath));

    await activityLogger.logActivity(
      {
        userId: req.session.userId,
        companyId: undefined,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
      {
        action: 'BACKUP_DELETE_FROM_STORAGE',
        resource: RESOURCE_TYPES.SYSTEM,
        resourceId: undefined,
        metadata: { storagePath },
      }
    );

    res.json({ message: "Backup deleted from Supabase Storage successfully" });
  } catch (error: any) {
    console.error("Error deleting backup from storage:", error);
    res.status(500).json({ 
      error: error.message || "Failed to delete backup from storage",
    });
  }
});

export default router;

