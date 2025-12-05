#!/usr/bin/env tsx

/**
 * Database Cleanup Script
 * Fixes issues identified by db-diagnostics:
 * 1. Creates missing backup_restore_history VIEW
 * 2. Drops duplicate tables from public and temporal schemas
 */

import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
config({ path: envPath });

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function cleanup() {
    console.log("🧹 Database Cleanup Script\n");
    console.log("=".repeat(60));

    try {
        // 1. Create backup_restore_history VIEW if missing
        console.log("\n📋 Step 1: Check/Create backup_restore_history VIEW...\n");

        const viewCheck = await db.execute(sql`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_name = 'backup_restore_history'
    `);

        if (viewCheck.rows.length === 0) {
            // Check if mssql_restores exists first
            const mssqlCheck = await db.execute(sql`
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'mssql_restores' AND table_type = 'BASE TABLE'
      `);

            if (mssqlCheck.rows.length > 0) {
                console.log("   Creating backup_restore_history VIEW...");
                await db.execute(sql`
          CREATE OR REPLACE VIEW backup_restore_history AS 
          SELECT 
            id,
            google_drive_file_id,
            google_drive_file_name,
            supabase_storage_path,
            file_hash,
            storage_source,
            restored_db_name as temp_database_name,
            restore_status,
            client_id,
            restore_options,
            restore_timestamp as started_at,
            completed_at,
            error_message,
            created_by,
            created_at,
            updated_at
          FROM mssql_restores
        `);
                console.log("   ✅ Created backup_restore_history VIEW");
            } else {
                console.log("   ⚠️  mssql_restores table doesn't exist, skipping VIEW creation");
            }
        } else {
            const row = viewCheck.rows[0] as { table_type: string };
            if (row.table_type === 'VIEW') {
                console.log("   ✅ backup_restore_history VIEW already exists");
            } else {
                console.log("   ⚠️  backup_restore_history exists as TABLE, not VIEW");
                console.log("       Run npm run db:migrate to convert it");
            }
        }

        // 2. Drop duplicate tables from public schema
        console.log("\n📋 Step 2: Remove duplicate tables from 'public' schema...\n");

        const publicDuplicates = ['workspaces', 'pipelines', 'jobs'];

        for (const table of publicDuplicates) {
            try {
                // Check if exists in public schema
                const exists = await db.execute(sql`
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = ${table}
        `);

                if (exists.rows.length > 0) {
                    // Check if the correct version exists in tasks schema
                    const tasksExists = await db.execute(sql`
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'tasks' AND table_name = ${table}
          `);

                    if (tasksExists.rows.length > 0) {
                        console.log(`   Dropping public.${table} (tasks.${table} exists)...`);
                        await db.execute(sql.raw(`DROP TABLE IF EXISTS public.${table} CASCADE`));
                        console.log(`   ✅ Dropped public.${table}`);
                    } else {
                        console.log(`   ⚠️  Skipping public.${table} - tasks.${table} doesn't exist`);
                    }
                } else {
                    console.log(`   ○ public.${table} doesn't exist, skipping`);
                }
            } catch (error: any) {
                console.log(`   ❌ Error with ${table}: ${error.message.substring(0, 50)}`);
            }
        }

        // 3. Drop duplicate tables from temporal schema (if exists)
        console.log("\n📋 Step 3: Remove duplicate tables from 'temporal' schema...\n");

        const temporalCheck = await db.execute(sql`
      SELECT 1 FROM information_schema.schemata WHERE schema_name = 'temporal'
    `);

        if (temporalCheck.rows.length > 0) {
            const temporalDuplicates = ['workspaces', 'pipelines', 'jobs', 'tasks'];

            for (const table of temporalDuplicates) {
                try {
                    const exists = await db.execute(sql`
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'temporal' AND table_name = ${table}
          `);

                    if (exists.rows.length > 0) {
                        console.log(`   Dropping temporal.${table}...`);
                        await db.execute(sql.raw(`DROP TABLE IF EXISTS temporal.${table} CASCADE`));
                        console.log(`   ✅ Dropped temporal.${table}`);
                    } else {
                        console.log(`   ○ temporal.${table} doesn't exist, skipping`);
                    }
                } catch (error: any) {
                    console.log(`   ❌ Error with ${table}: ${error.message.substring(0, 50)}`);
                }
            }

            // Optionally drop the temporal schema if empty
            const remainingTables = await db.execute(sql`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = 'temporal'
      `);

            const count = (remainingTables.rows[0] as { count: string }).count;
            if (count === '0') {
                console.log("\n   temporal schema is empty, dropping it...");
                await db.execute(sql`DROP SCHEMA IF EXISTS temporal CASCADE`);
                console.log("   ✅ Dropped empty temporal schema");
            }
        } else {
            console.log("   ○ temporal schema doesn't exist, skipping");
        }

        // 4. Clean up old migration entry for 0014
        console.log("\n📋 Step 4: Clean up migration tracking...\n");

        try {
            const migrationCheck = await db.execute(sql`
        SELECT id, version, name FROM _migrations WHERE version = 14
      `);

            if (migrationCheck.rows.length > 0) {
                console.log("   Removing old 0014 migration entry...");
                await db.execute(sql`DELETE FROM _migrations WHERE version = 14`);
                console.log("   ✅ Removed migration entry for version 14");
            } else {
                console.log("   ○ No migration 14 entry to clean up");
            }
        } catch (error: any) {
            console.log(`   ⚠️  Could not check migrations: ${error.message.substring(0, 50)}`);
        }

        console.log("\n" + "=".repeat(60));
        console.log("✅ Cleanup completed!\n");
        console.log("Run 'npm run db:diagnostics' to verify the fixes.\n");

    } catch (error) {
        console.error("\n❌ Cleanup failed:", error);
        process.exit(1);
    }

    process.exit(0);
}

cleanup();
