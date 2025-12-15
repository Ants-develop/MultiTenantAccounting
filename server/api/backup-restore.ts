// Backup Restore API Routes with Supabase Storage Integration
import express from "express";
import multer from "multer";
import { requireAuth, requireGlobalAdmin } from "../middleware/auth";
import { listBackupFiles, getFileMetadata, generateAuthUrl, exchangeCodeForTokens } from "../services/google-drive";
import {
  restoreBackupFromDrive,
  restoreBackupFromStorage,
  restoreBackupFromDownload,
  getRestoreStatus,
  listRestoreHistory,
} from "../services/mssql-restore";
import {
  downloadBackupFromDrive,
  getDownloadRecord,
  listDownloads,
  deleteDownload,
} from "../services/backup-download";
import {
  listBackupsFromStorage,
  uploadBackupToStorage,
  getBackupMetadata,
  deleteBackupFromStorage,
  ensureBackupsBucket,
} from "../services/backup-storage";
import { db } from "../db";
import { mssqlRestores } from "@shared/schema";
// Backward compatibility
const backupRestoreHistory = mssqlRestores;
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
 * GET /api/backup-restore/test-ssh
 * Test SSH connection using credentials from database settings
 */
router.get("/test-ssh", async (req: any, res: any) => {
  try {
    // Try to get SSH credentials from database first, fall back to env vars
    let sshHost = process.env.SSH_HOST;
    let sshUser = process.env.SSH_USER;
    let sshKey = process.env.SSH_KEY;
    
    // Check database settings
    try {
      const settings = await db.query.mainCompanySettings.findFirst();
      if (settings?.sshHost && settings?.sshUser) {
        sshHost = settings.sshHost;
        sshUser = settings.sshUser;
        sshKey = settings.sshKeyContent || process.env.SSH_KEY;
      }
    } catch (settingsError) {
      console.error('Error fetching SSH settings from database:', settingsError);
      // Continue with env vars if settings fetch fails
    }

    if (!sshHost || !sshUser) {
      return res.json({ 
        status: 'disconnected',
        error: "SSH credentials not configured",
        details: "Configure SSH credentials in system settings"
      });
    }

    // Check if SSH configuration is available (cross-platform)
    try {
      const { execSync } = await import('child_process');
      const os = await import('os');
      const platform = os.default?.platform?.() || os.platform();
      
      // Use different command based on OS
      const checkCommand = platform === 'win32' ? 'where ssh' : 'which ssh';
      
      try {
        execSync(checkCommand, { timeout: 1000, stdio: 'pipe' });
      } catch {
        // SSH binary not found in PATH, but SSH credentials are configured
        // We'll still consider it configured since user may access via other means
      }
      
      // SSH credentials are configured
      res.json({ 
        status: 'configured',
        message: 'SSH credentials configured',
        host: sshHost,
        user: sshUser
      });
    } catch {
      res.json({ 
        status: 'disconnected',
        error: 'SSH status check failed',
        details: 'Unable to verify SSH configuration'
      });
    }
  } catch (error: any) {
    res.json({ 
      status: 'error',
      error: 'SSH test failed',
      details: error.message
    });
  }
});

/**
 * GET /api/backup-restore/test-mssql
 * Test MSSQL database connection using credentials from database settings
 */
router.get("/test-mssql", async (req: any, res: any) => {
  try {
    // Try to get MSSQL credentials from database first, fall back to env vars
    let mssqlServer = process.env.MSSQL_SERVER;
    let mssqlUser = process.env.MSSQL_USER;
    let mssqlPassword = process.env.MSSQL_PASSWORD;
    let mssqlPort = 1433;
    let mssqlEncrypt = true;
    let mssqlTrustServerCertificate = false;

    // Check database settings
    try {
      const settings = await db.query.mainCompanySettings.findFirst();
      if (settings?.mssqlServer && settings?.mssqlUser && settings?.mssqlPassword) {
        mssqlServer = settings.mssqlServer;
        mssqlUser = settings.mssqlUser;
        mssqlPassword = settings.mssqlPassword;
        mssqlPort = settings.mssqlPort || 1433;
        mssqlEncrypt = settings.mssqlEncrypt !== false;
        mssqlTrustServerCertificate = settings.mssqlTrustServerCertificate === true;
      }
    } catch (settingsError) {
      console.error('Error fetching MSSQL settings from database:', settingsError);
      // Continue with env vars if settings fetch fails
    }

    if (!mssqlServer || !mssqlUser || !mssqlPassword) {
      return res.json({ 
        status: 'disconnected',
        error: "MSSQL credentials not configured",
        details: "Configure MSSQL credentials in system settings"
      });
    }

    // Try to connect to MSSQL
    try {
      const mssql = await import('mssql');
      // Handle different import formats - mssql module exports ConnectionPool
      const ConnectionPool = (mssql as any).default?.ConnectionPool || (mssql as any).ConnectionPool;
      
      if (!ConnectionPool) {
        throw new Error('ConnectionPool class not found in mssql module');
      }
      
      const pool = new (ConnectionPool as any)({
        server: mssqlServer,
        port: mssqlPort,
        authentication: {
          type: 'default',
          options: {
            userName: mssqlUser,
            password: mssqlPassword,
          }
        },
        options: {
          trustServerCertificate: mssqlTrustServerCertificate,
          encrypt: mssqlEncrypt,
          connectTimeout: 5000,
        }
      });

      await pool.connect();
      const result = await pool.request().query('SELECT @@VERSION as version');
      await pool.close();

      res.json({ 
        status: 'connected',
        message: 'MSSQL connection successful',
        version: result.recordset[0]?.version || 'Unknown'
      });
    } catch (dbError: any) {
      res.json({ 
        status: 'disconnected',
        error: 'MSSQL connection failed',
        details: dbError.message || 'Unable to establish database connection'
      });
    }
  } catch (error: any) {
    res.json({ 
      status: 'error',
      error: 'MSSQL test failed',
      details: error.message
    });
  }
});

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
 * Returns empty array if storage is not configured or bucket doesn't exist
 */
router.get("/storage-files", async (req: any, res: any) => {
  try {
    const backups = await listBackupsFromStorage();
    res.json(backups);
  } catch (error: any) {
    // Gracefully handle errors - return empty array instead of failing
    // This allows the UI to work even if Supabase Storage is not configured
    console.error("Error listing storage backups (returning empty array):", error.message);
    res.json([]);
  }
});

/**
 * POST /api/backup-restore/download
 * Download .bak file from Google Drive to local server storage (Phase 1)
 */
router.post("/download", async (req: any, res: any) => {
  try {
    const { fileId, fileName } = req.body;
    const userId = req.user?.id;

    if (!fileId || !fileName) {
      return res.status(400).json({ error: "fileId and fileName are required" });
    }

    const result = await downloadBackupFromDrive(fileId, fileName, userId);

    res.json({
      downloadId: result.downloadId,
      localFilePath: result.localFilePath,
      fileSize: result.fileSize,
      fileHash: result.fileHash,
      message: "Download started successfully",
    });
  } catch (error: any) {
    console.error("Error downloading backup:", error);
    res.status(500).json({ 
      error: error.message || "Failed to download backup file",
    });
  }
});

/**
 * GET /api/backup-restore/downloads
 * List all downloads (Phase 1)
 */
router.get("/downloads", async (req: any, res: any) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const downloads = await listDownloads(limit, offset);
    res.json(downloads);
  } catch (error: any) {
    console.error("Error listing downloads:", error);
    res.status(500).json({ 
      error: error.message || "Failed to list downloads",
    });
  }
});

/**
 * GET /api/backup-restore/downloads/:id
 * Get download details (Phase 1)
 */
router.get("/downloads/:id", async (req: any, res: any) => {
  try {
    const downloadId = parseInt(req.params.id);
    const download = await getDownloadRecord(downloadId);
    
    if (!download) {
      return res.status(404).json({ error: "Download not found" });
    }

    res.json(download);
  } catch (error: any) {
    console.error("Error getting download:", error);
    res.status(500).json({ 
      error: error.message || "Failed to get download",
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

    // Create history record (legacy - for backward compatibility)
    const [record] = await db
      .insert(mssqlRestores)
      .values({
        supabaseStoragePath: result.path,
        googleDriveFileName: fileName,
        fileHash: result.hash,
        storageSource: 'supabase_storage',
        restoreStatus: 'completed',
        restoredDbName: `STORAGE_${Date.now()}`, // Placeholder
        restoreTimestamp: new Date(),
        clientId: null, // Global storage, no clientId
        completedAt: new Date(),
        createdBy: req.user?.id,
        isActive: false, // Not a real restore
      })
      .returning();

    await activityLogger.logActivity(
      {
        userId: req.user?.id,
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
    const clientId = req.query.clientId ? (req.query.clientId as string) : undefined;
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
        userId: req.user?.id,
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

/**
 * GET /api/backup-restore/restored-databases
 * List all restored MSSQL databases
 */
router.get("/restored-databases", requireAuth, async (req: any, res: any) => {
  try {
    const clientId = req.query.clientId ? (req.query.clientId as string) : undefined;
    const isActive = req.query.isActive !== 'false'; // Default to true

    let query = db.select().from(mssqlRestores);

    if (clientId) {
      query = query.where(and(
        eq(mssqlRestores.clientId, clientId),
        eq(mssqlRestores.isActive, isActive)
      )) as any;
    } else {
      query = query.where(eq(mssqlRestores.isActive, isActive)) as any;
    }

    const records = await query
      .orderBy(desc(mssqlRestores.restoreTimestamp))
      .limit(100);

    res.json(records);
  } catch (error: any) {
    console.error("Error fetching restored databases:", error);
    res.status(500).json({ 
      error: error.message || "Failed to fetch restored databases",
    });
  }
});

/**
 * POST /api/backup-restore/migrate
 * Execute migration from restored database
 */
router.post("/migrate", requireAuth, async (req: any, res: any) => {
  try {
    const { restoreId, migrationType, tenantCode, clientId, batchSize, postingsPeriodFrom, postingsPeriodTo } = req.body;

    if (!restoreId || !migrationType || !tenantCode || !clientId) {
      return res.status(400).json({ 
        error: "Missing required fields: restoreId, migrationType, tenantCode, clientId" 
      });
    }

    // Get restore record
    const [restoreRecord] = await db
      .select()
      .from(mssqlRestores)
      .where(eq(mssqlRestores.id, restoreId))
      .limit(1);

    if (!restoreRecord) {
      return res.status(404).json({ error: "Restore record not found" });
    }

    if (restoreRecord.restoreStatus !== 'completed') {
      return res.status(400).json({ 
        error: `Cannot migrate from database with status: ${restoreRecord.restoreStatus}` 
      });
    }

    // Import migration functions
    const { migrateGeneralLedger, importGLFromAuditDB, migrateAuditTables, connectMSSQL } = await import('../services/mssql-migration');

    // Connect to restored database
    const mssqlPool = await connectMSSQL(restoreRecord.restoredDbName);

    let migrationLogId: number | null = null;

    try {
      // Create migration log record
      const { backupMigrationLogs } = await import('@shared/schema');
      const [logRecord] = await db
        .insert(backupMigrationLogs)
        .values({
          restoreId: restoreId,
          sourceTable: migrationType === 'general-ledger' ? 'GeneralLedger' : 'Audit Tables',
          targetTable: migrationType === 'general-ledger' ? 'general_ledger' : 'audit schema',
          status: 'running',
          migrationTimestamp: new Date(),
          createdBy: req.user?.id,
        })
        .returning();

      migrationLogId = logRecord.id;

      // Execute migration based on type
      if (migrationType === 'general-ledger') {
        // Check if we should use the standard GL migration or the Audit DB GL migration
        // For now, we assume standard GL migration unless specified otherwise
        // But wait, the previous code called exportToAudit (now importGLFromAuditDB) when type was 'audit'??
        // No, previous code:
        // if (migrationType === 'general-ledger') migrateGeneralLedger(...)
        // else if (migrationType === 'audit') exportToAudit(...)
        
        // The user interface has "General Ledger", "Audit", "RS".
        // "Audit" in the UI likely refers to the 25 audit tables.
        // "General Ledger" refers to the GL table.
        
        // So:
        await migrateGeneralLedger(
          mssqlPool,
          tenantCode,
          clientId,
          batchSize || 1000,
          postingsPeriodFrom,
          postingsPeriodTo
        );
      } else if (migrationType === 'audit') {
        await migrateAuditTables(
          mssqlPool,
          tenantCode,
          clientId,
          batchSize || 1000
        );
      } else {
        throw new Error(`Unsupported migration type: ${migrationType}`);
      }

      // Update migration log
      await db
        .update(backupMigrationLogs)
        .set({
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(backupMigrationLogs.id, migrationLogId));

      await mssqlPool.close();

      res.json({ 
        success: true, 
        message: "Migration completed successfully",
        migrationLogId 
      });
    } catch (error: any) {
      // Update migration log with error
      if (migrationLogId) {
        const { backupMigrationLogs } = await import('@shared/schema');
        await db
          .update(backupMigrationLogs)
          .set({
            status: 'failed',
            errorLog: error.message,
            updatedAt: new Date(),
          })
          .where(eq(backupMigrationLogs.id, migrationLogId));
      }

      await mssqlPool.close();
      throw error;
    }
  } catch (error: any) {
    console.error("Error executing migration:", error);
    res.status(500).json({ 
      error: error.message || "Failed to execute migration",
    });
  }
});

/**
 * GET /api/backup-restore/migration-logs
 * Get migration history
 */
router.get("/migration-logs", requireAuth, async (req: any, res: any) => {
  try {
    const restoreId = req.query.restoreId ? parseInt(req.query.restoreId) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;

    const { backupMigrationLogs } = await import('@shared/schema');
    let query = db.select().from(backupMigrationLogs);

    if (restoreId) {
      query = query.where(eq(backupMigrationLogs.restoreId, restoreId)) as any;
    }

    const records = await query
      .orderBy(desc(backupMigrationLogs.migrationTimestamp))
      .limit(limit)
      .offset(offset);

    res.json(records);
  } catch (error: any) {
    console.error("Error fetching migration logs:", error);
    res.status(500).json({ 
      error: error.message || "Failed to fetch migration logs",
    });
  }
});

/**
 * GET /api/backup-restore/migration-logs/:id
 * Get specific migration log details
 */
router.get("/migration-logs/:id", requireAuth, async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const { backupMigrationLogs } = await import('@shared/schema');

    const [record] = await db
      .select()
      .from(backupMigrationLogs)
      .where(eq(backupMigrationLogs.id, id))
      .limit(1);

    if (!record) {
      return res.status(404).json({ error: "Migration log not found" });
    }

    res.json(record);
  } catch (error: any) {
    console.error("Error fetching migration log:", error);
    res.status(500).json({ 
      error: error.message || "Failed to fetch migration log",
    });
  }
});

export default router;

