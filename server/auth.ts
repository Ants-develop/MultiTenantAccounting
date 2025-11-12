import bcrypt from "bcrypt";
import { storage } from "./storage";
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
  const user = await storage.getUser(userId);
  if (!user) return null;

  const companies = await storage.getCompaniesByUser(userId);
  const userCompanies = await storage.getUserCompanies(userId);

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      globalRole: user.globalRole,
    },
    companies: companies.map(company => {
      const userCompany = userCompanies.find(uc => uc.companyId === company.id);
      
      let role = userCompany?.role || 'assistant';
      if (user.globalRole === 'global_administrator' && !userCompany) {
        role = 'administrator';
      }
      
      return {
        ...company,
        role: role,
      };
    }),
  };
}
