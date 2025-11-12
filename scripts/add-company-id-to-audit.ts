import { db } from '../server/db';

async function addCompanyId() {
  const auditTables = [
    '1690_stock', 'accounts_summary', 'accrued_interest', 'analytics', 
    'analytics_balance_summary', 'capital_accounts', 'capital_accounts_summary',
    'creditors_avans', 'debitors_avans', 'dublicate_creditors', 'dublicate_debitors',
    'high_amount_per_quantity_summary', 'negativ_creditor', 'negativ_debitor',
    'negative_balance_141_summary', 'negative_balance_311_summary', 'negative_balance_summary',
    'negative_loans', 'negative_stock', 'negativ_interest', 'negativ_salary',
    'positive_balance_summary', 'revaluation_status_summary', 'salary_expense', 'writeoff_stock'
  ];

  try {
    console.log('📋 Adding company_id column to all audit tables...\n');
    
    for (const tableName of auditTables) {
      try {
        await db.execute(`
          ALTER TABLE audit."${tableName}" 
          ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
        `);
        console.log(`✅ Added company_id to audit.${tableName}`);
      } catch (error: any) {
        console.log(`⚠️  audit.${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Successfully added company_id to all audit tables!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addCompanyId();

