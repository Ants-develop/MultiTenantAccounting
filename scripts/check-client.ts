#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../server/db';
import { clients } from '../shared/schema';
import { sql } from 'drizzle-orm';

// Load .env
const envPath = resolve(process.cwd(), '.env');
config({ path: envPath });

async function checkClientById(clientId: number) {
    console.log(`\n🔍 Checking for client ID ${clientId}...\n`);

    try {
        // Method 1: Using Drizzle ORM
        const clientsFromDrizzle = await db.select().from(clients).where(sql`id = ${clientId}`);
        console.log('✅ Drizzle ORM result:');
        console.log(JSON.stringify(clientsFromDrizzle, null, 2));

        // Method 2: Raw SQL to check actual database
        const rawResult = await db.execute(sql`SELECT * FROM clients WHERE id = ${clientId}`);
        console.log('\n✅ Raw SQL result:');
        console.log(JSON.stringify(rawResult.rows, null, 2));

        // Method 3: Check in accounting schema (in case there's a schema issue)
        try {
            const accountingResult = await db.execute(sql`SELECT * FROM accounting.clients WHERE id = ${clientId}`);
            console.log('\n✅ Accounting schema result:');
            console.log(JSON.stringify(accountingResult.rows, null, 2));
        } catch (e) {
            console.log('\n⚠️  No clients table in accounting schema (this may be normal)');
        }

        // List all clients to see what's actually there
        console.log('\n📋 All clients in database:');
        const allClients = await db.select().from(clients);
        allClients.forEach(c => {
            console.log(`  ID: ${c.id}, Name: ${c.name}, Tenant Code: ${c.tenantCode}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

checkClientById(7);
