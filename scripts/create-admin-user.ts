#!/usr/bin/env tsx

/**
 * Create Admin User Script for Supabase Auth
 * 
 * AUTH FLOW EXPLANATION:
 * ======================
 * 
 * 1. USER CREATION:
 *    - Users are created in Supabase Auth (auth.users table) via Admin API
 *    - supabaseAdmin.auth.admin.createUser() creates the auth user
 *    - Password is hashed and stored securely by Supabase (bcrypt internally)
 *    - A trigger (handle_new_user) automatically creates a profile in profiles table
 * 
 * 2. PROFILE CREATION:
 *    - profiles table has FK to auth.users(id) ON DELETE CASCADE
 *    - Contains additional user metadata (username, first_name, last_name, globalRole)
 *    - profile.id = auth.user.id (same UUID)
 * 
 * 3. AUTHENTICATION FLOW:
 *    a) Client sends credentials to /api/auth/login
 *    b) Server calls supabase.auth.signInWithPassword()
 *    c) Supabase validates password and returns JWT token
 *    d) Client stores JWT and sends it in Authorization header
 *    e) requireAuth middleware validates JWT via supabase.auth.getUser()
 *    f) User profile is fetched from profiles table for additional data
 * 
 * 4. PASSWORD RESET:
 *    - Uses Supabase's built-in password reset flow
 *    - supabase.auth.resetPasswordForEmail() sends reset email
 *    - User clicks link and sets new password via Supabase UI
 * 
 * 5. SECURITY:
 *    - Passwords never stored in plaintext
 *    - JWT tokens expire and can be refreshed
 *    - RLS policies on profiles table protect user data
 *    - Service role key required for admin operations
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
const envPath = resolve(process.cwd(), '.env');
const result = config({ path: envPath });
if (result.error && !process.env.DATABASE_URL) {
  console.warn(`⚠️  Could not load .env from ${envPath}: ${result.error.message}`);
}

// Import Supabase Admin client and database
import { supabaseAdmin } from "../server/supabase";
import { db } from "../server/db";
import { profiles } from "@shared/schema";
import { eq } from "drizzle-orm";

async function createAdminUser(force: boolean = false) {
  console.log("👤 Creating Administrator User in Supabase Auth...\n");

  const adminEmail = 'a.avalishvili@ants.ge';
  const adminPassword = 'asQW12ZX12!!';
  const adminUsername = 'admin';

  try {
    // Verify Supabase connection
    console.log("🔌 Verifying Supabase connection...");
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env");
    }
    console.log(`   ✅ Supabase URL: ${process.env.SUPABASE_URL}`);

    // Check if user already exists in profiles
    console.log("🔍 Checking for existing administrator...");
    const existingProfiles = await db
      .select()
      .from(profiles)
      .where(eq(profiles.username, adminUsername))
      .limit(1);

    if (existingProfiles.length > 0 && !force) {
      const profile = existingProfiles[0];
      console.log("   ⚠️  Administrator already exists!");
      console.log(`   👤 Username: ${profile.username}`);
      console.log(`   📧 Email: ${profile.email}`);
      console.log(`   🔑 Role: ${profile.globalRole}`);
      console.log(`   🆔 ID: ${profile.id}`);
      console.log("\n   💡 Use --force flag to delete and recreate user");
      return profile;
    }

    // If force mode and user exists, delete first
    if (existingProfiles.length > 0 && force) {
      const existingId = existingProfiles[0].id;
      console.log(`   🔄 Force mode: Deleting existing user ${existingId}...`);
      
      // Delete from Supabase Auth (profile will cascade delete)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingId);
      if (deleteError) {
        console.warn(`   ⚠️  Could not delete from Supabase Auth: ${deleteError.message}`);
        // Try to delete profile directly
        await db.delete(profiles).where(eq(profiles.id, existingId));
      }
      console.log("   ✅ Existing user deleted");
    }

    // Create user in Supabase Auth
    console.log("\n🔐 Creating user in Supabase Auth...");
    console.log(`   📧 Email: ${adminEmail}`);
    console.log(`   👤 Username: ${adminUsername}`);
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: adminUsername,
        first_name: 'Avtandil',
        last_name: 'Avalishvili'
      }
    });

    if (authError) {
      console.error("   ❌ Supabase Auth error:", authError.message);
      throw authError;
    }

    if (!authData.user) {
      throw new Error("Failed to create user in Supabase Auth");
    }

    console.log(`   ✅ User created in Supabase Auth`);
    console.log(`   🆔 Auth ID: ${authData.user.id}`);

    // Create profile (this should happen automatically via trigger, but we do it explicitly)
    console.log("\n👤 Creating user profile...");
    const [createdProfile] = await db
      .insert(profiles)
      .values({
        id: authData.user.id,
        username: adminUsername,
        email: adminEmail,
        firstName: 'Avtandil',
        lastName: 'Avalishvili',
        fullName: 'Avtandil Avalishvili',
        globalRole: 'global_administrator',
        isActive: true,
      })
      .returning()
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          username: adminUsername,
          email: adminEmail,
          firstName: 'Avtandil',
          lastName: 'Avalishvili',
          fullName: 'Avtandil Avalishvili',
          globalRole: 'global_administrator',
          isActive: true,
        }
      });

    console.log("   ✅ Profile created successfully!");
    console.log(`   🆔 Profile ID: ${createdProfile.id}`);
    console.log(`   👤 Username: ${createdProfile.username}`);
    console.log(`   📧 Email: ${createdProfile.email}`);
    console.log(`   🔑 Role: ${createdProfile.globalRole}`);
    console.log(`   ✅ Active: ${createdProfile.isActive}`);

    return createdProfile;

  } catch (error: any) {
    console.error("\n❌ Failed to create admin user:");
    console.error("   Error:", error.message);
    if (error.code) {
      console.error("   Code:", error.code);
    }
    if (error.details) {
      console.error("   Details:", error.details);
    }
    if (error.hint) {
      console.error("   Hint:", error.hint);
    }
    console.error("\n💡 Troubleshooting:");
    console.error("   1. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
    console.error("   2. Verify migrations have been run: npm run db:reset");
    console.error("   3. Check Supabase dashboard for auth errors");
    throw error;
  }
}

// Create additional sample users
async function createAllUsers(force: boolean = false) {
  console.log("\n👥 Creating Sample Users in Supabase Auth...\n");

  const users = [
    {
      username: 'manager',
      email: 'manager@ants.ge',
      password: 'manager123',
      firstName: 'John',
      lastName: 'Manager',
      globalRole: 'user'
    },
    {
      username: 'accountant', 
      email: 'accountant@ants.ge',
      password: 'accountant123',
      firstName: 'Sarah',
      lastName: 'Accountant',
      globalRole: 'user'
    },
    {
      username: 'assistant',
      email: 'assistant@ants.ge',
      password: 'assistant123',
      firstName: 'Mike',
      lastName: 'Assistant',
      globalRole: 'user'
    }
  ];

  for (const user of users) {
    try {
      console.log(`📝 Processing ${user.username}...`);

      // Check if user exists
      const existingProfiles = await db
        .select()
        .from(profiles)
        .where(eq(profiles.username, user.username))
        .limit(1);

      if (existingProfiles.length > 0 && !force) {
        console.log(`   ⚠️  User ${user.username} already exists, skipping...`);
        continue;
      }

      // If force mode and user exists, delete first
      if (existingProfiles.length > 0 && force) {
        const existingId = existingProfiles[0].id;
        console.log(`   🔄 Force mode: Deleting existing user...`);
        
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingId);
        if (deleteError) {
          console.warn(`   ⚠️  Could not delete from Supabase Auth: ${deleteError.message}`);
          await db.delete(profiles).where(eq(profiles.id, existingId));
        }
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          username: user.username,
          first_name: user.firstName,
          last_name: user.lastName
        }
      });

      if (authError) {
        console.log(`   ❌ Failed to create ${user.username}: ${authError.message}`);
        continue;
      }

      if (!authData.user) {
        console.log(`   ❌ Failed to create ${user.username}: No user returned`);
        continue;
      }

      // Create profile
      await db
        .insert(profiles)
        .values({
          id: authData.user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          globalRole: user.globalRole,
          isActive: true,
        })
        .onConflictDoNothing();

      console.log(`   ✅ Created: ${user.username} / ${user.password}`);

    } catch (error: any) {
      console.log(`   ❌ Failed to create user ${user.username}:`, error.message);
    }
  }
}

// Run the script
const force = process.argv.includes('--force') || process.argv.includes('-f');

if (force) {
  console.log("🔄 Force mode enabled - will update existing users\n");
}

Promise.resolve()
  .then(() => createAdminUser(force))
  .then(() => createAllUsers(force))
  .then(() => {
    console.log("\n" + "=".repeat(70));
    console.log("🎉 All users created/updated successfully!");
    console.log("=".repeat(70));
    console.log("\n📋 Login Credentials:");
    console.log("━".repeat(70));
    console.log("• Global Administrator:");
    console.log("  Email: a.avalishvili@ants.ge");
    console.log("  Password: asQW12ZX12!!");
    console.log("  Role: global_administrator");
    console.log("");
    console.log("• Manager: manager@ants.ge / manager123"); 
    console.log("• Accountant: accountant@ants.ge / accountant123");
    console.log("• Assistant: assistant@ants.ge / assistant123");
    console.log("━".repeat(70));
    console.log("\n🔐 Authentication Flow:");
    console.log("  1. User enters email/password on login page");
    console.log("  2. Client calls /api/auth/login endpoint");
    console.log("  3. Server validates via Supabase Auth");
    console.log("  4. JWT token returned to client");
    console.log("  5. Client includes token in Authorization header");
    console.log("  6. Server validates token on each request");
    console.log("\n✨ Ready to login at http://localhost:4000");
    console.log("=".repeat(70));
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed to create users:", error.message);
    process.exit(1);
  });

export { createAdminUser, createAllUsers };
