#!/usr/bin/env tsx
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

/**
 * Seed default global administrator account
 * Creates admin user with username: administrator, password: Admin123456
 */
export async function seedDefaultAdmin(): Promise<void> {
  try {
    // Check if admin user already exists
    const existingAdmin = await db.execute(sql`
      SELECT id, username, global_role FROM users WHERE username = 'administrator'
    `);

    if (existingAdmin.rows.length > 0) {
      // Admin already exists, verify password is correct
      const userResult = await db.execute(sql`
        SELECT password FROM users WHERE username = 'administrator'
      `);
      
      if (userResult.rows.length > 0) {
        const storedHash = userResult.rows[0].password as string;
        const isValid = await bcrypt.compare('Admin123456', storedHash);
        
        if (!isValid) {
          // Update password if it's incorrect
          console.log("  🔄 Updating administrator password to Admin123456...");
          const newHash = await bcrypt.hash('Admin123456', 10);
          await db.execute(sql`
            UPDATE users 
            SET password = ${newHash}, 
                global_role = 'global_administrator',
                is_active = true
            WHERE username = 'administrator'
          `);
          console.log("  ✅ Administrator password updated");
        }
      }
      return;
    }

    // Create password hash
    console.log("  🔐 Creating default administrator user...");
    const passwordHash = await bcrypt.hash('Admin123456', 10);

    // Create admin user
    await db.execute(sql`
      INSERT INTO users (username, email, password, first_name, last_name, global_role, is_active)
      VALUES (
        'administrator',
        'administrator@multitenant.com',
        ${passwordHash},
        'Global',
        'Administrator',
        'global_administrator',
        true
      )
      ON CONFLICT (username) DO NOTHING
    `);

    console.log("  ✅ Default administrator user created (username: administrator, password: Admin123456)");
  } catch (error: any) {
    // Ignore errors if user already exists or other non-critical errors
    if (!error.message?.includes("duplicate") && !error.message?.includes("unique")) {
      console.error("  ⚠️  Warning: Could not seed default admin:", error.message);
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDefaultAdmin()
    .then(() => {
      console.log("✅ Default admin seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Failed to seed default admin:", error);
      process.exit(1);
    });
}
