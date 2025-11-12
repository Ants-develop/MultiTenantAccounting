import { db } from '../server/db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applySchema() {
  try {
    console.log('📋 Reading audit schema migration...');
    const sql = readFileSync(join(process.cwd(), 'migrations', '002_audit_schema.sql'), 'utf-8');
    
    // Extract only the UP section
    const upMatch = sql.match(/--\s*UP\s*\n([\s\S]*?)--\s*DOWN/);
    if (!upMatch) {
      throw new Error('Could not find UP section in migration');
    }
    
    const upSQL = upMatch[1].trim();
    console.log('✅ Found UP section');
    console.log('🚀 Applying audit schema...\n');
    
    // Execute the SQL
    await db.execute(upSQL);
    
    console.log('\n✅ Successfully applied audit schema!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

applySchema();

