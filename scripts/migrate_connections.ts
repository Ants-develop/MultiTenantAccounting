
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Migrating database...");

    try {
        // Check if mssql_connections exists
        const mssqlExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'mssql_connections'
      );
    `);

        // Create new connections table
        console.log("Creating connections table...");
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "connections" (
        "id" serial PRIMARY KEY,
        "type" text NOT NULL DEFAULT 'mssql',
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

        // If existing mssql_connections, migrate data (optional, but good practice)
        if (mssqlExists.rows[0].exists) {
            console.log("Migrating data from mssql_connections to connections...");
            await db.execute(sql`
            INSERT INTO "connections" (
                "type", "name", "server", "database", "username", "password", "port", "encrypt", "trust_server_certificate", "created_at", "updated_at"
            )
            SELECT 
                'mssql', "name", "server", "database", "username", "password", "port", "encrypt", "trust_server_certificate", "created_at", "updated_at"
            FROM "mssql_connections";
        `);
            // Drop old table? Maybe keep for safety or rename. 
            // For now, let's keep it but ideally we should drop it.
            // await db.execute(sql`DROP TABLE "mssql_connections"`);
        }

        console.log("Migration successful!");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        process.exit(0);
    }
}

main();
