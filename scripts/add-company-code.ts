import { db } from '../server/db';

async function addCompanyCode() {
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
    console.log('📋 Renaming company_id to company_code in all audit tables...\n');
    
    for (const tableName of auditTables) {
      try {
        // Rename company_id to company_code
        await db.execute(`
          ALTER TABLE audit."${tableName}" 
          RENAME COLUMN company_id TO company_code
        `);
        console.log(`✅ Renamed company_id → company_code in audit.${tableName}`);
      } catch (error: any) {
        if (error.message.includes('does not exist')) {
          console.log(`⚠️  audit.${tableName}: column company_id does not exist (might already be renamed)`);
        } else {
          console.log(`❌ audit.${tableName}: ${error.message}`);
        }
      }
    }
    
    console.log('\n✅ Successfully renamed company_id to company_code!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addCompanyCode();

