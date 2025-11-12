#!/usr/bin/env tsx

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