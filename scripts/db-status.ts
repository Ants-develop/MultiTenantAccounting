#!/usr/bin/env tsx

import { MigrationManager } from "../server/migration-manager";
import { DatabaseValidationService } from "../server/db-validation";

async function main() {
  console.log("📊 Database Status Report");
  console.log("========================\n");
  
  try {
    // Get migration status
    console.log("🔄 Migration Status:");
    const status = await MigrationManager.getStatus();
    
    console.log(`   Applied: ${status.applied.length} migrations`);
    console.log(`   Pending: ${status.pending.length} migrations`);
    
    if (status.pending.length > 0) {
      console.log("   📋 Pending migrations:");
      status.pending.forEach(m => {
        console.log(`      • ${m.version}: ${m.name}`);
      });
    }
    
    console.log(`   Health: ${status.healthCheck.isHealthy ? '✅ Healthy' : '❌ Issues found'}`);
    
    // Get schema info
    console.log("\n📈 Schema Information:");
    const schemaInfo = await DatabaseValidationService.getSchemaInfo();
    console.log(`   Database size: ${schemaInfo.size}`);
    console.log(`   Tables: ${schemaInfo.tables.length}`);
    console.log(`   Total records: ${schemaInfo.tables.reduce((sum, t) => sum + t.rowCount, 0).toLocaleString()}`);
    
    // Show table details
    console.log("\n📋 Table Details:");
    schemaInfo.tables.forEach(table => {
      const formattedCount = table.rowCount.toLocaleString();
      console.log(`   ${table.name.padEnd(20)} ${formattedCount.padStart(10)} rows`);
    });
    
    // Performance info
    console.log("\n⚡ Performance:");
    console.log(`   Connection time: ${status.healthCheck.performance.connectionTime}ms`);
    console.log(`   Query time: ${status.healthCheck.performance.queryTime}ms`);
    
    // Issues summary
    if (status.healthCheck.issues.length > 0) {
      console.log("\n⚠️ Issues Found:");
      status.healthCheck.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }
    
    // Recommendations
    console.log("\n💡 Recommendations:");
    if (status.pending.length > 0) {
      console.log("   • Run 'npm run db:migrate' to apply pending migrations");
    }
    if (!status.healthCheck.schema.indexesOptimal) {
      console.log("   • Some database indexes could be optimized");
    }
    if (status.healthCheck.performance.connectionTime > 1000) {
      console.log("   • Database connection is slow, consider optimization");
    }
    if (status.healthCheck.issues.length === 0 && status.pending.length === 0) {
      console.log("   ✅ Database is in good health!");
    }
    
  } catch (error) {
    console.error("❌ Failed to get database status:", error);
    process.exit(1);
  }
}

main(); 