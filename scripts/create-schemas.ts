#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function createSchemas() {
  console.log("🔧 Creating database schemas...\n");

  const schemas = ['public', 'accounting', 'audit', 'bank', 'rs', 'tasks', 'crm', 'email'];

  for (const schema of schemas) {
    try {
      await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS ${schema}`));
      console.log(`✓ Schema: ${schema}`);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log(`⊘ Schema: ${schema} (already exists)`);
      } else {
        console.log(`⚠ Schema ${schema}: ${error.message}`);
      }
    }
  }

  // Grant permissions
  try {
    await db.execute(sql.raw('GRANT ALL ON SCHEMA public TO PUBLIC'));
    console.log(`\n✓ Granted permissions on public schema`);
  } catch (error: any) {
    console.log(`⚠ Grant: ${error.message}`);
  }

  console.log("\n✅ Schemas created!");
  console.log("   Now run: npm run db:force-sync\n");
}

createSchemas();



