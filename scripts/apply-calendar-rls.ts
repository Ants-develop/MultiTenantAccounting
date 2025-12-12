
import { pool } from "../server/db";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    console.log("Applying Calendar RLS policies...");
    
    const migrationPath = path.resolve(__dirname, "../supabase/migrations/20251212100000_calendar_rls.sql");
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found at: ${migrationPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, "utf-8");
    
    console.log("Executing SQL...");
    await pool.query(sql);
    
    console.log("✅ Calendar RLS policies applied successfully!");
  } catch (error) {
    console.error("❌ Error applying migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
