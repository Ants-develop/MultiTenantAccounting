#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function check() {
  try {
    const result = await db.execute(sql`SELECT * FROM _migrations ORDER BY version`);
    console.log("Migrations in _migrations table:");
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

check();

