#!/usr/bin/env tsx

/**
 * Reset database: Drop all tables and schemas
 * This deletes all tables without recreating them.
 * Use db:migrate to recreate tables after reset.
 */

// Explicitly load .env file BEFORE importing db.ts
// This ensures DATABASE_URL is available when db.ts initializes
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
const envPath = resolve(process.cwd(), '.env');
const result = config({ path: envPath });
if (result.error && !process.env.DATABASE_URL) {
  console.warn(`⚠️  Could not load .env from ${envPath}: ${result.error.message}`);
} else if (process.env.DATABASE_URL) {
  const urlParts = process.env.DATABASE_URL.split('@');
  const dbInfo = urlParts.length > 1 ? `@${urlParts[1]}` : 'database';
  console.log(`📝 Loaded DATABASE_URL from .env: ${dbInfo}`);
}

// Now import db - it will use the DATABASE_URL we just loaded
import { pool } from "../server/db";

async function resetDatabase() {
  const client = await pool.connect();
  
  try {
    console.log("\n🔄 Resetting database (deleting all tables)...\n");

    // Step 0: Drop migration tracking tables first (if they exist)
    console.log("🗑️  Dropping migration tracking tables...\n");
    try {
      // Drop the migration manager's tracking table
      await client.query(`DROP TABLE IF EXISTS "_migrations" CASCADE`);
      console.log(`  ✅ Dropped migration tracking table (_migrations)`);
      
      // Drop the migration_history table (from 009_migration_tracking.sql)
      await client.query(`DROP TABLE IF EXISTS migration_history CASCADE`);
      console.log(`  ✅ Dropped migration history table`);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.log(`  ⚠️  Warning dropping migration tables: ${errorMsg.substring(0, 80)}`);
    }

    // Step 1: Drop all schemas (CASCADE handles all tables and indexes)
    console.log("\n🗑️  Dropping all schemas...\n");
    
    const schemas = ["audit", "rs", "accounting", "public"];
    
    for (const schema of schemas) {
      try {
        if (schema === "public") {
          // For public schema, drop all tables but recreate the empty schema
          await client.query(`DROP SCHEMA IF EXISTS public CASCADE`);
          await client.query(`CREATE SCHEMA public`);
          await client.query(`GRANT ALL ON SCHEMA public TO PUBLIC`);
          console.log(`  ✅ Dropped all tables in schema: ${schema}`);
        } else {
          await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
          console.log(`  ✅ Dropped schema: ${schema}`);
        }
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        console.log(`  ⚠️  Warning dropping ${schema}: ${errorMsg.substring(0, 80)}`);
      }
    }

    console.log("\n✅ All tables and schemas deleted\n");

    // Step 2: Verify tables are gone
    console.log("🔍 Verifying deletion...\n");
    
    // Check schemas
    const schemasResult = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name IN ('public', 'audit', 'rs', 'accounting')
      ORDER BY schema_name
    `);

    const remainingSchemas = schemasResult.rows.map((row: any) => row.schema_name);
    
    if (remainingSchemas.length === 0 || (remainingSchemas.length === 1 && remainingSchemas[0] === 'public')) {
      console.log(`✅ All tables deleted. Only empty schemas remain: ${remainingSchemas.join(", ") || "public"}\n`);
    } else {
      console.log(`⚠️  Remaining schemas: ${remainingSchemas.join(", ")}\n`);
    }

    // Check tables in public schema
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const remainingTables = tablesResult.rows.map((row: any) => row.table_name);
    
    if (remainingTables.length === 0) {
      console.log("✅ All tables deleted successfully\n");
    } else {
      console.log(`⚠️  ${remainingTables.length} table(s) still exist in public schema: ${remainingTables.join(", ")}\n`);
    }

    console.log("✨ Database reset complete! Run 'npm run db:migrate' to recreate tables.\n");

  } catch (error: any) {
    const errorMsg = error?.message || String(error) || "Unknown error";
    console.error("\n❌ Error resetting database:", errorMsg);
    throw error; // Re-throw so caller can handle it
  } finally {
    // Always release the client back to the pool
    client.release();
  }
  // Note: Don't close the pool here - it may be needed by subsequent operations
}

// Only run if called directly (not imported)
// Use a more reliable check for direct execution
const isDirectExecution = process.argv[1] && (
  import.meta.url.includes(process.argv[1].replace(/\\/g, '/')) ||
  require.main === module
);

if (isDirectExecution) {
  resetDatabase()
    .then(() => {
      // Close pool only when run directly
      pool.end().catch(() => {});
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed:", error);
      pool.end().catch(() => {});
      process.exit(1);
    });
}

export { resetDatabase };
