#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { pool } from '../server/db';

// Load .env
const envPath = resolve(process.cwd(), '.env');
config({ path: envPath });

async function dropEverything() {
    console.log('\n🗑️  Dropping ALL schemas and tables...\n');

    const client = await pool.connect();

    try {
        // Drop all schemas cascade
        await client.query('DROP SCHEMA IF EXISTS accounting CASCADE');
        console.log('  ✅ Dropped accounting schema');

        await client.query('DROP SCHEMA IF EXISTS rs CASCADE');
        console.log('  ✅ Dropped rs schema');

        await client.query('DROP SCHEMA IF EXISTS crm CASCADE');
        console.log('  ✅ Dropped crm schema');

        await client.query('DROP SCHEMA IF EXISTS audit CASCADE');
        console.log('  ✅ Dropped audit schema');

        // Drop all tables in public schema
        await client.query(`
      DO $$ 
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
        console.log('  ✅ Dropped all public tables');

        // Recreate schemas
        await client.query('CREATE SCHEMA IF NOT EXISTS accounting');
        await client.query('CREATE SCHEMA IF NOT EXISTS rs');
        await client.query('CREATE SCHEMA IF NOT EXISTS crm');
        console.log('\n  ✅ Recreated schemas');

        console.log('\n✅ Database completely cleaned!\n');

    } finally {
        client.release();
        await pool.end();
    }
}

dropEverything().catch(console.error);
