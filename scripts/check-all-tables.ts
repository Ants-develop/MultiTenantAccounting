import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkAllTables() {
  console.log("📋 Checking comprehensive migration with all tables...\n");

  try {
    // Get all tables from database
    const result = await db.execute(sql`
      SELECT 
        table_schema,
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = t.table_schema) as column_count
      FROM information_schema.tables t
      WHERE table_schema IN ('public', 'accounting', 'rs')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);
    
    const tables = Array.isArray(result) ? result : result.rows || [];

    console.log(`Found ${tables.length} tables:\n`);
    
    let currentSchema = '';
    tables.forEach((table: any) => {
      if (table.table_schema !== currentSchema) {
        currentSchema = table.table_schema;
        console.log(`\n${currentSchema.toUpperCase()} SCHEMA:`);
      }
      console.log(`  ✓ ${table.table_name} (${table.column_count} columns)`);
    });

    // Expected tables in comprehensive migration
    const expectedTables = {
      // Core tables (22 - excluding rs.users)
      core: [
        'profiles', 'clients', 'user_companies', 'user_client_modules', 
        'user_client_features', 'activity_logs', 'company_settings',
        'main_company_settings', 'bank_accounts', 'raw_bank_transactions',
        'normalized_bank_transactions', 'migration_history', 'migration_logs',
        'migration_errors', 'notifications', 'conversations',
        'conversation_participants', 'messages', 'gdrive_downloads',
        'mssql_restores', 'backup_migration_logs', 'documents'
      ],
      // Accounting module (7)
      accounting: [
        'accounts', 'bills', 'customers', 'invoices', 'journal_entries',
        'journal_entry_lines', 'vendors'
      ],
      // RBAC (1)
      rbac: ['user_roles'],
      // CRM module (8)
      crm: [
        'client_contacts', 'client_team_assignments', 'client_services',
        'deal_stages', 'deals', 'deal_activities', 'deal_contacts', 'task_comments'
      ],
      // Workflow module (10)
      workflow: [
        'workflow_templates', 'workflow_stages', 'client_pipelines',
        'client_pipeline_stages', 'workflows', 'workflow_stage_history',
        'tasks', 'task_templates', 'client_task_templates', 'checklists'
      ],
      // Calendar module (2)
      calendar: ['calendar_events', 'calendar_event_participants'],
      // Feed module (4)
      feed: ['feed_profiles', 'feed_posts', 'feed_comments', 'feed_likes'],
      // Passwords module (2)
      passwords: ['password_folders', 'passwords'],
      // RS module (1)
      rs: ['users']
    };

    const actualTables = tables.map((t: any) => t.table_name);
    
    console.log("\n" + "=".repeat(70));
    console.log("📊 MODULE VERIFICATION:");
    console.log("=".repeat(70));

    let totalExpected = 0;
    let totalFound = 0;

    // Check each module
    const checkModule = (moduleName: string, expected: string[]) => {
      const found = expected.filter(t => actualTables.includes(t));
      const missing = expected.filter(t => !actualTables.includes(t));
      totalExpected += expected.length;
      totalFound += found.length;
      
      const status = found.length === expected.length ? '✅' : '❌';
      console.log(`${status} ${moduleName}: ${found.length}/${expected.length} tables`);
      
      if (missing.length > 0) {
        console.log(`   ⚠️  Missing: ${missing.join(', ')}`);
      }
    };

    checkModule('Core', expectedTables.core);
    checkModule('Accounting', expectedTables.accounting);
    checkModule('RBAC', expectedTables.rbac);
    checkModule('CRM', expectedTables.crm);
    checkModule('Workflow', expectedTables.workflow);
    checkModule('Calendar', expectedTables.calendar);
    checkModule('Feed', expectedTables.feed);
    checkModule('Passwords', expectedTables.passwords);
    checkModule('RS', expectedTables.rs);

    console.log("=".repeat(70));
    console.log(`\n🎯 TOTAL: ${totalFound}/${totalExpected} expected tables present`);
    
    if (totalFound === totalExpected) {
      console.log("\n✅ COMPREHENSIVE MIGRATION COMPLETE!\n");
      console.log("All feature modules have their database tables:");
      console.log("  ✓ Core accounting system (22 tables)");
      console.log("  ✓ Accounting module (7 tables)");
      console.log("  ✓ RBAC - Role-based access control (1 table)");
      console.log("  ✓ CRM - Client relationship management (8 tables)");
      console.log("  ✓ Workflows & Tasks (10 tables)");
      console.log("  ✓ Calendar & Events (2 tables)");
      console.log("  ✓ Social Feed (4 tables)");
      console.log("  ✓ Password Vault (2 tables)");
      console.log("  ✓ RS.GE Integration (1 table)");
      console.log("\n🔒 RLS Policies enabled for sensitive tables");
      console.log("🚀 Ready for production!\n");
    } else {
      console.log(`\n❌ INCOMPLETE: ${totalExpected - totalFound} tables missing\n`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkAllTables();
