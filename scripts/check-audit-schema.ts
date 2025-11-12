import { db } from '../server/db';

async function checkSchema() {
  try {
    const result = await db.execute(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema='audit' AND table_name='positive_balance_summary' 
      ORDER BY ordinal_position
    `);
    
    console.log('positive_balance_summary columns:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();

