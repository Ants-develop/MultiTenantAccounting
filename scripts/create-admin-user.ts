#!/usr/bin/env tsx

// Explicitly load .env file BEFORE importing db.ts
// This ensures DATABASE_URL is available when db.ts initializes
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
const envPath = resolve(process.cwd(), '.env');
const result = config({ path: envPath });
if (result.error && !process.env.DATABASE_URL) {
  console.warn(`⚠️  Could not load .env from ${envPath}: ${result.error.message}`);
} else if (process.env.DATABASE_URL) {
  const urlParts = process.env.DATABASE_URL.split('@');
  const dbInfo = urlParts.length > 1 ? `@${urlParts[1]}` : 'database';
  console.log(`📝 Loaded DATABASE_URL from .env: ${dbInfo}`);
}

// Now import db - it will use the DATABASE_URL we just loaded
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

async function createAdminUser(force: boolean = false) {
  console.log("👤 Creating Administrator User with Proper Password Hashing...\n");

  try {
    // Verify database connection first
    console.log("🔌 Verifying database connection...");
    try {
      await db.execute(sql`SELECT 1`);
      console.log("   ✅ Database connection successful");
      
      // Show which database we're connected to
      if (process.env.DATABASE_URL) {
        const urlParts = process.env.DATABASE_URL.split('@');
        const dbInfo = urlParts.length > 1 ? `@${urlParts[1]}` : 'database';
        console.log(`   📊 Connected to: ${dbInfo}`);
      }
    } catch (dbError: any) {
      console.error("   ❌ Database connection failed!");
      console.error("   Error:", dbError.message);
      console.error("   Code:", dbError.code);
      if (process.env.DATABASE_URL) {
        const urlParts = process.env.DATABASE_URL.split('@');
        const dbInfo = urlParts.length > 1 ? `@${urlParts[1]}` : 'database';
        console.error(`   DATABASE_URL: ${dbInfo}`);
      } else {
        console.error("   ⚠️  DATABASE_URL environment variable not set!");
      }
      throw dbError;
    }

    // Check if users table exists
    console.log("🔍 Checking if users table exists...");
    try {
      await db.execute(sql`SELECT 1 FROM users LIMIT 1`);
      console.log("   ✅ Users table exists");
    } catch (tableError: any) {
      if (tableError.message?.includes('does not exist') || tableError.code === '42P01') {
        console.error("   ❌ Users table does not exist!");
        console.error("   💡 Please run migrations first: npm run db:migrate");
        throw new Error("Users table does not exist. Run migrations first.");
      }
      throw tableError;
    }

    // Check if admin user already exists
    console.log("🔍 Checking for existing administrator user...");
    const existingAdmin = await db.execute(sql`
      SELECT username, global_role FROM users WHERE username = 'admin'
    `);

    if (existingAdmin.rows.length > 0 && !force) {
      console.log("   ⚠️  Administrator user already exists!");
      console.log(`   👤 Username: ${existingAdmin.rows[0].username}`);
      console.log(`   🔑 Role: ${existingAdmin.rows[0].global_role}`);
      console.log("   💡 Use --force flag to update existing user");
      
      // Test the password
      console.log("\n🧪 Testing current administrator password...");
      const userResult = await db.execute(sql`
        SELECT password FROM users WHERE username = 'admin'
      `);
      
      if (userResult.rows.length > 0) {
        const storedHash = userResult.rows[0].password as string;
        const isValid = await bcrypt.compare('asQW12ZX12!!', storedHash);
        
        if (isValid) {
          console.log("   ✅ Password works correctly!");
          return;
        } else {
          console.log("   ❌ Password doesn't work!");
          console.log("   🔄 Updating password hash...");
          
          const newHash = await bcrypt.hash('asQW12ZX12!!', 10);
          await db.execute(sql`
            UPDATE users SET password = ${newHash} WHERE username = 'admin'
          `);
          console.log("   ✅ Password updated successfully!");
        }
      }
      return;
    }

    // If force is true and user exists, update it
    if (existingAdmin.rows.length > 0 && force) {
      console.log("   🔄 Force mode: Updating existing administrator user...");
      const passwordHash = await bcrypt.hash('asQW12ZX12!!', 10);
      await db.execute(sql`
        UPDATE users 
        SET password = ${passwordHash},
            email = 'admin@multitenant.com',
            first_name = 'Global',
            last_name = 'Administrator',
            global_role = 'global_administrator',
            is_active = true
        WHERE username = 'admin'
      `);
      console.log("   ✅ Administrator user updated successfully!");
      
      // Verify the update
      const verifyResult = await db.execute(sql`
        SELECT id, username, email, first_name, last_name, global_role, is_active
        FROM users WHERE username = 'admin'
      `);
      
      if (verifyResult.rows.length > 0) {
        const admin = verifyResult.rows[0];
        console.log("   ✅ Admin user verified:");
        console.log(`      ID: ${admin.id}`);
        console.log(`      Username: ${admin.username}`);
        console.log(`      Email: ${admin.email}`);
        console.log(`      Name: ${admin.first_name} ${admin.last_name}`);
        console.log(`      Role: ${admin.global_role}`);
        console.log(`      Active: ${admin.is_active}`);
      }
      return;
    }

    // Create proper password hash
    console.log("🔐 Generating secure password hash...");
    const passwordHash = await bcrypt.hash('asQW12ZX12!!', 10);
    console.log(`   Generated hash: ${passwordHash.substring(0, 20)}...`);

    // Create admin user
    console.log("\n👤 Creating administrator user...");
    await db.execute(sql`
      INSERT INTO users (username, email, password, first_name, last_name, global_role, is_active)
      VALUES (
        'admin',
        'admin@multitenant.com',
        ${passwordHash},
        'Global',
        'Administrator', 
        'global_administrator',
        true
      )
    `);
    console.log("   ✅ Administrator user created successfully!");

    // Verify the user was created
    console.log("\n🔍 Verifying administrator user...");
    const verifyResult = await db.execute(sql`
      SELECT id, username, email, first_name, last_name, global_role, is_active
      FROM users WHERE username = 'admin'
    `);

    if (verifyResult.rows.length > 0) {
      const admin = verifyResult.rows[0];
      console.log("   ✅ Admin user verified:");
      console.log(`      ID: ${admin.id}`);
      console.log(`      Username: ${admin.username}`);
      console.log(`      Email: ${admin.email}`);
      console.log(`      Name: ${admin.first_name} ${admin.last_name}`);
      console.log(`      Role: ${admin.global_role}`);
      console.log(`      Active: ${admin.is_active}`);

      // Test login
      console.log("\n🧪 Testing login credentials...");
      const loginTest = await db.execute(sql`
        SELECT password FROM users WHERE username = 'admin'
      `);
      
      if (loginTest.rows.length > 0) {
        const isValid = await bcrypt.compare('asQW12ZX12!!', loginTest.rows[0].password as string);
        if (isValid) {
          console.log("   ✅ Login test successful!");
          console.log("   🎯 Credentials: admin / asQW12ZX12!!");
        } else {
          console.log("   ❌ Login test failed!");
        }
      }
    }

  } catch (error: any) {
    console.error("❌ Failed to create admin user:");
    console.error("   Error:", error.message);
    console.error("   Code:", error.code);
    if (error.detail) {
      console.error("   Detail:", error.detail);
    }
    if (error.hint) {
      console.error("   Hint:", error.hint);
    }
    console.error("\n💡 Troubleshooting:");
    console.error("   1. Check that DATABASE_URL is set correctly in .env file");
    console.error("   2. Verify database is accessible");
    console.error("   3. Ensure migrations have been run: npm run db:migrate");
    throw error;
  }
}

// Also create other users with correct hashes
async function createAllUsers(force: boolean = false) {
  console.log("\n👥 Creating All Sample Users...\n");

  const users = [
    {
      username: 'manager',
      email: 'manager@acme.com',
      password: 'manager123',
      firstName: 'John',
      lastName: 'Manager',
      globalRole: 'user'
    },
    {
      username: 'accountant', 
      email: 'accountant@techstart.com',
      password: 'accountant123',
      firstName: 'Sarah',
      lastName: 'Accountant',
      globalRole: 'user'
    },
    {
      username: 'assistant',
      email: 'assistant@globalconsulting.com',
      password: 'assistant123',
      firstName: 'Mike',
      lastName: 'Assistant',
      globalRole: 'user'
    }
  ];

  for (const user of users) {
    try {
      // Check if user exists
      const existing = await db.execute(sql`
        SELECT username FROM users WHERE username = ${user.username}
      `);

      if (existing.rows.length > 0 && !force) {
        console.log(`   ⚠️  User ${user.username} already exists, skipping...`);
        continue;
      }

      // If force is true and user exists, update it
      if (existing.rows.length > 0 && force) {
        console.log(`   🔄 Force mode: Updating user ${user.username}...`);
        const passwordHash = await bcrypt.hash(user.password, 10);
        await db.execute(sql`
          UPDATE users 
          SET email = ${user.email},
              password = ${passwordHash},
              first_name = ${user.firstName},
              last_name = ${user.lastName},
              global_role = ${user.globalRole},
              is_active = true
          WHERE username = ${user.username}
        `);
        console.log(`   ✅ Updated user: ${user.username} / ${user.password}`);
        continue;
      }

      // Create password hash
      const passwordHash = await bcrypt.hash(user.password, 10);

      // Create user
      await db.execute(sql`
        INSERT INTO users (username, email, password, first_name, last_name, global_role, is_active)
        VALUES (
          ${user.username},
          ${user.email},
          ${passwordHash},
          ${user.firstName},
          ${user.lastName},
          ${user.globalRole},
          true
        )
      `);

      console.log(`   ✅ Created user: ${user.username} / ${user.password}`);

    } catch (error) {
      console.log(`   ❌ Failed to create user ${user.username}:`, error);
    }
  }
}

// Run the script
// Check for --force flag
const force = process.argv.includes('--force') || process.argv.includes('-f');

if (force) {
  console.log("🔄 Force mode enabled - will update existing users\n");
}

// Always run if this is the main execution
Promise.resolve()
  .then(() => createAdminUser(force))
  .then(() => createAllUsers(force))
  .then(() => {
    console.log("\n🎉 All users created/updated successfully!");
    console.log("\n📋 Login Credentials:");
    console.log("==================");
    console.log("• Global Administrator: admin / asQW12ZX12!!");
    console.log("• Manager: manager / manager123"); 
    console.log("• Accountant: accountant / accountant123");
    console.log("• Assistant: assistant / assistant123");
    console.log("\n✨ Ready to login!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to create users:", error);
    process.exit(1);
  });

export { createAdminUser, createAllUsers }; 