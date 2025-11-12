#!/usr/bin/env tsx

/**
 * Reset database: Drop all tables and schemas
 * This deletes all tables without recreating them.
 * Use db:migrate to recreate tables after reset.
 */

import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

async function resetDatabase() {
  try {
    console.log("\n🔄 Resetting database (deleting all tables)...\n");

    // Step 1: Drop all schemas (CASCADE handles all tables and indexes)
    console.log("🗑️  Dropping all schemas...\n");
    
    const schemas = ["audit", "rs", "public"];
    
    for (const schema of schemas) {
      try {
        if (schema === "public") {
          // For public schema, drop all tables but recreate the empty schema
          await db.execute(sql.raw(`DROP SCHEMA IF EXISTS public CASCADE`));
          await db.execute(sql.raw(`CREATE SCHEMA public`));
          console.log(`  ✅ Dropped all tables in schema: ${schema}`);
        } else {
          await db.execute(sql.raw(`DROP SCHEMA IF EXISTS ${schema} CASCADE`));
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
    const schemasCheck = await db.execute(sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name IN ('public', 'audit', 'rs')
      ORDER BY schema_name
    `);

    const remainingSchemas = (schemasCheck.rows as any[]).map(row => row.schema_name);
    
    if (remainingSchemas.length === 0 || (remainingSchemas.length === 1 && remainingSchemas[0] === 'public')) {
      console.log(`✅ All tables deleted. Only empty schemas remain: ${remainingSchemas.join(", ") || "public"}\n`);
    } else {
      console.log(`⚠️  Remaining schemas: ${remainingSchemas.join(", ")}\n`);
    }

    // Check tables in public schema
    const tablesCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    const remainingTables = (tablesCheck.rows as any[]).map(row => row.table_name);
    
    if (remainingTables.length === 0) {
      console.log("✅ All tables deleted successfully\n");
    } else {
      console.log(`⚠️  ${remainingTables.length} table(s) still exist in public schema: ${remainingTables.join(", ")}\n`);
    }

    console.log("✨ Database reset complete! Run 'npm run db:migrate' to recreate tables.\n");

  } catch (error: any) {
    const errorMsg = error?.message || String(error) || "Unknown error";
    console.error("\n❌ Error resetting database:", errorMsg);
    process.exit(1);
  } finally {
    // Close the database connection pool
    try {
      await pool.end();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Run the function immediately
resetDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });

export { resetDatabase };
