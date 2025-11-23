
import { pool } from "./db";

async function runMigration() {
    console.log("Starting migration...");
    try {
        const client = await pool.connect();
        try {
            console.log("Adding missing columns to clients table...");

            // Add business_type column
            await client.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'business_type') THEN 
            ALTER TABLE clients ADD COLUMN business_type text DEFAULT 'individual'; 
            RAISE NOTICE 'Added business_type column';
          END IF; 
        END $$;
      `);

            // Add industry column
            await client.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'industry') THEN 
            ALTER TABLE clients ADD COLUMN industry text; 
            RAISE NOTICE 'Added industry column';
          END IF; 
        END $$;
      `);

            // Add notes column
            await client.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'notes') THEN 
            ALTER TABLE clients ADD COLUMN notes text; 
            RAISE NOTICE 'Added notes column';
          END IF; 
        END $$;
      `);

            console.log("Migration completed successfully.");
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        // Close the pool to allow the script to exit
        await pool.end();
    }
}

runMigration();
