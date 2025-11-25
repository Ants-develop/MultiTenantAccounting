#!/usr/bin/env tsx

/**
 * Reset database to zero: Drop ALL schemas, tables, functions, triggers, sequences, views, and data
 * This completely wipes the database - everything is deleted and reset to an empty state.
 * Only an empty public schema remains after reset.
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
    console.log("\n🔄 Resetting database to zero (deleting ALL schemas, tables, functions, triggers, sequences, views, and data)...\n");

    // Step 0: Drop all tables explicitly in public schema first (to avoid dependency issues)
    console.log("🗑️  Dropping all tables in public schema...\n");
    try {
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);
      
      for (const row of tablesResult.rows) {
        try {
          await client.query(`DROP TABLE IF EXISTS public."${row.table_name}" CASCADE`);
          console.log(`  ✅ Dropped table: public.${row.table_name}`);
        } catch (error: any) {
          // Ignore individual table errors
        }
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.log(`  ⚠️  Warning dropping tables: ${errorMsg.substring(0, 80)}`);
    }

    // Step 1: Drop all sequences
    console.log("\n🗑️  Dropping all sequences...\n");
    try {
      const sequencesResult = await client.query(`
        SELECT sequence_schema, sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema IN ('public', 'accounting', 'audit', 'bank', 'rs', 'tasks', 'crm', 'email')
      `);
      
      for (const row of sequencesResult.rows) {
        try {
          await client.query(`DROP SEQUENCE IF EXISTS "${row.sequence_schema}"."${row.sequence_name}" CASCADE`);
          console.log(`  ✅ Dropped sequence: ${row.sequence_schema}.${row.sequence_name}`);
        } catch (error: any) {
          // Ignore individual sequence errors
        }
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.log(`  ⚠️  Warning dropping sequences: ${errorMsg.substring(0, 80)}`);
    }

    // Step 2: Drop all views
    console.log("\n🗑️  Dropping all views...\n");
    try {
      const viewsResult = await client.query(`
        SELECT table_schema, table_name
        FROM information_schema.views
        WHERE table_schema IN ('public', 'accounting', 'audit', 'bank', 'rs', 'tasks', 'crm', 'email')
      `);
      
      for (const row of viewsResult.rows) {
        try {
          await client.query(`DROP VIEW IF EXISTS "${row.table_schema}"."${row.table_name}" CASCADE`);
          console.log(`  ✅ Dropped view: ${row.table_schema}.${row.table_name}`);
        } catch (error: any) {
          // Ignore individual view errors
        }
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.log(`  ⚠️  Warning dropping views: ${errorMsg.substring(0, 80)}`);
    }

    // Step 3: Drop all functions that might have cross-schema dependencies
    console.log("\n🗑️  Dropping all functions...\n");
    try {
      // Drop functions from all schemas
      const functionSchemas = ["public", "accounting", "audit", "bank", "rs", "tasks", "crm", "email"];
      for (const schema of functionSchemas) {
        try {
          const functionsResult = await client.query(`
            SELECT routine_name, routine_type
            FROM information_schema.routines
            WHERE routine_schema = $1
            AND routine_type = 'FUNCTION'
          `, [schema]);
          
          for (const func of functionsResult.rows) {
            try {
              // Try to get function signature for proper dropping
              const funcDetails = await client.query(`
                SELECT pg_get_function_identity_arguments(oid) as args
                FROM pg_proc
                WHERE proname = $1 AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = $2)
                LIMIT 1
              `, [func.routine_name, schema]);
              
              if (funcDetails.rows.length > 0) {
                const args = funcDetails.rows[0].args || '';
                await client.query(`DROP FUNCTION IF EXISTS "${schema}"."${func.routine_name}"(${args}) CASCADE`);
              } else {
                await client.query(`DROP FUNCTION IF EXISTS "${schema}"."${func.routine_name}" CASCADE`);
              }
              console.log(`  ✅ Dropped function: ${schema}.${func.routine_name}`);
            } catch (error: any) {
              // Ignore errors for individual functions
            }
          }
        } catch (error: any) {
          // Schema might not exist, ignore
        }
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.log(`  ⚠️  Warning dropping functions: ${errorMsg.substring(0, 80)}`);
    }

    // Step 4: Drop all schemas (CASCADE handles remaining objects)
    console.log("\n🗑️  Dropping all schemas...\n");
    
    // Drop all non-public schemas first (in reverse dependency order to avoid issues)
    const nonPublicSchemas = ["email", "crm", "tasks", "rs", "bank", "audit", "accounting"];
    
    for (const schema of nonPublicSchemas) {
      try {
        await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        console.log(`  ✅ Dropped schema: ${schema}`);
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        console.log(`  ⚠️  Warning dropping ${schema}: ${errorMsg.substring(0, 80)}`);
      }
    }
    
    // Drop public schema last (recreate it completely empty)
    try {
      await client.query(`DROP SCHEMA IF EXISTS public CASCADE`);
      await client.query(`CREATE SCHEMA public`);
      await client.query(`GRANT ALL ON SCHEMA public TO PUBLIC`);
      console.log(`  ✅ Dropped and recreated schema: public (completely empty)`);
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.log(`  ⚠️  Warning dropping public: ${errorMsg.substring(0, 80)}`);
    }

    console.log("\n✅ Database completely wiped - all schemas, tables, data, functions, triggers, sequences, and views deleted\n");

    // Step 5: Verify deletion
    console.log("🔍 Verifying deletion...\n");
    
    // Check schemas
    const schemasResult = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name IN ('public', 'audit', 'rs', 'accounting', 'bank', 'tasks', 'crm', 'email')
      ORDER BY schema_name
    `);

    const remainingSchemas = schemasResult.rows.map((row: any) => row.schema_name);
    
    if (remainingSchemas.length === 0 || (remainingSchemas.length === 1 && remainingSchemas[0] === 'public')) {
      console.log(`✅ All schemas deleted. Only empty public schema remains.\n`);
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
    
    // Check sequences
    const sequencesResult = await client.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name
    `);
    
    const remainingSequences = sequencesResult.rows.map((row: any) => row.sequence_name);
    
    // Check functions
    const functionsResult = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
      ORDER BY routine_name
    `);
    
    const remainingFunctions = functionsResult.rows.map((row: any) => row.routine_name);
    
    if (remainingTables.length === 0 && remainingSequences.length === 0 && remainingFunctions.length === 0) {
      console.log("✅ Database completely empty - all tables, sequences, and functions deleted\n");
    } else {
      if (remainingTables.length > 0) {
        console.log(`⚠️  ${remainingTables.length} table(s) still exist: ${remainingTables.join(", ")}\n`);
      }
      if (remainingSequences.length > 0) {
        console.log(`⚠️  ${remainingSequences.length} sequence(s) still exist: ${remainingSequences.join(", ")}\n`);
      }
      if (remainingFunctions.length > 0) {
        console.log(`⚠️  ${remainingFunctions.length} function(s) still exist: ${remainingFunctions.join(", ")}\n`);
      }
    }

    console.log("✨ Database reset to zero complete! Run 'npm run db:migrate' to recreate everything.\n");

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
