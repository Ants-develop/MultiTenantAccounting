// MSSQL Import API Routes
import express from "express";
import { requireAuth } from "../middleware/auth";
import {
  connectMSSQL,
  getTenantCodes,
  migrateGeneralLedger,
  exportToAudit,
  migrateRSTables,
  migrateAuditTables,
  migrateAuditSchemaTable,
  updateJournalEntries,
  getProgressEmitter,
  getAuditTableNames,
  MigrationProgress,
} from "../services/mssql-migration";
import { db } from "../db";
import { DEFAULT_CLIENT_ID } from "../constants";
import { migrationHistory, migrationLogs, migrationErrors } from "@shared/schema";
import { sql as drizzleSql, desc, and, eq } from "drizzle-orm";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Shared state for active migration/update
let activeMigration: MigrationProgress | null = null;
let mssqlPool: any = null;

/**
 * Initialize MSSQL connection
 */
async function initMSSQLPool() {
  console.log('\n🔄 initMSSQLPool called');
  console.log('   Current pool state:', mssqlPool ? 'EXISTS' : 'NULL');
  console.log('   Pool connected:', mssqlPool?.connected || 'N/A');
  
  try {
    if (!mssqlPool) {
      console.log('   Creating new MSSQL pool...');
      mssqlPool = await connectMSSQL();
      console.log("   ✅ MSSQL pool initialized successfully");
    } else {
      console.log('   ✅ Using existing MSSQL pool');
    }
    return mssqlPool;
  } catch (error: any) {
    console.error("\n❌ Failed to initialize MSSQL pool");
    console.error("   Error:", error.message);
    console.error("   Stack:", error.stack);
    throw error;
  }
}

// Get available tenant codes from MSSQL
router.get("/tenant-codes", async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("📍 GET /api/mssql/tenant-codes - Request received");
  console.log("   Session User ID:", req.session?.userId);
  console.log("=".repeat(60));

  try {
    console.log("\n1️⃣ Initializing MSSQL pool...");
    const pool = await initMSSQLPool();
    
    // Get optional date filters and client company tenant codes from query parameters
    const postingsPeriodFrom = req.query.postingsPeriodFrom as string | undefined;
    const postingsPeriodTo = req.query.postingsPeriodTo as string | undefined;
    const tenantCodesFilter = req.query.tenantCodes as string | undefined;
    
    console.log("\n2️⃣ Fetching tenant codes with names and counts...");
    console.log("   Date filters:", { postingsPeriodFrom, postingsPeriodTo });
    console.log("   Client company tenant codes filter:", tenantCodesFilter);
    
    // Only use client company tenant codes - do NOT use main company tenant code
    if (!tenantCodesFilter) {
      console.log("   ⚠️  No client company tenant codes provided");
      return res.json({ tenantCodes: [] });
    }
    
    const tenants = await getTenantCodes(pool, postingsPeriodFrom, postingsPeriodTo, tenantCodesFilter);

    console.log("\n3️⃣ Formatting response...");
    // No need to filter again - getTenantCodes already filtered by tenant codes if provided
    const response = {
      tenantCodes: tenants.map((tenant) => ({
        tenantCode: tenant.tenantCode,
        tenantName: tenant.tenantName,
        recordCount: tenant.recordCount,
      })),
    };
    
    console.log(`   ✅ Returning ${response.tenantCodes.length} matching tenant(s)`);
    response.tenantCodes.forEach((t: any) => {
      console.log(`      - Code: ${t.tenantCode}, Name: "${t.tenantName}", Records: ${t.recordCount}`);
    });
    console.log("=".repeat(60) + "\n");
    
    res.json(response);
  } catch (error: any) {
    console.error("\n❌ Get tenant codes error");
    console.error("   Error Type:", error.constructor.name);
    console.error("   Error Message:", error.message);
    console.error("   Error Code:", error.code);
    console.error("   Stack:", error.stack);
    console.error("=".repeat(60) + "\n");
    
    res.status(500).json({
      message: "Failed to fetch tenant codes",
      error: error.message,
      code: error.code,
    });
  }
});

// Shared handler function for unified migration endpoint
async function handleStartMigration(req: express.Request, res: express.Response, defaultType?: string) {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: "No company selected" });
    }

    const { 
      type = defaultType, 
      tenantCode, 
      clientId, 
      batchSize, 
      postingsPeriodFrom, 
      postingsPeriodTo,
      tableName,
      companyTin
    } = req.body;

    // Validate type parameter
    const validTypes = ['general-ledger', 'audit', 'update', 'rs', 'audit-table', 'full-audit-export'];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ 
        message: `Invalid migration type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Check if migration is already running
    if (activeMigration && activeMigration.status === "running") {
      return res.status(400).json({ message: "Migration is already running" });
    }

    // Validate required parameters based on type
    if ((type === 'general-ledger' || type === 'audit' || type === 'update') && (!tenantCode || !clientId)) {
      return res.status(400).json({ message: "Missing required parameters: tenantCode and clientId" });
    }

    if (type === 'rs' && (!tableName || !clientId || !companyTin)) {
      return res.status(400).json({ message: "Missing required parameters: tableName, clientId, and companyTin" });
    }

    if (type === 'audit-table' && !tableName) {
      return res.status(400).json({ message: "Missing required parameter: tableName" });
    }

    const pool = await initMSSQLPool();
    const migrationId = `${type}_${Date.now()}`;

    // Create initial progress object and set activeMigration IMMEDIATELY
    const initialProgress: MigrationProgress = {
      migrationId,
      type: type as 'general-ledger' | 'audit' | 'rs',
      tenantCode: type === 'rs' || type === 'audit-table' || type === 'full-audit-export' ? null : (tenantCode || null),
      tableName: (type === 'rs' || type === 'audit-table' || type === 'full-audit-export') ? tableName : undefined,
      status: 'running',
      totalRecords: 0,
      processedRecords: 0,
      successCount: 0,
      errorCount: 0,
      progress: 0,
      startTime: new Date(),
      batchSize: batchSize || 1000,
      logs: [],
      errors: [],
    };

    // Set activeMigration immediately
    activeMigration = initialProgress;

    // Send response immediately
    res.json({
      success: true,
      message: getMigrationMessage(type, tenantCode, tableName),
      migrationId,
      totalRecords: 0,
      estimatedTime: "Calculating...",
    });

    // Start migration in background
    (async () => {
      try {
        const progressEmitter = getProgressEmitter();

        progressEmitter.on("progress", (progress: MigrationProgress) => {
          // Update existing activeMigration instead of replacing it
          if (activeMigration && activeMigration.migrationId === progress.migrationId) {
            Object.assign(activeMigration, progress);
          } else {
            activeMigration = progress;
          }
          console.log(
            `[Migration ${migrationId}] Progress: ${progress.progress.toFixed(1)}% (${progress.processedRecords}/${progress.totalRecords})`
          );
        });

        // Route to appropriate migration function based on type
        switch (type) {
          case 'general-ledger':
            await migrateGeneralLedger(
              pool,
              tenantCode!,
              clientId!,
              batchSize || 1000,
              postingsPeriodFrom,
              postingsPeriodTo
            );
            break;

          case 'audit':
            await exportToAudit(
              pool,
              tenantCode!,
              clientId!,
              batchSize || 1000
            );
            break;

          case 'update':
            await updateJournalEntries(
              pool,
              tenantCode!,
              clientId!,
              batchSize || 1000,
              postingsPeriodFrom,
              postingsPeriodTo
            );
            break;

          case 'rs':
            await migrateRSTables(
              pool,
              tableName!,
              clientId!,
              companyTin!,
              batchSize || 1000
            );
            break;

          case 'audit-table':
            await migrateAuditSchemaTable(
              pool,
              tableName!,
              DEFAULT_CLIENT_ID!,
              batchSize || 1000
            );
            break;

          case 'full-audit-export':
            // Get all audit tables and process them sequentially
            const tables = await getAuditTableNames(pool);
            const totalTables = tables.length;
            
            for (let i = 0; i < tables.length; i++) {
              const table = tables[i];
              console.log(`\n📋 Processing audit table ${i + 1}/${totalTables}: ${table.tableName}`);
              
              // Update activeMigration with current table info
              if (activeMigration) {
                activeMigration.tableName = table.tableName;
                activeMigration.totalRecords = table.recordCount;
                activeMigration.processedRecords = 0;
                activeMigration.progress = 0;
              }

              await migrateAuditSchemaTable(
                pool,
                table.tableName,
                DEFAULT_CLIENT_ID!,
                batchSize || 1000
              );
            }
            break;

          default:
            throw new Error(`Unknown migration type: ${type}`);
        }

        console.log(
          `✅ Migration ${migrationId} completed: ${activeMigration?.successCount} success, ${activeMigration?.errorCount} errors`
        );

        // Keep status for 5 minutes
        setTimeout(() => {
          if (activeMigration?.migrationId === migrationId) {
            activeMigration = null;
          }
        }, 300000);
      } catch (error) {
        console.error("❌ Background migration error:", error);
        if (activeMigration) {
          activeMigration.status = "failed";
          activeMigration.errorMessage = String(error);
          activeMigration.endTime = new Date();
        }
      }
    })();
  } catch (error) {
    console.error("❌ Start migration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Unified migration endpoint - handles all migration types
router.post("/start-migration", async (req, res) => {
  return handleStartMigration(req, res);
});

// Helper function to get migration message
function getMigrationMessage(type: string, tenantCode?: number, tableName?: string): string {
  switch (type) {
    case 'general-ledger':
      return `Migration started for tenant ${tenantCode}`;
    case 'audit':
      return `Audit export started for tenant ${tenantCode}`;
    case 'update':
      return `Update started for tenant ${tenantCode}`;
    case 'rs':
      return `RS migration started for table ${tableName}`;
    case 'audit-table':
      return `Audit table migration started for ${tableName}`;
    case 'full-audit-export':
      return `Full audit export started`;
    default:
      return `Migration started`;
  }
}

// Get migration status
router.get("/migration-status", async (req, res) => {
  try {
    res.json(activeMigration);
  } catch (error) {
    console.error("❌ Get migration status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get historical migrations from database
router.get("/migration-history", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;

    let query = db.select().from(migrationHistory).orderBy(desc(migrationHistory.startTime)).limit(limit).offset(offset);

    // Build WHERE conditions
    const conditions: any[] = [];
    if (type) {
      conditions.push(eq(migrationHistory.type, type));
    }
    if (status) {
      conditions.push(eq(migrationHistory.status, status));
    }

    const histories = conditions.length > 0
      ? await db.select().from(migrationHistory)
          .where(and(...conditions))
          .orderBy(desc(migrationHistory.startTime))
          .limit(limit)
          .offset(offset)
      : await db.select().from(migrationHistory)
          .orderBy(desc(migrationHistory.startTime))
          .limit(limit)
          .offset(offset);

    // Fetch logs and errors for each migration
    const migrationsWithDetails = await Promise.all(
      histories.map(async (history) => {
        const [logs, errors] = await Promise.all([
          db.select().from(migrationLogs)
            .where(eq(migrationLogs.migrationId, history.migrationId))
            .orderBy(migrationLogs.timestamp),
          db.select().from(migrationErrors)
            .where(eq(migrationErrors.migrationId, history.migrationId))
            .orderBy(migrationErrors.timestamp),
        ]);

        return {
          ...history,
          logs: logs.map(log => ({
            timestamp: log.timestamp,
            level: log.level,
            message: log.message,
            context: log.context,
          })),
          errors: errors.map(err => ({
            timestamp: err.timestamp,
            message: err.message,
            recordId: err.recordId,
            recordData: err.recordData,
            stack: err.stack,
          })),
        };
      })
    );

    res.json({ migrations: migrationsWithDetails, total: histories.length });
  } catch (error: any) {
    console.error("Failed to fetch migration history:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific migration by ID with logs and errors
router.get("/migration-history/:migrationId", async (req, res) => {
  try {
    const { migrationId } = req.params;

    const [history] = await db.select().from(migrationHistory)
      .where(eq(migrationHistory.migrationId, migrationId))
      .limit(1);

    if (!history) {
      return res.status(404).json({ error: "Migration not found" });
    }

    const [logs, errors] = await Promise.all([
      db.select().from(migrationLogs)
        .where(eq(migrationLogs.migrationId, migrationId))
        .orderBy(migrationLogs.timestamp),
      db.select().from(migrationErrors)
        .where(eq(migrationErrors.migrationId, migrationId))
        .orderBy(migrationErrors.timestamp),
    ]);

    res.json({
      ...history,
      logs: logs.map(log => ({
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        context: log.context,
      })),
      errors: errors.map(err => ({
        timestamp: err.timestamp,
        message: err.message,
        recordId: err.recordId,
        recordData: err.recordData,
        stack: err.stack,
      })),
    });
  } catch (error: any) {
    console.error("Failed to fetch migration details:", error);
    res.status(500).json({ error: error.message });
  }
});

// Stop migration
router.post("/stop-migration", async (req, res) => {
  try {
    if (!activeMigration) {
      return res
        .status(400)
        .json({
          success: false,
          message: "No active migration to stop",
        });
    }

    activeMigration.status = "stopped";
    activeMigration.endTime = new Date();

    res.json({
      success: true,
      message: "Migration stopped successfully",
    });
  } catch (error) {
    console.error("❌ Stop migration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
