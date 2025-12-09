
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Verifying mssql_connections table...");
    try {
        const result = await db.execute(sql`SELECT count(*) as count FROM mssql_connections`);
        console.log("Success! Table exists. Row count:", result.rows[0].count);
        process.exit(0);
    } catch (err: any) {
        console.error("Verification failed:", err.message);
        process.exit(1);
    }
}

main();
