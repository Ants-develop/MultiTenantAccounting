import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Cleaning up tasks schema tables...");

    try {
        await db.execute(sql`DROP TABLE IF EXISTS "tasks"."task_dependencies" CASCADE`);
        await db.execute(sql`DROP TABLE IF EXISTS "tasks"."task_checklists" CASCADE`);
        await db.execute(sql`DROP TABLE IF EXISTS "tasks"."task_comments" CASCADE`);
        await db.execute(sql`DROP TABLE IF EXISTS "tasks"."task_attachments" CASCADE`);
        await db.execute(sql`DROP TABLE IF EXISTS "tasks"."tasks" CASCADE`);
        await db.execute(sql`DROP TABLE IF EXISTS "tasks"."task_templates" CASCADE`);

        console.log("Successfully cleaned up tasks schema tables.");
    } catch (error) {
        console.error("Error cleaning up tables:", error);
        process.exit(1);
    }

    process.exit(0);
}

main();
