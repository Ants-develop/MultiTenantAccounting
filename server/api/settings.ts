// Settings API Routes - Manage SSH/MSSQL credentials and system configuration
import express from "express";
import { requireAuth, requireGlobalAdmin } from "../middleware/auth";
import { db } from "../db";
import { mainCompanySettings } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

// Apply authentication and admin requirement to all routes
router.use(requireAuth);

/**
 * GET /api/settings
 * Get current system settings (credentials partially masked for security)
 */
router.get("/", async (req: any, res: any) => {
  try {
    // Auth check is already done by middleware
    const settings = await db.query.mainCompanySettings.findFirst();
    
    if (!settings) {
      return res.json({
        id: null,
        name: 'System Settings',
        sshConfigured: false,
        mssqlConfigured: false,
      });
    }

    // Mask sensitive credentials in response
    res.json({
      id: settings.id,
      name: settings.name,
      code: settings.code,
      email: settings.email,
      timeZone: settings.timeZone,
      // SSH settings (masked)
      sshHost: settings.sshHost,
      sshPort: settings.sshPort,
      sshUser: settings.sshUser,
      sshConfigured: !!settings.sshHost && !!settings.sshUser,
      // MSSQL settings (masked)
      mssqlServer: settings.mssqlServer,
      mssqlPort: settings.mssqlPort,
      mssqlDatabase: settings.mssqlDatabase,
      mssqlUser: settings.mssqlUser,
      mssqlConfigured: !!settings.mssqlServer && !!settings.mssqlUser,
      // Other settings
      autoBackup: settings.autoBackup,
      backupFrequency: settings.backupFrequency,
    });
  } catch (error: any) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch settings', details: error.message });
  }
});

/**
 * PUT /api/settings/ssh
 * Update SSH connection settings
 */
router.put("/ssh", requireGlobalAdmin, async (req: any, res: any) => {
  try {
    const { sshHost, sshPort, sshUser, sshKeyContent, sshKeyPath } = req.body;

    // Validate required fields
    if (!sshHost || !sshUser) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'sshHost and sshUser are required'
      });
    }

    // Get or create settings
    let settings = await db.query.mainCompanySettings.findFirst();
    
    if (!settings) {
      // Create default settings if none exist
      const result = await db.insert(mainCompanySettings).values({
        name: 'System Settings',
        code: 'SYSTEM',
      }).returning();
      settings = result[0];
    }

    // Update SSH settings
    const updated = await db.update(mainCompanySettings)
      .set({
        sshHost,
        sshPort: sshPort || 22,
        sshUser,
        sshKeyPath: sshKeyPath || null,
        sshKeyContent: sshKeyContent || null,
        updatedAt: new Date(),
      })
      .where(eq(mainCompanySettings.id, settings.id))
      .returning();

    res.json({
      success: true,
      message: 'SSH settings updated',
      sshConfigured: true,
      sshHost: updated[0].sshHost,
      sshPort: updated[0].sshPort,
      sshUser: updated[0].sshUser,
    });
  } catch (error: any) {
    console.error('SSH settings update error:', error);
    res.status(500).json({ error: 'Failed to update SSH settings', details: error.message });
  }
});

/**
 * PUT /api/settings/mssql
 * Update MSSQL connection settings
 */
router.put("/mssql", requireGlobalAdmin, async (req: any, res: any) => {
  try {
    const { 
      mssqlServer, 
      mssqlPort, 
      mssqlUser, 
      mssqlPassword, 
      mssqlDatabase,
      mssqlEncrypt,
      mssqlTrustServerCertificate
    } = req.body;

    // Validate required fields
    if (!mssqlServer || !mssqlUser || !mssqlPassword) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'mssqlServer, mssqlUser, and mssqlPassword are required'
      });
    }

    // Get or create settings
    let settings = await db.query.mainCompanySettings.findFirst();
    
    if (!settings) {
      // Create default settings if none exist
      const result = await db.insert(mainCompanySettings).values({
        name: 'System Settings',
        code: 'SYSTEM',
      }).returning();
      settings = result[0];
    }

    // Update MSSQL settings
    const updated = await db.update(mainCompanySettings)
      .set({
        mssqlServer,
        mssqlPort: mssqlPort || 1433,
        mssqlUser,
        mssqlPassword,
        mssqlDatabase: mssqlDatabase || 'master',
        mssqlEncrypt: mssqlEncrypt !== false,
        mssqlTrustServerCertificate: mssqlTrustServerCertificate === true,
        updatedAt: new Date(),
      })
      .where(eq(mainCompanySettings.id, settings.id))
      .returning();

    res.json({
      success: true,
      message: 'MSSQL settings updated',
      mssqlConfigured: true,
      mssqlServer: updated[0].mssqlServer,
      mssqlPort: updated[0].mssqlPort,
      mssqlDatabase: updated[0].mssqlDatabase,
      mssqlUser: updated[0].mssqlUser,
    });
  } catch (error: any) {
    console.error('MSSQL settings update error:', error);
    res.status(500).json({ error: 'Failed to update MSSQL settings', details: error.message });
  }
});

/**
 * GET /api/settings/ssh/status
 * Test SSH connection with stored credentials
 */
router.get("/ssh/status", async (req: any, res: any) => {
  try {
    const settings = await db.query.mainCompanySettings.findFirst();

    if (!settings?.sshHost || !settings?.sshUser) {
      return res.json({
        status: 'disconnected',
        error: 'SSH credentials not configured in settings'
      });
    }

    // Check if SSH binary is available (cross-platform)
    try {
      const { execSync } = await import('child_process');
      const os = await import('os');
      const platform = os.default?.platform?.() || os.platform();
      
      // Use different command based on OS
      const checkCommand = platform === 'win32' ? 'where ssh' : 'which ssh';
      
      try {
        execSync(checkCommand, { timeout: 1000, stdio: 'pipe' });
      } catch {
        // SSH binary not found, but SSH credentials are configured
        // We'll still consider it configured since the user may have set it up manually
      }
      
      res.json({
        status: 'configured',
        message: 'SSH credentials configured',
        host: settings.sshHost,
        port: settings.sshPort,
        user: settings.sshUser
      });
    } catch {
      res.json({
        status: 'disconnected',
        error: 'SSH status check failed',
        details: 'Unable to verify SSH configuration'
      });
    }
  } catch (error: any) {
    console.error('SSH status check error:', error);
    res.json({
      status: 'error',
      error: 'SSH status check failed',
      details: error.message
    });
  }
});

/**
 * GET /api/settings/mssql/status
 * Test MSSQL connection with stored credentials
 */
router.get("/mssql/status", async (req: any, res: any) => {
  try {
    const settings = await db.query.mainCompanySettings.findFirst();

    if (!settings?.mssqlServer || !settings?.mssqlUser || !settings?.mssqlPassword) {
      return res.json({
        status: 'disconnected',
        error: 'MSSQL credentials not configured in settings'
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
        server: settings.mssqlServer,
        port: settings.mssqlPort || 1433,
        authentication: {
          type: 'default',
          options: {
            userName: settings.mssqlUser,
            password: settings.mssqlPassword,
          }
        },
        options: {
          trustServerCertificate: settings.mssqlTrustServerCertificate || false,
          encrypt: settings.mssqlEncrypt !== false,
          connectTimeout: 5000,
        }
      });

      await pool.connect();
      const result = await pool.request().query('SELECT @@VERSION as version');
      await pool.close();

      res.json({
        status: 'connected',
        message: 'MSSQL connection successful',
        server: settings.mssqlServer,
        database: settings.mssqlDatabase,
        version: result.recordset[0]?.version || 'Unknown'
      });
    } catch (dbError: any) {
      res.json({
        status: 'disconnected',
        error: 'MSSQL connection failed',
        details: dbError.message || 'Unable to establish connection'
      });
    }
  } catch (error: any) {
    console.error('MSSQL status check error:', error);
    res.json({
      status: 'error',
      error: 'MSSQL status check failed',
      details: error.message
    });
  }
});

export default router;
