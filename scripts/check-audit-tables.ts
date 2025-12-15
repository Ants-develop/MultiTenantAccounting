import { db } from "../server/db";
import { sql } from "drizzle-orm";

const auditTables = [
  "1690_stock",
  "accounts_summary",
  "accrued_interest",
  "analytics",
  "analytics_balance_summary",
  "capital_accounts",
  "capital_accounts_summary",
  "creditors_avans",
  "debitors_avans",
  "dublicate_creditors",
  "dublicate_debitors",
  "high_amount_per_quantity_summary",
  "negativ_creditor",
  "negativ_debitor",
  "negative_balance_141_summary",
  "negative_balance_311_summary",
  "negative_balance_summary",
  "negative_loans",
  "negative_stock",
  "negativ_interest",
  "negativ_salary",
  "positive_balance_summary",
  "revaluation_status_summary",
  "salary_expense",
  "writeoff_stock"
];

async function checkAuditTables() {
  console.log("🔍 Checking Audit Tables in 'audit' schema...\n");

  try {
    // Check if schema exists
    const schemaExistsQuery = sql`
      SELECT EXISTS (
        SELECT FROM information_schema.schemata 
        WHERE schema_name = 'audit'
      );
    `;
    const schemaResult = await db.execute(schemaExistsQuery);
    const schemaExists = schemaResult[0]?.exists;

    if (!schemaExists) {
      console.log("❌ Schema 'audit' not found!");
      process.exit(0);
    } else {
      console.log("✅ Schema 'audit' found.\n");
    }

    for (const tableName of auditTables) {
      // Check if table exists
      const tableExistsQuery = sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'audit' 
          AND table_name = ${tableName}
        );
      `;
      const existsResult = await db.execute(tableExistsQuery);
      const exists = existsResult[0]?.exists;

      if (!exists) {
        console.log(`❌ ${tableName}: Not Found`);
        continue;
      }

      // Check RLS status
      const rlsQuery = sql`
        SELECT rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'audit' 
        AND tablename = ${tableName};
      `;
      const rlsResult = await db.execute(rlsQuery);
      const rlsEnabled = rlsResult[0]?.rowsecurity;

      console.log(`${rlsEnabled ? '🔒' : '🔓'} ${tableName}: ${rlsEnabled ? 'RLS Enabled' : 'RLS Disabled'}`);
    }
  } catch (error) {
    console.error("Error checking tables:", error);
  }
  process.exit(0);
}

checkAuditTables();
