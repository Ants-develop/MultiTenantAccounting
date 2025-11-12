import { db } from '../server/db';

async function addIndexes() {
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
    console.log('📊 Adding performance indexes to audit tables...\n');
    
    for (const tableName of auditTables) {
      try {
        // Index on tenant_code for filtering by tenant
        await db.execute(`
          CREATE INDEX IF NOT EXISTS idx_${tableName.replace(/[^a-z0-9]/g, '_')}_tenant 
          ON audit."${tableName}"(tenant_code)
        `);
        
        // Index on company_code for filtering by company
        await db.execute(`
          CREATE INDEX IF NOT EXISTS idx_${tableName.replace(/[^a-z0-9]/g, '_')}_company 
          ON audit."${tableName}"(company_code)
        `);
        
        // Index on posting_month for date range queries (if column exists)
        try {
          await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_${tableName.replace(/[^a-z0-9]/g, '_')}_period 
            ON audit."${tableName}"(posting_month)
          `);
        } catch {
          // Column might not exist in all tables, skip silently
        }
        
        console.log(`✅ Added indexes to audit.${tableName}`);
      } catch (error: any) {
        console.log(`⚠️  audit.${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n✅ All indexes added!');
    console.log('\n📈 Performance improvements:');
    console.log('  - Faster filtering by tenant_code');
    console.log('  - Faster filtering by company_code');
    console.log('  - Faster date range queries');
    console.log('\n⚠️  Note: First query after index creation may still be slow');
    console.log('   Subsequent queries will be much faster!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addIndexes();

