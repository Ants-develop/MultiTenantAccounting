#!/usr/bin/env tsx

/**
 * Database Migration Diagnostic Script
 * Checks the current state of tables, views, schemas, and migration tracking
 */

import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
config({ path: envPath });

import { db } from "../server/db";
import { sql } from "drizzle-orm";

interface DiagnosticResult {
    category: string;
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
}

async function runDiagnostics() {
    console.log("🔍 Database Migration Diagnostics\n");
    console.log("=".repeat(60));

    const results: DiagnosticResult[] = [];

    try {
        // 1. Check all schemas exist
        console.log("\n📋 Checking Schemas...\n");
        const expectedSchemas = ['public', 'accounting', 'audit', 'bank', 'rs', 'tasks', 'crm', 'email'];

        const schemasResult = await db.execute(sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name IN ('public', 'accounting', 'audit', 'bank', 'rs', 'tasks', 'crm', 'email')
    `);

        const existingSchemas = (schemasResult.rows as { schema_name: string }[]).map(r => r.schema_name);

        for (const schema of expectedSchemas) {
            if (existingSchemas.includes(schema)) {
                console.log(`   ✅ ${schema}`);
                results.push({ category: 'schema', name: schema, status: 'ok', message: 'exists' });
            } else {
                console.log(`   ❌ ${schema} (missing)`);
                results.push({ category: 'schema', name: schema, status: 'error', message: 'missing' });
            }
        }

        // 2. Check backup_restore_history status
        console.log("\n📋 Checking backup_restore_history...\n");

        const backupRestoreCheck = await db.execute(sql`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_name = 'backup_restore_history'
    `);

        if (backupRestoreCheck.rows.length === 0) {
            console.log("   ⚠️  backup_restore_history does not exist");
            results.push({
                category: 'table',
                name: 'backup_restore_history',
                status: 'warning',
                message: 'does not exist'
            });
        } else {
            const row = backupRestoreCheck.rows[0] as { table_name: string; table_type: string };
            if (row.table_type === 'VIEW') {
                console.log("   ✅ backup_restore_history is a VIEW (correct - migration 0013 applied)");
                results.push({
                    category: 'table',
                    name: 'backup_restore_history',
                    status: 'ok',
                    message: 'is a VIEW (migration 0013 applied)'
                });
            } else {
                console.log("   ⚠️  backup_restore_history is a TABLE (may need migration 0013)");
                results.push({
                    category: 'table',
                    name: 'backup_restore_history',
                    status: 'warning',
                    message: 'is a TABLE - migration 0013 may not have run'
                });
            }
        }

        // 3. Check mssql_restores table
        const mssqlRestoresCheck = await db.execute(sql`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_name = 'mssql_restores' AND table_type = 'BASE TABLE'
    `);

        if (mssqlRestoresCheck.rows.length > 0) {
            console.log("   ✅ mssql_restores table exists");
            results.push({
                category: 'table',
                name: 'mssql_restores',
                status: 'ok',
                message: 'exists'
            });
        } else {
            console.log("   ⚠️  mssql_restores table missing");
            results.push({
                category: 'table',
                name: 'mssql_restores',
                status: 'warning',
                message: 'missing'
            });
        }

        // 4. Check tasks schema tables
        console.log("\n📋 Checking tasks schema tables...\n");

        const tasksSchemaCheck = await db.execute(sql`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('workspaces', 'pipelines', 'jobs', 'tasks')
      ORDER BY table_schema, table_name
    `);

        const tasksTables = tasksSchemaCheck.rows as { table_schema: string; table_name: string }[];

        for (const table of tasksTables) {
            if (table.table_schema === 'tasks') {
                console.log(`   ✅ ${table.table_name} in 'tasks' schema`);
                results.push({
                    category: 'schema_location',
                    name: table.table_name,
                    status: 'ok',
                    message: `correct: tasks.${table.table_name}`
                });
            } else {
                console.log(`   ⚠️  ${table.table_name} in '${table.table_schema}' schema (expected 'tasks')`);
                results.push({
                    category: 'schema_location',
                    name: table.table_name,
                    status: 'warning',
                    message: `wrong schema: ${table.table_schema} (expected tasks)`
                });
            }
        }

        // 5. Check migration tracking
        console.log("\n📋 Checking migration tracking...\n");

        try {
            const migrationsCheck = await db.execute(sql`
        SELECT id, name, version, applied_at 
        FROM _migrations 
        ORDER BY version
      `);

            console.log("   Applied migrations:");
            for (const row of migrationsCheck.rows as any[]) {
                const appliedAt = row.applied_at ? new Date(row.applied_at).toISOString().split('T')[0] : 'unknown';
                console.log(`   📦 [${row.version}] ${row.name} (${appliedAt})`);
            }

            if (migrationsCheck.rows.length === 0) {
                console.log("   ⚠️  No migrations recorded in _migrations table");
            }
        } catch (error: any) {
            if (error.message.includes('does not exist')) {
                console.log("   ⚠️  _migrations table does not exist");
                results.push({
                    category: 'migration',
                    name: '_migrations',
                    status: 'warning',
                    message: 'tracking table missing'
                });
            } else {
                throw error;
            }
        }

        // 6. Count tables per schema
        console.log("\n📋 Table counts by schema...\n");

        const tableCountsResult = await db.execute(sql`
      SELECT table_schema, COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema IN ('public', 'accounting', 'audit', 'bank', 'rs', 'tasks', 'crm', 'email')
      AND table_type = 'BASE TABLE'
      GROUP BY table_schema
      ORDER BY table_schema
    `);

        for (const row of tableCountsResult.rows as { table_schema: string; count: string }[]) {
            console.log(`   ${row.table_schema}: ${row.count} tables`);
        }

        // Summary
        console.log("\n" + "=".repeat(60));
        console.log("📊 Summary\n");

        const errors = results.filter((r: DiagnosticResult) => r.status === 'error');
        const warnings = results.filter((r: DiagnosticResult) => r.status === 'warning');

        if (errors.length === 0 && warnings.length === 0) {
            console.log("   ✅ All checks passed! Database is in good state.");
        } else {
            if (errors.length > 0) {
                console.log(`   ❌ ${errors.length} error(s):`);
                errors.forEach((e: DiagnosticResult) => console.log(`      - ${e.name}: ${e.message}`));
            }
            if (warnings.length > 0) {
                console.log(`   ⚠️  ${warnings.length} warning(s):`);
                warnings.forEach((w: DiagnosticResult) => console.log(`      - ${w.name}: ${w.message}`));
            }
        }

        console.log("\n" + "=".repeat(60));

        // Recommendations
        if (warnings.length > 0 || errors.length > 0) {
            console.log("\n💡 Recommendations:\n");

            const hasBackupTableWarning = results.find(
                (r: DiagnosticResult) => r.name === 'backup_restore_history' && r.status === 'warning' && r.message.includes('TABLE')
            );

            if (hasBackupTableWarning) {
                console.log("   • backup_restore_history is a TABLE but should be a VIEW.");
                console.log("     Run: npm run db:migrate (migration 0013 will fix this)");
            }

            const wrongSchemaTables = results.filter(
                (r: DiagnosticResult) => r.category === 'schema_location' && r.status === 'warning'
            );

            if (wrongSchemaTables.length > 0) {
                console.log("   • Some tables are in the wrong schema.");
                console.log("     This may cause ORM mapping issues. Consider recreating with: npm run db:reset");
            }
        }

    } catch (error) {
        console.error("\n❌ Diagnostic failed:", error);
        process.exit(1);
    }

    process.exit(0);
}

runDiagnostics();
