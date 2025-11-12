import { 
  users, companies, userCompanies, accounts, journalEntries, journalEntryLines,
  customers, vendors, invoices, bills, activityLogs, companySettings,
  type User, type InsertUser, type Company, type InsertCompany,
  type UserCompany, type InsertUserCompany, type Account, type InsertAccount,
  type JournalEntry, type InsertJournalEntry, type JournalEntryLine, type InsertJournalEntryLine,
  type Customer, type InsertCustomer, type Vendor, type InsertVendor,
  type Invoice, type InsertInvoice, type Bill, type InsertBill,
  type CompanySettings, type InsertCompanySettings, type ActivityLog
} from "@shared/schema";

// Global admin types
interface GlobalUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  lastLogin: string | null;
  companiesCount: number;
}
import { db } from "./db";
import { eq, and, or, desc, asc, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Company methods
  getCompany(id: number): Promise<Company | undefined>;
  getCompaniesByUser(userId: number): Promise<Company[]>;
  getAllCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined>;

  // User-Company methods
  getUserCompany(userId: number, companyId: number): Promise<UserCompany | undefined>;
  getUserCompanies(userId: number): Promise<UserCompany[]>;
  createUserCompany(userCompany: InsertUserCompany): Promise<UserCompany>;
  updateUserCompany(id: number, userCompany: Partial<InsertUserCompany>): Promise<UserCompany | undefined>;

  // Account methods
  getAccount(id: number): Promise<Account | undefined>;
  getAccountsByCompany(companyId: number): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account | undefined>;

  // Journal Entry methods
  getJournalEntry(id: number): Promise<JournalEntry | undefined>;
  getJournalEntriesByCompany(companyId: number): Promise<any[]>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: number, entry: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined>;

  // Journal Entry Line methods
  getJournalEntryLinesByEntry(entryId: number): Promise<JournalEntryLine[]>;
  createJournalEntryLine(line: InsertJournalEntryLine): Promise<JournalEntryLine>;

  // Customer methods
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomersByCompany(companyId: number): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;

  // Vendor methods
  getVendor(id: number): Promise<Vendor | undefined>;
  getVendorsByCompany(companyId: number): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;

  // Invoice methods
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoicesByCompany(companyId: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;

  // Bill methods
  getBill(id: number): Promise<Bill | undefined>;
  getBillsByCompany(companyId: number): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, bill: Partial<InsertBill>): Promise<Bill | undefined>;

  // Global admin methods
  getAllCompanies(): Promise<Company[]>;
  getAllCompaniesWithStats(): Promise<Company[]>;
  getAllUsers(): Promise<User[]>;
  getAllUsersWithStats(): Promise<GlobalUser[]>;
  getTransactionCount(): Promise<number>;
  companyHasData(companyId: number): Promise<boolean>;
  getActivityLogs(limit: number): Promise<ActivityLog[]>;
  logActivity(userId: number, action: string, resource: string, details?: string, ipAddress?: string, companyId?: number): Promise<void>;

  // Company Settings methods
  getCompanySettings(companyId: number): Promise<CompanySettings | undefined>;
  createCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings>;
  updateCompanySettings(companyId: number, settings: Partial<InsertCompanySettings>): Promise<CompanySettings | undefined>;

  // Delete user with proper cascade handling
  deleteUser(userId: number): Promise<boolean>;

  // Delete company with proper cascade handling
  deleteCompany(companyId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updateUser).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  // Company methods
  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async getCompaniesByUser(userId: number): Promise<Company[]> {
    // First check if user is a global administrator
    const user = await this.getUser(userId);
    if (user?.globalRole === 'global_administrator') {
      // Global admins see ALL companies
      return await this.getAllCompanies();
    }

    // Regular users see only assigned companies
    const userCompaniesData = await db
      .select({ company: companies })
      .from(userCompanies)
      .innerJoin(companies, eq(userCompanies.companyId, companies.id))
      .where(and(eq(userCompanies.userId, userId), eq(userCompanies.isActive, true)));
    
    return userCompaniesData.map(uc => uc.company);
  }

  async getAllCompanies(): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .where(eq(companies.isActive, true))
      .orderBy(asc(companies.name));
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(insertCompany).returning();
    return company;
  }

  async updateCompany(id: number, updateCompany: Partial<InsertCompany>): Promise<Company | undefined> {
    const [company] = await db.update(companies).set(updateCompany).where(eq(companies.id, id)).returning();
    return company || undefined;
  }



  // User-Company methods
  async getUserCompany(userId: number, companyId: number): Promise<UserCompany | undefined> {
    // First check if user is a global administrator
    const user = await this.getUser(userId);
    if (user?.globalRole === 'global_administrator') {
      // Global admins have access to all companies
      // Return a mock UserCompany object for global admins
      return {
        id: 0, // Special ID for global admin access
        userId: userId,
        companyId: companyId,
        role: 'global_administrator',
        isActive: true,
        createdAt: new Date()
      } as UserCompany;
    }

    // Regular users - check actual user-company relationship
    const [userCompany] = await db
      .select()
      .from(userCompanies)
      .where(and(
        eq(userCompanies.userId, userId), 
        eq(userCompanies.companyId, companyId),
        eq(userCompanies.isActive, true) // Only active relationships
      ));
    return userCompany || undefined;
  }

  async getUserCompanies(userId: number): Promise<UserCompany[]> {
    // First check if user is a global administrator
    const user = await this.getUser(userId);
    if (user?.globalRole === 'global_administrator') {
      // Global admins see all companies
      const allCompanies = await this.getAllCompanies();
      return allCompanies.map(company => ({
        id: 0, // Special ID for global admin access
        userId: userId,
        companyId: company.id,
        role: 'global_administrator',
        isActive: true,
        createdAt: new Date()
      } as UserCompany));
    }

    // Regular users - return only assigned companies
    return await db
      .select()
      .from(userCompanies)
      .where(and(eq(userCompanies.userId, userId), eq(userCompanies.isActive, true)));
  }

  async createUserCompany(insertUserCompany: InsertUserCompany): Promise<UserCompany> {
    const [userCompany] = await db.insert(userCompanies).values(insertUserCompany).returning();
    return userCompany;
  }

  async updateUserCompany(id: number, updateUserCompany: Partial<InsertUserCompany>): Promise<UserCompany | undefined> {
    const [userCompany] = await db.update(userCompanies).set(updateUserCompany).where(eq(userCompanies.id, id)).returning();
    return userCompany || undefined;
  }

  // Account methods
  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async getAccountsByCompany(companyId: number): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.companyId, companyId), eq(accounts.isActive, true)))
      .orderBy(asc(accounts.code));
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const [account] = await db.insert(accounts).values(insertAccount).returning();
    return account;
  }

  async updateAccount(id: number, updateAccount: Partial<InsertAccount>): Promise<Account | undefined> {
    const [account] = await db.update(accounts).set(updateAccount).where(eq(accounts.id, id)).returning();
    return account || undefined;
  }

  // Journal Entry methods
  async getJournalEntry(id: number): Promise<JournalEntry | undefined> {
    const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, id));
    return entry || undefined;
  }

  async getJournalEntriesByCompany(companyId: number): Promise<any[]> {
    // First get the company to check its tenantCode
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    
    if (!company) {
      return [];
    }
    
    // Filter by companyId OR by matching tenantCode if company has one
    let entries;
    if (company.tenantCode) {
      entries = await db
        .select()
        .from(journalEntries)
        .where(
          or(
            eq(journalEntries.companyId, companyId),
            eq(journalEntries.tenantCode, company.tenantCode)
          )
        )
        .orderBy(desc(journalEntries.date));
    } else {
      entries = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.companyId, companyId))
        .orderBy(desc(journalEntries.date));
    }
    
    // Fetch line items for each entry
    const entriesWithLines = await Promise.all(
      entries.map(async (entry) => {
        const lines = await db
          .select()
          .from(journalEntryLines)
          .where(eq(journalEntryLines.journalEntryId, entry.id))
          .orderBy(asc(journalEntryLines.id));
        return {
          ...entry,
          lines: lines || []
        };
      })
    );
    
    return entriesWithLines;
  }

  async createJournalEntry(insertEntry: InsertJournalEntry): Promise<JournalEntry> {
    const [entry] = await db.insert(journalEntries).values(insertEntry).returning();
    return entry;
  }

  async updateJournalEntry(id: number, updateEntry: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const [entry] = await db.update(journalEntries).set(updateEntry).where(eq(journalEntries.id, id)).returning();
    return entry || undefined;
  }

  // Journal Entry Line methods
  async getJournalEntryLinesByEntry(entryId: number): Promise<JournalEntryLine[]> {
    return await db
      .select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, entryId));
  }

  async createJournalEntryLine(insertLine: InsertJournalEntryLine): Promise<JournalEntryLine> {
    const [line] = await db.insert(journalEntryLines).values(insertLine).returning();
    return line;
  }

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomersByCompany(companyId: number): Promise<Customer[]> {
    return await db
      .select()
      .from(customers)
      .where(and(eq(customers.companyId, companyId), eq(customers.isActive, true)))
      .orderBy(asc(customers.name));
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  async updateCustomer(id: number, updateCustomer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [customer] = await db.update(customers).set(updateCustomer).where(eq(customers.id, id)).returning();
    return customer || undefined;
  }

  // Vendor methods
  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async getVendorsByCompany(companyId: number): Promise<Vendor[]> {
    return await db.select().from(vendors).where(eq(vendors.companyId, companyId));
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [newVendor] = await db.insert(vendors).values(vendor).returning();
    if (!newVendor) {
      throw new Error('Failed to create vendor');
    }
    return newVendor;
  }

  async updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [updatedVendor] = await db.update(vendors).set(vendor).where(eq(vendors.id, id)).returning();
    return updatedVendor;
  }

  // Invoice methods
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getInvoicesByCompany(companyId: number): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.companyId, companyId))
      .orderBy(desc(invoices.date));
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(insertInvoice).returning();
    return invoice;
  }

  async updateInvoice(id: number, updateInvoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [invoice] = await db.update(invoices).set(updateInvoice).where(eq(invoices.id, id)).returning();
    return invoice || undefined;
  }

  // Bill methods
  async getBill(id: number): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill;
  }

  async getBillsByCompany(companyId: number): Promise<Bill[]> {
    return await db.select().from(bills).where(eq(bills.companyId, companyId));
  }

  async createBill(bill: InsertBill): Promise<Bill> {
    const [newBill] = await db.insert(bills).values(bill).returning();
    if (!newBill) {
      throw new Error('Failed to create bill');
    }
    return newBill;
  }

  async updateBill(id: number, bill: Partial<InsertBill>): Promise<Bill | undefined> {
    const [updatedBill] = await db.update(bills).set(bill).where(eq(bills.id, id)).returning();
    return updatedBill;
  }

  // Global admin methods
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.username));
  }

  async getAllUsersWithStats(): Promise<GlobalUser[]> {
    const usersWithStats = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        globalRole: users.globalRole,
        isActive: users.isActive,
        createdAt: users.createdAt,
        companiesCount: sql<number>`COUNT(DISTINCT ${userCompanies.companyId})`,
      })
      .from(users)
      .leftJoin(userCompanies, eq(users.id, userCompanies.userId))
      .groupBy(users.id)
      .orderBy(asc(users.username));

    return usersWithStats.map(user => ({
      ...user,
      lastLogin: null, // TODO: Add lastLogin field to users table
      companiesCount: user.companiesCount || 0,
    }));
  }

  async getTransactionCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(journalEntries);
    return result?.count || 0;
  }

  async companyHasData(companyId: number): Promise<boolean> {
    // Check if company has any accounts, transactions, etc.
    const [accountResults, journalEntryResults] = await Promise.all([
      db.select().from(accounts).where(eq(accounts.companyId, companyId)).limit(1),
      db.select().from(journalEntries).where(eq(journalEntries.companyId, companyId)).limit(1),
    ]);

    return accountResults.length > 0 || journalEntryResults.length > 0;
  }

  async getActivityLogs(limit: number): Promise<ActivityLog[]> {
    // Fetch real activity logs from database
    const logs = await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
    
    return logs;
  }

  async logActivity(
    userId: number,
    action: string,
    resource: string,
    details?: string,
    ipAddress?: string,
    companyId?: number
  ): Promise<void> {
    try {
      await db.insert(activityLogs).values({
        userId,
        companyId: companyId || null,
        action,
        resource,
        resourceId: null, // Can be set by caller if needed
        details: details || null,
        ipAddress: ipAddress || null,
        userAgent: null, // Can be set by caller if needed
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw error to avoid breaking main operations
    }
  }

  // Company Settings methods
  async getCompanySettings(companyId: number): Promise<CompanySettings | undefined> {
    const [settings] = await db.select().from(companySettings).where(eq(companySettings.clientId, companyId));
    return settings || undefined;
  }

  async createCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings> {
    const [newSettings] = await db.insert(companySettings).values(settings).returning();
    return newSettings;
  }

  async updateCompanySettings(companyId: number, settings: Partial<InsertCompanySettings>): Promise<CompanySettings | undefined> {
    const [updatedSettings] = await db.update(companySettings).set(settings).where(eq(companySettings.clientId, companyId)).returning();
    return updatedSettings || undefined;
  }

  // Delete user with proper cascade handling
  async deleteUser(userId: number): Promise<boolean> {
    try {
      await db.transaction(async (tx) => {
        // Check if user exists
        const userResult = await tx
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        
        if (userResult.length === 0) {
          throw new Error('User not found');
        }

        // Delete user-company relationships
        await tx
          .delete(userCompanies)
          .where(eq(userCompanies.userId, userId));

        // Delete activity logs where this user was the actor
        await tx
          .delete(activityLogs)
          .where(eq(activityLogs.userId, userId));

        // Update journal entries to remove user reference (set to null)
        await tx
          .update(journalEntries)
          .set({ userId: null })
          .where(eq(journalEntries.userId, userId));

        // Update invoices to remove user reference
        await tx
          .update(invoices)
          .set({ userId: null })
          .where(eq(invoices.userId, userId));

        // Update bills to remove user reference
        await tx
          .update(bills)
          .set({ userId: null })
          .where(eq(bills.userId, userId));

        // Finally delete the user
        await tx
          .delete(users)
          .where(eq(users.id, userId));
      });

      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  }

  // Delete company with proper cascade handling
  async deleteCompany(companyId: number): Promise<boolean> {
    try {
      await db.transaction(async (tx) => {
        // Check if company exists
        const companyResult = await tx
          .select()
          .from(companies)
          .where(eq(companies.id, companyId))
          .limit(1);
        
        if (companyResult.length === 0) {
          throw new Error('Company not found');
        }

        // Check for assigned users
        const userCount = await tx
          .select({ count: sql<number>`count(*)` })
          .from(userCompanies)
          .where(eq(userCompanies.companyId, companyId));
        
        if (userCount[0].count > 0) {
          throw new Error('Cannot delete company with assigned users. Please remove all user assignments first.');
        }

        // Delete all company-related data in the correct order (FK dependencies)
        
        // Delete journal entry lines first
        await tx.execute(sql`
          DELETE FROM journal_entry_lines 
          WHERE journal_entry_id IN (
            SELECT id FROM journal_entries WHERE company_id = ${companyId}
          )
        `);

        // Delete journal entries
        await tx
          .delete(journalEntries)
          .where(eq(journalEntries.companyId, companyId));

        // Delete bills
        await tx
          .delete(bills)
          .where(eq(bills.companyId, companyId));

        // Delete invoices
        await tx
          .delete(invoices)
          .where(eq(invoices.companyId, companyId));

        // Delete vendors
        await tx
          .delete(vendors)
          .where(eq(vendors.companyId, companyId));

        // Delete customers
        await tx
          .delete(customers)
          .where(eq(customers.companyId, companyId));

        // Delete accounts
        await tx
          .delete(accounts)
          .where(eq(accounts.companyId, companyId));

        // Delete activity logs
        await tx
          .delete(activityLogs)
          .where(eq(activityLogs.companyId, companyId));

        // Delete company settings
        await tx
          .delete(companySettings)
          .where(eq(companySettings.companyId, companyId));

        // Finally delete the company
        await tx
          .delete(companies)
          .where(eq(companies.id, companyId));
      });

      return true;
    } catch (error) {
      console.error('Delete company error:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
