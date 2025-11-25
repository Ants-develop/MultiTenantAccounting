#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../server/db';
import { clients } from '../shared/schema';

// Load .env
const envPath = resolve(process.cwd(), '.env');
config({ path: envPath });

async function listClients() {
    console.log('\n📋 Querying existing clients...\n');

    try {
        const allClients = await db.select().from(clients);

        if (allClients.length === 0) {
            console.log('❌ No clients found in database!');
            console.log('   You need to create a client before running migrations.\n');
            return;
        }

        console.log(`✅ Found ${allClients.length} client(s):\n`);

        allClients.forEach((client, index) => {
            console.log(`${index + 1}. Client ID: ${client.id}`);
            console.log(`   Name: ${client.name}`);
            console.log(`   Code: ${client.code}`);
            console.log(`   Tenant Code: ${client.tenantCode || 'NOT SET'}`);
            console.log(`   Active: ${client.isActive}`);
            console.log('');
        });

        console.log('💡 Use one of these client IDs for your migration, or create a new client if needed.\n');

    } catch (error) {
        console.error('❌ Error querying clients:', error);
    }

    process.exit(0);
}

listClients();
