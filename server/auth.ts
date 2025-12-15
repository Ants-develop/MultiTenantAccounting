import { storage } from "./storage";
import { db } from "./db";
import { mainCompanySettings, profiles } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Profile } from "@shared/schema";

export interface AuthenticatedUser {
  id: string; // UUID from Supabase
  username: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  globalRole: string | null;
}

export async function getUserWithCompanies(userId: string) {
  try {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
    
    if (!profile) return null;

    // Get user's companies
    const companies = await storage.getCompaniesByUser(userId);

    // Check if main company is configured
    let mainCompany = null;
    let needsSetup = true;
    try {
      const mainCompanyResult = await db
        .select()
        .from(mainCompanySettings)
        .limit(1);
      
      mainCompany = mainCompanyResult[0] || null;
      needsSetup = !mainCompany || !mainCompany.name;
    } catch (error: any) {
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('Could not query main company settings (table may not exist):', error);
      } else if (error?.code === '42703' || error?.message?.includes('column') || error?.message?.includes('taxId')) {
        console.error('Column name error in main company settings query:', error);
        console.error('This suggests a schema mismatch. Verify the database table matches the Drizzle schema.');
      } else {
        console.error('Error querying main company settings:', error);
      }
      needsSetup = true;
    }

    return {
      user: {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        globalRole: profile.globalRole,
      },
      companies,
      mainCompany: mainCompany,
      needsSetup,
    };
  } catch (error) {
    console.error('Error in getUserWithCompanies:', error);
    throw error;
  }
}

