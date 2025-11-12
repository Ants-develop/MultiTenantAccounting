import bcrypt from "bcrypt";
import { storage } from "./storage";
import { db } from "./db";
import { mainCompanySettings } from "@shared/schema";
import type { User } from "@shared/schema";

export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function authenticateUser(username: string, password: string): Promise<AuthenticatedUser | null> {
  const user = await storage.getUserByUsername(username) || await storage.getUserByEmail(username);
  
  if (!user || !user.isActive) {
    return null;
  }

  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export async function getUserWithCompanies(userId: number) {
  try {
    const user = await storage.getUser(userId);
    if (!user) return null;

    // Check if main company is configured
    let mainCompany = null;
    let needsSetup = true;

    try {
      const mainCompanyResult = await db.select().from(mainCompanySettings).limit(1);
      mainCompany = mainCompanyResult[0] || null;
      // Setup is needed if main company doesn't exist or has no name
      needsSetup = !mainCompany || !mainCompany.name;
    } catch (error) {
      console.warn('Could not query main company settings (table may not exist):', error);
      // If table doesn't exist, setup is definitely needed
      needsSetup = true;
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        globalRole: user.globalRole,
      },
      mainCompany: mainCompany,
      needsSetup,
    };
  } catch (error) {
    console.error('Error in getUserWithCompanies:', error);
    throw error;
  }
}
