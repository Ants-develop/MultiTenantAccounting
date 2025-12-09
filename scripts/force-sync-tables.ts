#!/usr/bin/env tsx

// Force create missing tables directly from migration SQL
import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
config({ path: envPath });

import { db } from "../server/db";
import { sql } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

async function forceSyncTables() {
  try {
    console.log("🔧 Force syncing missing tables from migration...\n");

    // Read the consolidated migration
    const migrationPath = path.join(process.cwd(), "migrations", "0000_dark_norrin_radd.sql");
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    // Extract just the UP section (before -- DOWN)
    const upSection = migrationSQL.split('-- DOWN')[0];

    // Split into individual statements
    const statements = upSection
      .split('--> statement-breakpoint')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} statements to execute\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      // Skip empty or comment-only statements
      if (!stmt || stmt.startsWith('--')) continue;

      try {
        await db.execute(sql.raw(stmt));
        
        // Extract table/index name for logging
        const match = stmt.match(/CREATE\s+(?:TABLE|INDEX|SCHEMA)\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?([^\s("']+)/i);
        const name = match ? match[1] : `statement ${i + 1}`;
        
        console.log(`✓ ${name}`);
        successCount++;
      } catch (error: any) {
        // Handle common "already exists" errors gracefully
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.message.includes('relation') && error.message.includes('already exists')) {
          
          const match = stmt.match(/CREATE\s+(?:TABLE|INDEX|SCHEMA)\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?([^\s("']+)/i);
          const name = match ? match[1] : `statement ${i + 1}`;
          console.log(`⊘ ${name} (already exists)`);
          skipCount++;
        } else {
          // Log non-critical errors but continue
          const shortError = error.message.substring(0, 80);
          console.log(`⚠ Statement ${i + 1}: ${shortError}...`);
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✓ Created: ${successCount}`);
    console.log(`   ⊘ Skipped (exists): ${skipCount}`);
    console.log(`   ⚠ Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log(`\n✅ Database sync completed successfully!`);
      console.log(`   You can now run: npm run db:migrate`);
    } else {
      console.log(`\n⚠️  Completed with some errors. Review above and try: npm run db:migrate`);
    }

  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  }
}

forceSyncTables();



