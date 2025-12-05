#!/usr/bin/env tsx

// Explicitly load .env file BEFORE importing migration-manager
import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
const result = config({ path: envPath });
if (result.error && !process.env.DATABASE_URL) {
  console.warn(`⚠️  Could not load .env from ${envPath}: ${result.error.message}`);
} else if (process.env.DATABASE_URL) {
  const urlParts = process.env.DATABASE_URL.split('@');
  const dbInfo = urlParts.length > 1 ? `@${urlParts[1]}` : 'database';
  console.log(`📝 Loaded DATABASE_URL from .env: ${dbInfo}`);
}

import { db } from "../server/db";
import { sql } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

async function markMigrationsAsApplied() {
  try {
    console.log("🔧 Marking existing migrations as applied in tracking table...\n");

    // Ensure migrations table exists
    await db.execute(sql.raw('CREATE SCHEMA IF NOT EXISTS public;'));
    await db.execute(sql.raw('GRANT ALL ON SCHEMA public TO PUBLIC;'));
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "_migrations" (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        version INTEGER NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW(),
        execution_time_ms INTEGER,
        UNIQUE(version)
      )
    `);

    // Migration files we need to mark as applied
    const migrationsToMark = [
      { version: 0, name: "dark_norrin_radd", file: "0000_dark_norrin_radd.sql" },
      { version: 1, name: "add_backup_restore_tracking", file: "0005_add_backup_restore_tracking.sql" },
      { version: 2, name: "backup_management_schema", file: "013_backup_management_schema.sql" }
    ];

    for (const migration of migrationsToMark) {
      const filePath = path.join(process.cwd(), "migrations", migration.file);
      
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const checksum = crypto.createHash('sha256').update(fileContent).digest('hex');
        // ID must match the filename exactly (including .sql) as used by migration-manager
        const id = migration.file;

        // Check if already marked
        const existing = await db.execute(
          sql`SELECT id FROM "_migrations" WHERE version = ${migration.version}`
        );

        if (existing.rows.length > 0) {
          console.log(`✓ Already marked: ${migration.name} (version ${migration.version})`);
        } else {
          // Mark as applied
          await db.execute(
            sql`INSERT INTO "_migrations" (id, name, version, checksum, applied_at)
                VALUES (${id}, ${migration.name}, ${migration.version}, ${checksum}, NOW())`
          );
          console.log(`✓ Marked as applied: ${migration.name} (version ${migration.version})`);
        }
      } catch (error: any) {
        if (error.message.includes("does not exist")) {
          console.log(`⚠️  File not found: ${migration.file} (skipping)`);
        } else {
          throw error;
        }
      }
    }

    console.log("\n✅ Migration tracking updated successfully!");
    console.log("You can now run: npm run db:migrate\n");

  } catch (error) {
    console.error("❌ Error marking migrations:", error);
    process.exit(1);
  }
}

markMigrationsAsApplied();

