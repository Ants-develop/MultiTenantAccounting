// MSSQL Audit Schema Import API Routes
import express from "express";
import { requireAuth } from "../middleware/auth";
import {
  connectMSSQL,
  getAuditTableNames,
  migrateAuditSchemaTable,
  getProgressEmitter,
  MigrationProgress,
} from "../services/mssql-migration";
import { db } from "../db";
import { companies } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);
// Note: In single-company mode, we use a default clientId of 1
const DEFAULT_CLIENT_ID = parseInt(process.env.DEFAULT_CLIENT_ID || '1');

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

/**
 * Get available audit tables from MSSQL audit schema
 */
router.get("/audit-tables", async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("📍 GET /api/mssql-audit/audit-tables - Request received");
  console.log("   Session User ID:", req.session?.userId);
  console.log("=".repeat(60));

  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: "No company selected" });
    }

    console.log("\n1️⃣ Fetching current company details...");
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, DEFAULT_CLIENT_ID))
      .limit(1);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    console.log(`   Company: ${company.name} (ID: ${company.id})`);

    console.log("\n2️⃣ Initializing MSSQL pool...");
    const pool = await initMSSQLPool();
    
    console.log("\n3️⃣ Fetching available audit tables...");
    const tables = await getAuditTableNames(pool);

    console.log("\n4️⃣ Formatting response...");
    const response = {
      auditTables: tables.map((table) => ({
        tableName: table.tableName,
        recordCount: table.recordCount,
      })),
    };
    
    console.log(`   ✅ Returning ${response.auditTables.length} audit table(s)`);
    response.auditTables.forEach((t: any) => {
      console.log(`      - Table: ${t.tableName}, Records: ${t.recordCount}`);
    });
    console.log("=".repeat(60) + "\n");
    
    res.json(response);
  } catch (error: any) {
    console.error("\n❌ Get audit tables error");
    console.error("   Error Type:", error.constructor.name);
    console.error("   Error Message:", error.message);
    console.error("   Error Code:", error.code);
    console.error("   Stack:", error.stack);
    console.error("=".repeat(60) + "\n");
    
    res.status(500).json({
      message: "Failed to fetch audit tables",
      error: error.message,
      code: error.code,
    });
  }
});

/**
 * Start audit table migration
 */
router.post("/start-audit-table-migration", async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("📍 POST /api/mssql-audit/start-audit-table-migration");
  console.log("   Body:", req.body);
  console.log("=".repeat(60));

  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: "No company selected" });
    }

    const { tableName, batchSize } = req.body;

    if (!tableName) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Check if migration is already running
    if (activeMigration && activeMigration.status === "running") {
      return res
        .status(400)
        .json({ message: "Migration is already running" });
    }

    const pool = await initMSSQLPool();
    const migrationId = `audit_table_${Date.now()}`;

    console.log(`\n📊 Starting audit table migration: ${tableName}`);
    console.log(`   Migration ID: ${migrationId}`);
    console.log(`   Batch Size: ${batchSize || 1000}`);

    res.json({
      success: true,
      message: `Audit table migration started for ${tableName}`,
      migrationId,
      totalRecords: 0,
      estimatedTime: "Calculating...",
    });

    // Start migration in background
    (async () => {
      try {
        const progressEmitter = getProgressEmitter();

        progressEmitter.on("progress", (progress: MigrationProgress) => {
          activeMigration = progress;
          console.log(
            `[Audit Migration ${migrationId}] Progress: ${progress.progress.toFixed(1)}% (${progress.processedRecords}/${progress.totalRecords})`
          );
        });

        await migrateAuditSchemaTable(
          pool,
          tableName,
          DEFAULT_CLIENT_ID,
          batchSize || 1000
        );
        
        console.log(
          `✅ Audit migration ${migrationId} completed: ${activeMigration?.successCount} success, ${activeMigration?.errorCount} errors`
        );

        // Keep status for 5 minutes
        setTimeout(() => {
          if (activeMigration?.migrationId === migrationId) {
            activeMigration = null;
          }
        }, 300000);
      } catch (error) {
        console.error("❌ Background audit migration error:", error);
        if (activeMigration) {
          activeMigration.status = "failed";
          activeMigration.errorMessage = String(error);
          activeMigration.endTime = new Date();
        }
      }
    })();
  } catch (error) {
    console.error("❌ Start audit migration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Start audit schema export (all tables)
 */
router.post("/start-full-audit-export", async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("📍 POST /api/mssql-audit/start-full-audit-export");
  console.log("=".repeat(60));

  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: "No company selected" });
    }

    const { batchSize } = req.body;

    // Check if migration is already running
    if (activeMigration && activeMigration.status === "running") {
      return res
        .status(400)
        .json({ message: "Export is already running" });
    }

    const pool = await initMSSQLPool();
    const migrationId = `full_audit_${Date.now()}`;

    console.log(`\n📊 Starting full audit schema export`);
    console.log(`   Migration ID: ${migrationId}`);

    // Get all audit tables
    const tables = await getAuditTableNames(pool);
    const totalTables = tables.length;

    res.json({
      success: true,
      message: `Full audit export started for ${totalTables} tables`,
      migrationId,
      totalTables,
      tablesCompleted: 0,
      estimatedTime: "Calculating...",
    });

    // Start export in background
    (async () => {
      try {
        let tablesCompleted = 0;
        
        for (const table of tables) {
          console.log(`\n📋 Processing audit table: ${table.tableName}`);
          
          try {
            const progressEmitter = getProgressEmitter();

            progressEmitter.on("progress", (progress: MigrationProgress) => {
              activeMigration = {
                ...progress,
                migrationId,
              };
              console.log(
                `[Audit Export ${migrationId}] Table: ${table.tableName} - Progress: ${progress.progress.toFixed(1)}%`
              );
            });

            await migrateAuditSchemaTable(
              pool,
              table.tableName,
              DEFAULT_CLIENT_ID!,
              batchSize || 1000
            );

            tablesCompleted++;
            console.log(
              `✅ Completed table ${tablesCompleted}/${totalTables}: ${table.tableName}`
            );
          } catch (error) {
            console.error(`❌ Error processing table ${table.tableName}:`, error);
          }
        }

        console.log(
          `✅ Full audit export ${migrationId} completed: ${tablesCompleted}/${totalTables} tables`
        );

        // Keep status for 5 minutes
        setTimeout(() => {
          if (activeMigration?.migrationId === migrationId) {
            activeMigration = null;
          }
        }, 300000);
      } catch (error) {
        console.error("❌ Background full audit export error:", error);
        if (activeMigration) {
          activeMigration.status = "failed";
          activeMigration.errorMessage = String(error);
          activeMigration.endTime = new Date();
        }
      }
    })();
  } catch (error) {
    console.error("❌ Start full audit export error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Get migration status
 */
router.get("/migration-status", async (req, res) => {
  try {
    res.json(activeMigration);
  } catch (error) {
    console.error("❌ Get migration status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Stop migration
 */
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

