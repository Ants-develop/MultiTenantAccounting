#!/usr/bin/env tsx
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function createAccountsTable() {
  console.log("🔧 Creating accounting.accounts table...\n");

  try {
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS accounting.accounts (
        id serial PRIMARY KEY NOT NULL,
        client_id integer NOT NULL,
        code text NOT NULL,
        name text NOT NULL,
        type text NOT NULL,
        sub_type text,
        parent_id integer,
        account_class text,
        category text,
        is_subaccount_allowed boolean DEFAULT false,
        is_foreign_currency boolean DEFAULT false,
        is_analytical boolean DEFAULT false,
        is_active boolean DEFAULT true,
        created_at timestamp DEFAULT now()
      )
    `));
    console.log("✓ Created accounting.accounts table");

    // Add foreign key constraint
    await db.execute(sql.raw(`
      ALTER TABLE accounting.accounts 
      ADD CONSTRAINT IF NOT EXISTS accounts_client_id_clients_id_fk 
      FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE NO ACTION ON UPDATE NO ACTION
    `));
    console.log("✓ Added foreign key constraint");

    // Add indexes
    await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS idx_accounts_client_id ON accounting.accounts(client_id)`));
    await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS idx_accounts_parent_id ON accounting.accounts(parent_id)`));
    await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounting.accounts(type)`));
    await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounting.accounts(code)`));
    console.log("✓ Created indexes");

    console.log("\n✅ accounting.accounts table created successfully!");
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log("⊘ Table already exists");
    } else {
      console.error("❌ Error:", error.message);
    }
  }
}

createAccountsTable();



