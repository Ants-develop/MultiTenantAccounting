import { db } from '../server/db';

async function fixColumns() {
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
    console.log('🔧 Fixing company columns in all audit tables...\n');
    
    for (const tableName of auditTables) {
      try {
        // Step 1: Add company_id column (for MSSQL CompanyID data)
        await db.execute(`
          ALTER TABLE audit."${tableName}" 
          ADD COLUMN IF NOT EXISTS company_id VARCHAR(50)
        `);
        
        // Step 2: Drop old company_code (VARCHAR) column  
        await db.execute(`
          ALTER TABLE audit."${tableName}" 
          DROP COLUMN IF EXISTS company_code
        `);
        
        // Step 3: Add new company_code (INTEGER FK)
        await db.execute(`
          ALTER TABLE audit."${tableName}" 
          ADD COLUMN company_code INTEGER REFERENCES companies(id) ON DELETE CASCADE
        `);
        
        console.log(`✅ Fixed audit.${tableName}`);
      } catch (error: any) {
        console.log(`❌ audit.${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n✅ All tables fixed!');
    console.log('\nNew structure:');
    console.log('  - company_code (INTEGER) = PostgreSQL FK to companies');
    console.log('  - company_id (VARCHAR) = MSSQL CompanyID data');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixColumns();

