import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkRLSPolicies() {
  console.log("🔒 Checking Row Level Security (RLS) Policies...\n");

  try {
    // Check which tables have RLS enabled
    const rlsTablesQuery = sql`
      SELECT 
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND rowsecurity = true
      ORDER BY tablename;
    `;

    const rlsResult = await db.execute(rlsTablesQuery);
    const rlsTables = Array.isArray(rlsResult) ? rlsResult : rlsResult.rows || [];

    console.log(`Tables with RLS enabled: ${rlsTables.length}\n`);
    rlsTables.forEach((table: any) => {
      console.log(`  🔒 ${table.tablename}`);
    });

    // Check all policies
    const policiesQuery = sql`
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        cmd as operation,
        qual as using_expression
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;

    const policiesResult = await db.execute(policiesQuery);
    const policies = Array.isArray(policiesResult) ? policiesResult : policiesResult.rows || [];

    console.log(`\n📋 Total RLS Policies: ${policies.length}\n`);

    let currentTable = '';
    policies.forEach((policy: any) => {
      if (policy.tablename !== currentTable) {
        currentTable = policy.tablename;
        console.log(`\n${currentTable}:`);
      }
      console.log(`  ✓ ${policy.policyname} (${policy.operation})`);
    });

    // Summary
    const expectedRLSTables = [
      'passwords',
      'password_folders',
      'deals',
      'feed_posts',
      'feed_comments',
      'calendar_events',
      'profiles' // From first migration
    ];

    const actualRLSTables = rlsTables.map((t: any) => t.tablename);
    const missing = expectedRLSTables.filter(t => !actualRLSTables.includes(t));

    console.log("\n" + "=".repeat(70));
    if (missing.length === 0) {
      console.log("✅ All expected sensitive tables have RLS enabled");
    } else {
      console.log(`⚠️  Missing RLS on: ${missing.join(', ')}`);
    }
    console.log("=".repeat(70));

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkRLSPolicies();
