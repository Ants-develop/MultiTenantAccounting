import { db } from "../server/db";
import { sql } from "drizzle-orm";
import fs from 'fs';
import path from 'path';

async function applyAuditSchema() {
  console.log("🚀 Applying Audit Schema directly...\n");

  const migrationPath = path.join(process.cwd(), 'migrations', '0016_audit_module_schema.sql');
  
  try {
    const content = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute the SQL
    // We use sql.raw() to pass the raw SQL string
    await db.execute(sql.raw(content));
    
    console.log("✅ Audit Schema applied successfully!");
  } catch (error) {
    console.error("❌ Failed to apply audit schema:", error);
  }
  process.exit(0);
}

applyAuditSchema();
