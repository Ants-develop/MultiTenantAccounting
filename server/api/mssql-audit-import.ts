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
import { DEFAULT_CLIENT_ID } from "../constants";

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

