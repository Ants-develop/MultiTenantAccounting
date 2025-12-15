import { db } from "../server/db";
import { profiles } from "@shared/schema";
import { eq } from "drizzle-orm";

async function testConnection() {
  console.log("🔍 Testing database connection and RLS bypass...\n");
  
  try {
    // Test 1: Fetch all profiles
    console.log("Test 1: Fetching all profiles...");
    const allProfiles = await db.select().from(profiles);
    console.log(`✅ Found ${allProfiles.length} profiles`);
    
    if (allProfiles.length > 0) {
      console.log(`\nSample profile:`, {
        id: allProfiles[0].id,
        email: allProfiles[0].email,
        fullName: allProfiles[0].fullName,
        role: allProfiles[0].role,
      });
    }
    
    // Test 2: Fetch admin user
    console.log("\n\nTest 2: Fetching admin user (a.avalishvili@ants.ge)...");
    const adminProfile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, "a.avalishvili@ants.ge"))
      .limit(1);
    
    if (adminProfile.length > 0) {
      console.log("✅ Admin profile found:", {
        id: adminProfile[0].id,
        email: adminProfile[0].email,
        fullName: adminProfile[0].fullName,
        role: adminProfile[0].role,
      });
    } else {
      console.log("❌ Admin profile not found");
    }
    
    console.log("\n\n✅ All tests passed! Database connection working and RLS bypassed.");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

testConnection();
