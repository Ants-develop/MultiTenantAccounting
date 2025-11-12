import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const migrationPath = join(process.cwd(), 'migrations', '002_audit_schema.sql');
let content = readFileSync(migrationPath, 'utf-8');

// List of all audit tables
const auditTables = [
  'accounts_summary', 'accrued_interest', 'analytics', 'analytics_balance_summary',
  'capital_accounts', 'capital_accounts_summary', 'creditors_avans', 'debitors_avans',
  'dublicate_creditors', 'dublicate_debitors', 'high_amount_per_quantity_summary',
  'negativ_creditor', 'negativ_debitor', 'negative_balance_141_summary',
  'negative_balance_311_summary', 'negative_balance_summary', 'negative_loans',
  'negative_stock', 'negativ_interest', 'negativ_salary', 'positive_balance_summary',
  'revaluation_status_summary', 'salary_expense', 'writeoff_stock'
];

console.log('🔧 Adding company_code to all audit tables in migration file...\n');

let updatedCount = 0;

for (const tableName of auditTables) {
  // Find the PRIMARY KEY line for this table
  const regex = new RegExp(
    `(CREATE TABLE IF NOT EXISTS audit\\.(?:")?${tableName}(?:")? \\([\\s\\S]*?)(\\s+PRIMARY KEY)`,
    'g'
  );
  
  const match = content.match(regex);
  if (match) {
    content = content.replace(regex, (fullMatch, tableContent, primaryKey) => {
      // Check if company_code already exists
      if (tableContent.includes('company_code')) {
        console.log(`  ⏭️  ${tableName} - already has company_code`);
        return fullMatch;
      }
      
      // Add company_code before PRIMARY KEY
      const updated = `${tableContent},
    company_code INTEGER REFERENCES companies(id) ON DELETE CASCADE${primaryKey}`;
      
      console.log(`  ✅ ${tableName} - added company_code`);
      updatedCount++;
      return updated;
    });
  } else {
    console.log(`  ⚠️  ${tableName} - no match found`);
  }
}

writeFileSync(migrationPath, content, 'utf-8');

console.log(`\n✅ Updated ${updatedCount} tables`);
console.log('💾 Saved to migrations/002_audit_schema.sql');

