#!/usr/bin/env tsx

/**
 * Verify clients in database
 * This script directly queries the database to show what clients actually exist
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { pool } from '../server/db';

// Load .env
const envPath = resolve(process.cwd(), '.env');
config({ path: envPath });

async function verifyClients() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Verifying clients in database...\n');
    
    // Get database info
    const dbInfo = await client.query('SELECT current_database(), current_user');
    console.log(`📊 Database: ${dbInfo.rows[0].current_database}`);
    console.log(`👤 User: ${dbInfo.rows[0].current_user}\n`);
    
    // Count total clients
    const countResult = await client.query('SELECT COUNT(*) as count FROM clients');
    const totalCount = parseInt(countResult.rows[0].count);
    console.log(`📈 Total clients in database: ${totalCount}\n`);
    
    if (totalCount === 0) {
      console.log('❌ No clients found in database!\n');
      return;
    }
    
    // Get all clients
    const clientsResult = await client.query(`
      SELECT 
        id, 
        name, 
        code, 
        tenant_code, 
        is_active, 
        created_at,
        updated_at
      FROM clients 
      ORDER BY id
    `);
    
    console.log('📋 All clients in database:\n');
    clientsResult.rows.forEach((client, index) => {
      console.log(`${index + 1}. ID: ${client.id}`);
      console.log(`   Name: ${client.name}`);
      console.log(`   Code: ${client.code}`);
      console.log(`   Tenant Code: ${client.tenant_code || 'N/A'}`);
      console.log(`   Active: ${client.is_active}`);
      console.log(`   Created: ${client.created_at}`);
      console.log(`   Updated: ${client.updated_at}`);
      console.log('');
    });
    
    // Check for specific IDs mentioned in logs
    const mentionedIds = [3, 5, 6, 7, 8, 9];
    console.log('🔎 Checking for specific IDs from logs (3, 5, 6, 7, 8, 9):\n');
    for (const id of mentionedIds) {
      const checkResult = await client.query('SELECT id, name, code FROM clients WHERE id = $1', [id]);
      if (checkResult.rows.length > 0) {
        console.log(`   ✅ ID ${id}: EXISTS - ${checkResult.rows[0].name} (${checkResult.rows[0].code})`);
      } else {
        console.log(`   ❌ ID ${id}: NOT FOUND`);
      }
    }
    
    console.log('\n✨ Verification complete!\n');
    
  } catch (error: any) {
    console.error('\n❌ Error verifying clients:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyClients()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

