
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Creating mssql_connections table if not exists...");

    await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mssql_connections (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      server TEXT NOT NULL,
      database TEXT NOT NULL,
      username TEXT NOT NULL,
      password TEXT,
      port INTEGER DEFAULT 1433,
      encrypt BOOLEAN DEFAULT true,
      trust_server_certificate BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

    console.log("Table creation query executed.");
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
