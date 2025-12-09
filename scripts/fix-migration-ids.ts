#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function fixMigrationIds() {
  console.log("🔧 Fixing migration IDs in tracking table...\n");

  try {
    // Update the IDs to match the filenames
    const updates = [
      { oldId: '0000_dark_norrin_radd', newId: '0000_dark_norrin_radd.sql' },
      { oldId: '0001_add_backup_restore_tracking', newId: '0005_add_backup_restore_tracking.sql' },
      { oldId: '0002_backup_management_schema', newId: '013_backup_management_schema.sql' }
    ];

    for (const { oldId, newId } of updates) {
      const result = await db.execute(
        sql`UPDATE _migrations SET id = ${newId} WHERE id = ${oldId}`
      );
      console.log(`✓ Updated ${oldId} → ${newId}`);
    }

    console.log("\n✅ Migration IDs fixed!");
    console.log("   You can now run: npm run db:migrate\n");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixMigrationIds();



