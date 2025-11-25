#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { pool } from '../server/db';

const envPath = resolve(process.cwd(), '.env');
config({ path: envPath });

async function checkSchemas() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Checking table schemas...\n');
    
    // Check current search_path
    const searchPath = await client.query('SHOW search_path');
    console.log(`📊 Current search_path: ${searchPath.rows[0].search_path}\n`);
    
    // Check all schemas
    const schemas = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schema_name
    `);
    console.log('📋 Available schemas:');
    schemas.rows.forEach(row => console.log(`  - ${row.schema_name}`));
    console.log('');
    
    // Check where clients, users, user_companies are
    const tables = await client.query(`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE tablename IN ('clients', 'users', 'user_companies', 'main_company_settings', 'company_settings')
      ORDER BY schemaname, tablename
    `);
    
    console.log('📋 Core tables and their schemas:');
    if (tables.rows.length === 0) {
      console.log('  ❌ No tables found!');
    } else {
      tables.rows.forEach(row => {
        console.log(`  ${row.schemaname}.${row.tablename}`);
      });
    }
    
    // Check if temporal schema exists (should not exist - warn if found)
    const temporalCheck = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'temporal'
    `);
    
    if (temporalCheck.rows.length > 0) {
      console.log('\n⚠️  WARNING: Temporal schema exists but should NOT exist!');
      console.log('   All tables should be in public schema or their intended schemas.');
      console.log('   Please run db:reset and db:migrate to recreate database structure correctly.');
      const temporalTables = await client.query(`
        SELECT COUNT(*) as count
        FROM pg_tables 
        WHERE schemaname = 'temporal'
      `);
      if (parseInt(temporalTables.rows[0].count) > 0) {
        console.log(`   Found ${temporalTables.rows[0].count} table(s) in temporal schema that need to be moved to public.`);
      }
    } else {
      console.log('\n✅ Temporal schema does not exist (correct)');
    }
    
    console.log('\n✨ Check complete!\n');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchemas()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

