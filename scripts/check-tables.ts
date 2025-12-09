#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkTables() {
  try {
    // Check all schemas for key tables
    const result = await db.execute(sql`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('users', 'clients', 'accounts', 'journal_entries', 'customers', 'vendors')
      ORDER BY table_schema, table_name
    `);
    console.log("Tables found:");
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Check public schema specifically
    const publicTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log("\nAll tables in public schema:");
    console.log(publicTables.rows.map((r: any) => r.table_name).join(', '));
    
    // Check accounting schema
    const accountingTables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'accounting'
      ORDER BY table_name
    `);
    console.log("\nAll tables in accounting schema:");
    console.log(accountingTables.rows.map((r: any) => r.table_name).join(', '));
  } catch (error) {
    console.error("Error:", error);
  }
}

checkTables();



