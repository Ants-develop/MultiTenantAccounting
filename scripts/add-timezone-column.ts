import { config } from 'dotenv';
import { resolve } from 'path';
import { db } from '../server/db.js';
import { sql } from 'drizzle-orm';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

async function addTimeZoneColumn() {
    try {
        console.log('Checking if time_zone column exists...');

        // Check if column exists
        const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'main_company_settings' 
      AND column_name = 'time_zone'
    `);

        if (result.rows.length > 0) {
            console.log('✓ time_zone column already exists');
            return;
        }

        console.log('Adding time_zone column to main_company_settings...');

        // Add the column
        await db.execute(sql`
      ALTER TABLE main_company_settings 
      ADD COLUMN time_zone text DEFAULT 'America/New_York'
    `);

        console.log('✓ Successfully added time_zone column');

    } catch (error) {
        console.error('Error adding time_zone column:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

addTimeZoneColumn();
