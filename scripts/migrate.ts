#!/usr/bin/env tsx

// Explicitly load .env file BEFORE importing migration-manager (which imports db.ts)
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

// Now import migration-manager - it will use the DATABASE_URL we just loaded
import { MigrationCLI } from "../server/migration-manager";

async function main() {
  const command = process.argv[2] || 'migrate';
  
  switch (command) {
    case 'migrate':
      await MigrationCLI.migrate();
      break;
    
    case 'status':
      await MigrationCLI.status();
      break;
    
    case 'generate':
      const name = process.argv[3];
      if (!name) {
        console.error("Please provide a migration name: npm run db:migrate generate <name>");
        process.exit(1);
      }
      await MigrationCLI.generate(name);
      break;
    
    default:
      console.log("Usage:");
      console.log("  npm run db:migrate         - Run pending migrations");
      console.log("  npm run db:migrate status  - Show migration status");
      console.log("  npm run db:migrate generate <name> - Generate new migration");
      break;
  }
}

main().catch(error => {
  console.error("Migration script failed:", error);
  process.exit(1);
}); 