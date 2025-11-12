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
  updateJournalEntries,
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

// Get available tenant codes from MSSQL
router.get("/tenant-codes", async (req, res) => {
  console.log("\n" + "=".repeat(60));
  console.log("📍 GET /api/mssql/tenant-codes - Request received");
  console.log("   Session User ID:", req.session?.userId);
  console.log("   Current Company ID:", req.session?.currentCompanyId);
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
    console.log(`   Company Tenant Code: ${company.tenantCode || "NOT SET"}`);

    if (!company.tenantCode) {
      console.log("   ⚠️  Company has no tenant code assigned");
      return res.json({ tenantCodes: [] });
    }

    console.log("\n2️⃣ Initializing MSSQL pool...");
    const pool = await initMSSQLPool();
    
    console.log("\n3️⃣ Fetching tenant codes with names and counts...");
    const tenants = await getTenantCodes(pool);

    console.log("\n4️⃣ Filtering tenant codes to match company tenant code...");
    const filteredTenants = tenants.filter(
      (tenant) => tenant.tenantCode === company.tenantCode
    );

    console.log("\n5️⃣ Formatting response...");
    const response = {
      tenantCodes: filteredTenants.map((tenant) => ({
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

// Start journal entries update (incremental sync)
router.post("/start-update", async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: "No company selected" });
    }

    const { tenantCode, clientId, batchSize } = req.body;

    if (!tenantCode || !clientId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Check if migration is already running
    if (activeMigration && activeMigration.status === "running") {
      return res
        .status(400)
        .json({ message: "Update is already running" });
    }

    const pool = await initMSSQLPool();

    const migrationId = `update_${Date.now()}`;

    res.json({
      success: true,
      message: `Update started for tenant ${tenantCode}`,
      migrationId,
      totalRecords: 0,
      estimatedTime: "Calculating...",
    });

    // Start update in background
    (async () => {
      try {
        const progressEmitter = getProgressEmitter();

        progressEmitter.on("progress", (progress: MigrationProgress) => {
          activeMigration = progress;
          console.log(
            `[Update ${migrationId}] Progress: ${progress.progress.toFixed(1)}% (${progress.processedRecords}/${progress.totalRecords})`
          );
        });

        await updateJournalEntries(
          pool,
          tenantCode,
          clientId,
          batchSize || 1000
        );
        console.log(
          `✅ Update ${migrationId} completed: ${activeMigration?.successCount} success, ${activeMigration?.errorCount} errors`
        );

        // Keep status for 5 minutes
        setTimeout(() => {
          if (activeMigration?.migrationId === migrationId) {
            activeMigration = null;
          }
        }, 300000);
      } catch (error) {
        console.error("❌ Background update error:", error);
        if (activeMigration) {
          activeMigration.status = "failed";
          activeMigration.errorMessage = String(error);
          activeMigration.endTime = new Date();
        }
      }
    })();
  } catch (error) {
    console.error("❌ Start update error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Start general ledger migration
router.post("/start-migration", async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: "No company selected" });
    }

    const { tenantCode, clientId, batchSize } = req.body;

    if (!tenantCode || !clientId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // Check if migration is already running
    if (activeMigration && activeMigration.status === "running") {
      return res
        .status(400)
        .json({ message: "Migration is already running" });
    }

    const pool = await initMSSQLPool();

    const migrationId = `migration_${Date.now()}`;

    res.json({
      success: true,
      message: `Migration started for tenant ${tenantCode}`,
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
            `[Migration ${migrationId}] Progress: ${progress.progress.toFixed(1)}% (${progress.processedRecords}/${progress.totalRecords})`
          );
        });

        await migrateGeneralLedger(
          pool,
          tenantCode,
          clientId,
          batchSize || 1000
        );
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
});

// Start audit export
router.post("/start-audit-export", async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: "No company selected" });
    }

    const { tenantCode, clientId, batchSize } = req.body;

    if (!tenantCode || !clientId) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    if (activeMigration && activeMigration.status === "running") {
      return res
        .status(400)
        .json({ message: "Export is already running" });
    }

    const pool = await initMSSQLPool();
    const migrationId = `audit_${Date.now()}`;

    res.json({
      success: true,
      message: `Audit export started for tenant ${tenantCode}`,
      migrationId,
      totalRecords: 0,
    });

    // Start export in background
    (async () => {
      try {
        const progressEmitter = getProgressEmitter();

        progressEmitter.on("progress", (progress: MigrationProgress) => {
          activeMigration = progress;
          console.log(
            `[Audit Export ${migrationId}] Progress: ${progress.progress.toFixed(1)}%`
          );
        });

        await exportToAudit(pool, tenantCode, clientId, batchSize || 1000);
        console.log(
          `✅ Audit export ${migrationId} completed: ${activeMigration?.successCount} success, ${activeMigration?.errorCount} errors`
        );

        setTimeout(() => {
          if (activeMigration?.migrationId === migrationId) {
            activeMigration = null;
          }
        }, 300000);
      } catch (error) {
        console.error("❌ Background audit export error:", error);
        if (activeMigration) {
          activeMigration.status = "failed";
          activeMigration.errorMessage = String(error);
          activeMigration.endTime = new Date();
        }
      }
    })();
  } catch (error) {
    console.error("❌ Start audit export error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get migration status
router.get("/migration-status", async (req, res) => {
  try {
    res.json(activeMigration);
  } catch (error) {
    console.error("❌ Get migration status error:", error);
    res.status(500).json({ message: "Internal server error" });
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

// Start RS table migration
router.post("/start-rs-migration", async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: "No company selected" });
    }

    const { tableName, clientId, companyTin, batchSize } = req.body;

    if (!tableName || !clientId || !companyTin) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    if (activeMigration && activeMigration.status === "running") {
      return res
        .status(400)
        .json({ message: "Migration is already running" });
    }

    const pool = await initMSSQLPool();
    const migrationId = `rs_${Date.now()}`;

    res.json({
      success: true,
      message: `RS migration started for table ${tableName}`,
      migrationId,
      totalRecords: 0,
    });

    // Start migration in background
    (async () => {
      try {
        const progressEmitter = getProgressEmitter();

        progressEmitter.on("progress", (progress: MigrationProgress) => {
          activeMigration = progress;
          console.log(
            `[RS Migration ${migrationId}] Progress: ${progress.progress.toFixed(1)}%`
          );
        });

        await migrateRSTables(pool, tableName, clientId, companyTin, batchSize || 1000);
        console.log(
          `✅ RS migration ${migrationId} completed: ${activeMigration?.successCount} success, ${activeMigration?.errorCount} errors`
        );

        setTimeout(() => {
          if (activeMigration?.migrationId === migrationId) {
            activeMigration = null;
          }
        }, 300000);
      } catch (error) {
        console.error("❌ Background RS migration error:", error);
        if (activeMigration) {
          activeMigration.status = "failed";
          activeMigration.errorMessage = String(error);
          activeMigration.endTime = new Date();
        }
      }
    })();
  } catch (error) {
    console.error("❌ Start RS migration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Start audit table migration
router.post("/start-audit-table-migration", async (req, res) => {
  try {
    if (!DEFAULT_CLIENT_ID) {
      return res.status(400).json({ message: "No company selected" });
    }

    const { tableName, batchSize } = req.body;

    if (!tableName) {
      return res.status(400).json({ message: "Missing required parameters" });
    }

    if (activeMigration && activeMigration.status === "running") {
      return res
        .status(400)
        .json({ message: "Migration is already running" });
    }

    const pool = await initMSSQLPool();
    const migrationId = `audit_table_${Date.now()}`;

    res.json({
      success: true,
      message: `Audit table migration started for ${tableName}`,
      migrationId,
      totalRecords: 0,
    });

    // Start migration in background
    (async () => {
      try {
        const progressEmitter = getProgressEmitter();

        progressEmitter.on("progress", (progress: MigrationProgress) => {
          activeMigration = progress;
          console.log(
            `[Audit Migration ${migrationId}] Progress: ${progress.progress.toFixed(1)}%`
          );
        });

        await migrateAuditTables(pool, tableName, batchSize || 1000);
        console.log(
          `✅ Audit migration ${migrationId} completed: ${activeMigration?.successCount} success, ${activeMigration?.errorCount} errors`
        );

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

export default router;
