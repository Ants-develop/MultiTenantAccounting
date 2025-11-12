import { pgTable, text, serial, integer, boolean, timestamp, decimal, pgSchema } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

const rs = pgSchema("rs");

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  globalRole: text("global_role").default("user"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clients table (renamed from companies - now represents client companies)
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  tenantCode: integer("tenant_code").unique(), // MSSQL tenant code for data sync (integer, not text)
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  taxId: text("tax_id"),
  fiscalYearStart: integer("fiscal_year_start").default(1), // Month 1-12
  currency: text("currency").default("GEL"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Keep companies as an alias for backwards compatibility during transition
export const companies = clients;

export const rsUsers = rs.table("users", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  sUser: text("s_user").notNull(),
  sPassword: text("s_password").notNull(),
  sPasswordHash: text("s_password_hash").notNull(),
  mainUser: text("main_user"),
  mainPassword: text("main_password"),
  mainPasswordHash: text("main_password_hash"),
  userId: text("user_id"),
  unId: text("un_id"),
  clientId: integer("client_id").references(() => clients.id),
  companyTin: text("company_tin"),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-Company relationships with roles
export const userCompanies = pgTable("user_companies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  role: text("role").notNull(), // "administrator", "manager", "accountant", "assistant"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chart of Accounts
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // "asset", "liability", "equity", "revenue", "expense"
  subType: text("sub_type"), // "current_asset", "fixed_asset", etc.
  parentId: integer("parent_id"),
  accountClass: text("account_class"), // BalanceSheet, ProfitLoss, OffBalance
  category: text("category"), // user-defined grouping/category
  isSubaccountAllowed: boolean("is_subaccount_allowed").default(false),
  isForeignCurrency: boolean("is_foreign_currency").default(false),
  isAnalytical: boolean("is_analytical").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Journal Entries
// Note: journal_entries is a copy of general_ledger imported from MSSQL
// mssql_record_id links back to general_ledger.id for tracking individual records
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  entryNumber: text("entry_number").notNull(),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  reference: text("reference"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  userId: integer("user_id").references(() => users.id),
  isPosted: boolean("is_posted").default(false),
  // Internal tracking: Link to general_ledger table for MSSQL import tracking
  // Temporarily commented out - column doesn't exist in DB yet
  // mssqlRecordId: integer("mssql_record_id").references(() => generalLedger.id),
  // MSSQL parity fields (all optional/nullable)
  // TenantCode numeric -> stored as integer (clean, no decimals)
  tenantCode: integer("tenant_code"),
  // TenantName nvarchar(100)
  tenantName: text("tenant_name"),
  // Abonent nvarchar(64)
  abonent: text("abonent"),
  // PostingsPeriod datetime2
  postingsPeriod: timestamp("postings_period"),
  // Register binary(16) -> stored as hex/uuid-like text
  register: text("register"),
  // Branch nvarchar(150)
  branch: text("branch"),
  // Content nvarchar(150)
  contentText: text("content_text"),
  // ResponsiblePerson nvarchar(100)
  responsiblePerson: text("responsible_person"),
  // AccountDr nvarchar(26)
  accountDr: text("account_dr"),
  // AccountNameDr nvarchar(120)
  accountNameDr: text("account_name_dr"),
  // AnalyticDr nvarchar(150)
  analyticDr: text("analytic_dr"),
  // AnalyticRefDr binary(16) -> text
  analyticRefDr: text("analytic_ref_dr"),
  // IDDr nvarchar(50)
  idDr: text("id_dr"),
  // LegalFormDr nvarchar(50)
  legalFormDr: text("legal_form_dr"),
  // CountryDr nvarchar(60)
  countryDr: text("country_dr"),
  // ProfitTaxDr binary(1) -> boolean
  profitTaxDr: boolean("profit_tax_dr"),
  // WithholdingTaxDr binary(1) -> boolean
  withholdingTaxDr: boolean("withholding_tax_dr"),
  // DoubleTaxationDr binary(1) -> boolean
  doubleTaxationDr: boolean("double_taxation_dr"),
  // PensionSchemeParticipantDr binary(1) -> boolean
  pensionSchemeParticipantDr: boolean("pension_scheme_participant_dr"),
  // AccountCr nvarchar(26)
  accountCr: text("account_cr"),
  // AccountNameCr nvarchar(120)
  accountNameCr: text("account_name_cr"),
  // AnalyticCr nvarchar(150)
  analyticCr: text("analytic_cr"),
  // AnalyticRefCr binary(16) -> text
  analyticRefCr: text("analytic_ref_cr"),
  // IDCr nvarchar(50)
  idCr: text("id_cr"),
  // LegalFormCr nvarchar(50)
  legalFormCr: text("legal_form_cr"),
  // CountryCr nvarchar(60)
  countryCr: text("country_cr"),
  // ProfitTaxCr binary(1) -> boolean
  profitTaxCr: boolean("profit_tax_cr"),
  // WithholdingTaxCr binary(1) -> boolean
  withholdingTaxCr: boolean("withholding_tax_cr"),
  // DoubleTaxationCr binary(1) -> boolean
  doubleTaxationCr: boolean("double_taxation_cr"),
  // PensionSchemeParticipantCr binary(1) -> boolean
  pensionSchemeParticipantCr: boolean("pension_scheme_participant_cr"),
  // Currency nvarchar(10)
  currency: text("currency"),
  // Amount numeric(21, 2) - FIXED: Match MSSQL precision exactly
  amount: decimal("amount", { precision: 21, scale: 2 }),
  // AmountCur numeric(21, 2) - FIXED: Match MSSQL precision exactly
  amountCur: decimal("amount_cur", { precision: 21, scale: 2 }),
  // QuantityDr numeric(21, 4) - FIXED: Match MSSQL precision exactly
  quantityDr: decimal("quantity_dr", { precision: 21, scale: 4 }),
  // QuantityCr numeric(21, 4) - FIXED: Match MSSQL precision exactly
  quantityCr: decimal("quantity_cr", { precision: 21, scale: 4 }),
  // Rate numeric(19, 13) - FIXED: Match MSSQL precision for exchange rates (13 decimals!)
  rate: decimal("rate", { precision: 19, scale: 13 }),
  // DocumentRate numeric(19, 13) - FIXED: Match MSSQL precision for exchange rates (13 decimals!)
  documentRate: decimal("document_rate", { precision: 19, scale: 13 }),
  // TAXInvoiceNumber nvarchar(30)
  taxInvoiceNumber: text("tax_invoice_number"),
  // TAXInvoiceDate datetime2
  taxInvoiceDate: timestamp("tax_invoice_date"),
  // TAXInvoiceSeries nvarchar(20)
  taxInvoiceSeries: text("tax_invoice_series"),
  // WaybillNumber nvarchar(1024)
  waybillNumber: text("waybill_number"),
  // AttachedFiles numeric(17, 5) - MSSQL has decimals, keeping as decimal not integer
  attachedFiles: decimal("attached_files", { precision: 17, scale: 5 }),
  // DocType nvarchar(50)
  docType: text("doc_type"),
  // DocDate datetime2
  docDate: timestamp("doc_date"),
  // DocNumber nvarchar(30)
  docNumber: text("doc_number"),
  // DocumentCreationDate datetime2
  documentCreationDate: timestamp("document_creation_date"),
  // DocumentModifyDate datetime2
  documentModifyDate: timestamp("document_modify_date"),
  // DocumentComments nvarchar(1024)
  documentComments: text("document_comments"),
  // PostingNumber numeric(9, 0) - FIXED: Integer not text
  postingNumber: integer("posting_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Journal Entry Lines
export const journalEntryLines = pgTable("journal_entry_lines", {
  id: serial("id").primaryKey(),
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id).notNull(),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  description: text("description"),
  debitAmount: decimal("debit_amount", { precision: 15, scale: 2 }).default("0"),
  creditAmount: decimal("credit_amount", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vendors
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  date: timestamp("date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").default("draft"), // "draft", "sent", "paid", "overdue"
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bills
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  billNumber: text("bill_number").notNull(),
  date: timestamp("date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").default("draft"), // "draft", "approved", "paid"
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity Logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  clientId: integer("client_id").references(() => clients.id),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE, LOGIN, etc.
  resource: text("resource").notNull(), // COMPANY, USER, TRANSACTION, etc.
  resourceId: integer("resource_id"), // ID of the affected resource
  details: text("details"), // Additional details about the action
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Company Settings
// General Ledger (Raw MSSQL Import Storage)
// Purpose: Store raw data from MSSQL GeneralLedger before copying to journal_entries
// journal_entries is a copy of general_ledger after tenantCode identification
export const generalLedger = pgTable("general_ledger", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  // MSSQL parity fields (all from MSSQL GeneralLedger table)
  // Tenant information
  tenantCode: decimal("tenant_code", { precision: 18, scale: 0 }),
  tenantName: text("tenant_name"),
  abonent: text("abonent"),
  postingsPeriod: timestamp("postings_period"),
  register: text("register"), // binary(16) - stored as BYTEA in DB, but mapped as text in schema for compatibility
  branch: text("branch"),
  content: text("content"),
  responsiblePerson: text("responsible_person"),
  // Debit account information
  accountDr: text("account_dr"),
  accountNameDr: text("account_name_dr"),
  analyticDr: text("analytic_dr"),
  analyticRefDr: text("analytic_ref_dr"), // binary(16) - stored as BYTEA in DB, but mapped as text in schema for compatibility
  idDr: text("id_dr"),
  legalFormDr: text("legal_form_dr"),
  countryDr: text("country_dr"),
  profitTaxDr: boolean("profit_tax_dr"),
  withholdingTaxDr: boolean("withholding_tax_dr"),
  doubleTaxationDr: boolean("double_taxation_dr"),
  pensionSchemeParticipantDr: boolean("pension_scheme_participant_dr"),
  // Credit account information
  accountCr: text("account_cr"),
  accountNameCr: text("account_name_cr"),
  analyticCr: text("analytic_cr"),
  analyticRefCr: text("analytic_ref_cr"), // binary(16) - stored as BYTEA in DB, but mapped as text in schema for compatibility
  idCr: text("id_cr"),
  legalFormCr: text("legal_form_cr"),
  countryCr: text("country_cr"),
  profitTaxCr: boolean("profit_tax_cr"),
  withholdingTaxCr: boolean("withholding_tax_cr"),
  doubleTaxationCr: boolean("double_taxation_cr"),
  pensionSchemeParticipantCr: boolean("pension_scheme_participant_cr"),
  // Financial information
  currency: text("currency"),
  amount: decimal("amount", { precision: 21, scale: 2 }),
  amountCur: decimal("amount_cur", { precision: 21, scale: 2 }),
  quantityDr: decimal("quantity_dr", { precision: 21, scale: 4 }),
  quantityCr: decimal("quantity_cr", { precision: 21, scale: 4 }),
  rate: decimal("rate", { precision: 19, scale: 13 }),
  documentRate: decimal("document_rate", { precision: 19, scale: 13 }),
  // Tax invoice information
  taxInvoiceNumber: text("tax_invoice_number"),
  taxInvoiceDate: timestamp("tax_invoice_date"),
  taxInvoiceSeries: text("tax_invoice_series"),
  waybillNumber: text("waybill_number"),
  attachedFiles: decimal("attached_files", { precision: 17, scale: 5 }),
  // Document information
  docType: text("doc_type"),
  docDate: timestamp("doc_date"),
  docNumber: text("doc_number"),
  documentCreationDate: timestamp("document_creation_date"),
  documentModifyDate: timestamp("document_modify_date"),
  documentComments: text("document_comments"),
  postingNumber: decimal("posting_number", { precision: 18, scale: 0 }),
  // System fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull().unique(),
  // Notification settings
  emailNotifications: boolean("email_notifications").default(true),
  invoiceReminders: boolean("invoice_reminders").default(true),
  paymentAlerts: boolean("payment_alerts").default(true),
  reportReminders: boolean("report_reminders").default(false),
  systemUpdates: boolean("system_updates").default(true),
  // Financial settings
  autoNumbering: boolean("auto_numbering").default(true),
  invoicePrefix: text("invoice_prefix").default("INV"),
  billPrefix: text("bill_prefix").default("BILL"),
  journalPrefix: text("journal_prefix").default("JE"),
  decimalPlaces: integer("decimal_places").default(2),
  negativeFormat: text("negative_format").default("minus"), // "minus", "parentheses", "color"
  dateFormat: text("date_format").default("MM/DD/YYYY"), // "MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"
  timeZone: text("time_zone").default("America/New_York"),
  // Security settings
  requirePasswordChange: boolean("require_password_change").default(false),
  passwordExpireDays: integer("password_expire_days").default(90),
  sessionTimeout: integer("session_timeout").default(30), // minutes
  enableTwoFactor: boolean("enable_two_factor").default(false),
  allowMultipleSessions: boolean("allow_multiple_sessions").default(true),
  // Integration settings
  bankConnection: boolean("bank_connection").default(false),
  paymentGateway: boolean("payment_gateway").default(false),
  taxService: boolean("tax_service").default(false),
  reportingTools: boolean("reporting_tools").default(false),
  // Backup settings
  autoBackup: boolean("auto_backup").default(false),
  backupFrequency: text("backup_frequency").default("weekly"), // "daily", "weekly", "monthly"
  retentionDays: integer("retention_days").default(30),
  backupLocation: text("backup_location").default("cloud"), // "local", "cloud"
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userCompanies: many(userCompanies),
  journalEntries: many(journalEntries),
  rsCredentials: many(rsUsers),
}));

export const companiesRelations = relations(companies, ({ many, one }) => ({
  userCompanies: many(userCompanies),
  accounts: many(accounts),
  journalEntries: many(journalEntries),
  customers: many(customers),
  vendors: many(vendors),
  invoices: many(invoices),
  bills: many(bills),
  generalLedger: many(generalLedger),
  rsUsers: many(rsUsers),
  settings: one(companySettings),
}));

export const userCompaniesRelations = relations(userCompanies, ({ one }) => ({
  user: one(users, { fields: [userCompanies.userId], references: [users.id] }),
  company: one(companies, { fields: [userCompanies.clientId], references: [companies.id] }),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  company: one(companies, { fields: [accounts.clientId], references: [companies.id] }),
  parent: one(accounts, { fields: [accounts.parentId], references: [accounts.id] }),
  children: many(accounts, { relationName: "account_children" }),
  journalEntryLines: many(journalEntryLines),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  company: one(companies, { fields: [journalEntries.clientId], references: [companies.id] }),
  user: one(users, { fields: [journalEntries.userId], references: [users.id] }),
  lines: many(journalEntryLines),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  journalEntry: one(journalEntries, { fields: [journalEntryLines.journalEntryId], references: [journalEntries.id] }),
  account: one(accounts, { fields: [journalEntryLines.accountId], references: [accounts.id] }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  company: one(companies, { fields: [customers.clientId], references: [companies.id] }),
  invoices: many(invoices),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  company: one(companies, { fields: [vendors.clientId], references: [companies.id] }),
  bills: many(bills),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  company: one(companies, { fields: [invoices.clientId], references: [companies.id] }),
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
}));

export const billsRelations = relations(bills, ({ one }) => ({
  company: one(companies, { fields: [bills.clientId], references: [companies.id] }),
  vendor: one(vendors, { fields: [bills.vendorId], references: [vendors.id] }),
}));

export const generalLedgerRelations = relations(generalLedger, ({ one }) => ({
  company: one(companies, { fields: [generalLedger.clientId], references: [companies.id] }),
}));

export const companySettingsRelations = relations(companySettings, ({ one }) => ({
  company: one(companies, { fields: [companySettings.clientId], references: [companies.id] }),
}));

export const rsUsersRelations = relations(rsUsers, ({ one }) => ({
  company: one(companies, { fields: [rsUsers.clientId], references: [companies.id] }),
  createdBy: one(users, { fields: [rsUsers.createdByUserId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
// Backwards compatibility alias
export const insertCompanySchema = insertClientSchema;
export const insertUserCompanySchema = createInsertSchema(userCompanies).omit({ id: true, createdAt: true });
export const insertRsUserSchema = createInsertSchema(rsUsers).omit({ id: true, createdAt: true, updatedAt: true, createdByUserId: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, createdAt: true });
export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true });
export const insertJournalEntryLineSchema = createInsertSchema(journalEntryLines).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, userId: true });
export const insertBillSchema = createInsertSchema(bills).omit({ id: true, createdAt: true, userId: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, timestamp: true, clientId: true });
export const insertGeneralLedgerSchema = createInsertSchema(generalLedger).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({ id: true, createdAt: true, updatedAt: true });

// Enhanced validation schemas with business rules
export const insertUserSchemaEnhanced = insertUserSchema.extend({
  email: z.string().email("Invalid email format"),
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username too long"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  globalRole: z.enum(["user", "global_administrator"]).default("user")
});

export const insertClientSchemaEnhanced = insertClientSchema.extend({
  name: z.string().min(1, "Client name is required").max(100, "Client name too long"),
  code: z.string().min(2, "Client code must be at least 2 characters").max(10, "Client code too long").regex(/^[A-Z0-9]+$/, "Client code must contain only uppercase letters and numbers"),
  email: z.string().email("Invalid email format").optional(),
  tenantCode: z.string().max(50, "Tenant code too long").optional(),
  currency: z.string().length(3, "Currency must be 3 characters (ISO 4217)").default("GEL"),
  fiscalYearStart: z.number().min(1).max(12, "Fiscal year start must be between 1-12")
});
// Backwards compatibility alias
export const insertCompanySchemaEnhanced = insertClientSchemaEnhanced;

export const insertAccountSchemaEnhanced = insertAccountSchema.extend({
  code: z.string().min(1, "Account code is required").max(20, "Account code too long"),
  name: z.string().min(1, "Account name is required").max(100, "Account name too long"),
  type: z.enum(["asset", "liability", "equity", "revenue", "expense"], {
    errorMap: () => ({ message: "Account type must be one of: asset, liability, equity, revenue, expense" })
  }),
  subType: z.string().optional()
});

export const insertJournalEntrySchemaEnhanced = insertJournalEntrySchema.extend({
  entryNumber: z.string().min(1, "Entry number is required"),
  description: z.string().min(1, "Description is required").max(500, "Description too long"),
  totalAmount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Total amount must be a positive number"),
  date: z.date().max(new Date(), "Entry date cannot be in the future")
});

export const insertJournalEntryLineSchemaEnhanced = insertJournalEntryLineSchema.extend({
  debitAmount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, "Debit amount must be a non-negative number"),
  creditAmount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, "Credit amount must be a non-negative number")
}).refine((data) => {
  const debit = parseFloat(data.debitAmount || "0");
  const credit = parseFloat(data.creditAmount || "0");
  return (debit > 0 && credit === 0) || (credit > 0 && debit === 0);
}, {
  message: "Either debit or credit amount must be specified, but not both",
  path: ["debitAmount"]
});

// Business validation for complete journal entries
export const journalEntryWithLinesSchema = z.object({
  entry: insertJournalEntrySchemaEnhanced,
  lines: z.array(insertJournalEntryLineSchemaEnhanced).min(2, "Journal entry must have at least 2 lines")
}).refine((data) => {
  const totalDebits = data.lines.reduce((sum, line) => sum + parseFloat(line.debitAmount || "0"), 0);
  const totalCredits = data.lines.reduce((sum, line) => sum + parseFloat(line.creditAmount || "0"), 0);
  return Math.abs(totalDebits - totalCredits) < 0.01; // Allow for rounding differences
}, {
  message: "Total debits must equal total credits",
  path: ["lines"]
});

// ============ BANK MODULE ============

// Bank Accounts Table
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  accountName: text("account_name").notNull(),
  accountNumber: text("account_number"),
  iban: text("iban"),
  bankName: text("bank_name"),
  currency: text("currency").default("USD").notNull(),
  openingBalance: decimal("opening_balance", { precision: 15, scale: 2 }).default("0"),
  currentBalance: decimal("current_balance", { precision: 15, scale: 2 }).default("0"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Raw Bank Transactions Table
export const rawBankTransactions = pgTable("raw_bank_transactions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id, { onDelete: 'cascade' }),
  
  // Transaction identification
  movementId: text("movement_id").notNull(),
  uniqueTransactionId: text("unique_transaction_id").notNull(),
  
  // Transaction details
  debitCredit: text("debit_credit").notNull(), // "DEBIT" or "CREDIT"
  description: text("description"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  endBalance: decimal("end_balance", { precision: 15, scale: 2 }),
  currency: text("currency").notNull(),
  
  // Account information
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name"),
  additionalInformation: text("additional_information"),
  
  // Document details
  documentDate: timestamp("document_date"),
  documentNumber: text("document_number"),
  
  // Partner information
  partnerAccountNumber: text("partner_account_number"),
  partnerName: text("partner_name"),
  partnerTaxCode: text("partner_tax_code"),
  partnerBankCode: text("partner_bank_code"),
  partnerBank: text("partner_bank"),
  
  // Intermediary bank
  intermediaryBankCode: text("intermediary_bank_code"),
  intermediaryBank: text("intermediary_bank"),
  
  // Additional transaction details
  chargeDetail: text("charge_detail"),
  operationCode: text("operation_code"),
  additionalDescription: text("additional_description"),
  exchangeRate: decimal("exchange_rate", { precision: 15, scale: 6 }),
  transactionType: text("transaction_type"),
  
  // Audit fields
  importedAt: timestamp("imported_at").defaultNow(),
  importedBy: integer("imported_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint on unique_transaction_id per company to prevent duplicates
  uniqueTransactionIdx: {
    name: "unique_transaction_client_idx",
    columns: [table.clientId, table.uniqueTransactionId],
    unique: true,
  },
}));

// Normalized Bank Transactions Table - Validated transactions with sequence and balance checks
export const normalizedBankTransactions = pgTable("normalized_bank_transactions", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => companies.id, { onDelete: 'cascade' }).notNull(),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id, { onDelete: 'cascade' }).notNull(),
  rawTransactionId: integer("raw_transaction_id").references(() => rawBankTransactions.id, { onDelete: 'cascade' }).notNull(),
  
  // Sequence information
  sequenceNumber: integer("sequence_number").notNull(), // Position within bank account's transaction sequence
  
  // Transaction details (denormalized for faster queries)
  movementId: text("movement_id").notNull(),
  documentDate: timestamp("document_date"),
  debitCredit: text("debit_credit").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  
  // Balance validation
  previousBalance: decimal("previous_balance", { precision: 15, scale: 2 }),
  expectedBalance: decimal("expected_balance", { precision: 15, scale: 2 }), // Calculated: previous + credit - debit
  actualBalance: decimal("actual_balance", { precision: 15, scale: 2 }), // From transaction record
  balanceValid: boolean("balance_valid").default(true).notNull(),
  
  // Sequence validation
  sequenceValid: boolean("sequence_valid").default(true).notNull(),
  
  // Validation errors
  validationErrors: text("validation_errors").array(), // Array of error messages
  
  // Audit fields
  normalizedAt: timestamp("normalized_at").defaultNow(),
  normalizedBy: integer("normalized_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint: one normalized record per raw transaction
  uniqueRawTransactionIdx: {
    name: "unique_raw_transaction_idx",
    columns: [table.rawTransactionId],
    unique: true,
  },
  // Index for querying by bank account and sequence
  bankAccountSequenceIdx: {
    name: "bank_account_sequence_idx",
    columns: [table.bankAccountId, table.sequenceNumber],
  },
}));

// Bank Accounts Insert Schema
export const insertBankAccountSchema = createInsertSchema(bankAccounts, {
  accountName: z.string().min(1, "Account name is required"),
  currency: z.string().min(1, "Currency is required"),
  openingBalance: z.string().optional(),
  currentBalance: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Raw Bank Transactions Insert Schema
export const insertRawBankTransactionSchema = createInsertSchema(rawBankTransactions, {
  movementId: z.string().min(1, "Movement ID is required"),
  debitCredit: z.enum(["DEBIT", "CREDIT"], { errorMap: () => ({ message: "Must be DEBIT or CREDIT" }) }),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount must be a positive number"),
  currency: z.string().min(1, "Currency is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  uniqueTransactionId: z.string().min(1, "Unique transaction ID is required"),
  // Optional date field - accept string or Date object from CSV
  documentDate: z.union([z.string(), z.date()]).optional().transform((val) => {
    if (!val) return undefined;
    if (val instanceof Date) return val;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  }),
}).omit({
  id: true,
  clientId: true,
  importedBy: true,
  createdAt: true,
  updatedAt: true,
  importedAt: true,
});

// Normalized Bank Transactions Insert Schema
export const insertNormalizedBankTransactionSchema = createInsertSchema(normalizedBankTransactions).omit({
  id: true,
  normalizedAt: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
// Backwards compatibility aliases
export type Company = Client;
export type InsertCompany = InsertClient;
export type UserCompany = typeof userCompanies.$inferSelect;
export type InsertUserCompany = z.infer<typeof insertUserCompanySchema>;
export type RsUser = typeof rsUsers.$inferSelect;
export type InsertRsUser = z.infer<typeof insertRsUserSchema>;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type InsertJournalEntryLine = z.infer<typeof insertJournalEntryLineSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type GeneralLedger = typeof generalLedger.$inferSelect;
export type InsertGeneralLedger = z.infer<typeof insertGeneralLedgerSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type RawBankTransaction = typeof rawBankTransactions.$inferSelect;
export type InsertRawBankTransaction = z.infer<typeof insertRawBankTransactionSchema>;
export type NormalizedBankTransaction = typeof normalizedBankTransactions.$inferSelect;
export type InsertNormalizedBankTransaction = z.infer<typeof insertNormalizedBankTransactionSchema>;

// Enhanced types with validation
export type InsertUserEnhanced = z.infer<typeof insertUserSchemaEnhanced>;
export type InsertClientEnhanced = z.infer<typeof insertClientSchemaEnhanced>;
// Backwards compatibility alias
export type InsertCompanyEnhanced = InsertClientEnhanced;
export type InsertAccountEnhanced = z.infer<typeof insertAccountSchemaEnhanced>;
export type InsertJournalEntryEnhanced = z.infer<typeof insertJournalEntrySchemaEnhanced>;
export type InsertJournalEntryLineEnhanced = z.infer<typeof insertJournalEntryLineSchemaEnhanced>;
export type JournalEntryWithLines = z.infer<typeof journalEntryWithLinesSchema>;
