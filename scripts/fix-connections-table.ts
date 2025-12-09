
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking for 'connections' table...");

    try {
        // Check if table exists
        const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'connections'
      );
    `);

        const exists = result.rows[0]?.exists;

        if (exists) {
            console.log("✅ 'connections' table already exists.");
        } else {
            console.log("⚠️ 'connections' table missing. Creating it...");

            await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "connections" (
            "id" serial PRIMARY KEY NOT NULL,
            "type" text DEFAULT 'mssql' NOT NULL,
            "name" text NOT NULL,
            "server" text NOT NULL,
            "database" text,
            "username" text NOT NULL,
            "password" text,
            "private_key" text,
            "port" integer DEFAULT 1433,
            "encrypt" boolean DEFAULT true,
            "trust_server_certificate" boolean DEFAULT true,
            "created_at" timestamp DEFAULT now(),
            "updated_at" timestamp DEFAULT now()
        );
      `);
            console.log("✅ 'connections' table created successfully.");

            // Check for old mssql_connections to help user cleanup
            const oldTableCheck = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'mssql_connections'
          );
      `);
            if (oldTableCheck.rows[0]?.exists) {
                console.warn("ℹ️ Found legacy 'mssql_connections' table. You may want to migrate data manually if needed.");
            }
        }
    } catch (error) {
        console.error("❌ Error fixing database:", error);
        process.exit(1);
    }

    process.exit(0);
}

main();
