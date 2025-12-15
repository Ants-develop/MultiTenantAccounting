import { pgTable, text, serial, integer, boolean, timestamp, decimal, pgSchema, jsonb, numeric, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

const rs = pgSchema("rs");
const accounting = pgSchema("accounting");
const crm = pgSchema("crm");

// Profiles table (Supabase Auth) - Replaces legacy 'users' table
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // References auth.users
  username: text("username").unique(),
  email: text("email").unique(),
  fullName: text("full_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  jobTitle: text("job_title"),
  globalRole: text("global_role").default("user"),
  isActive: boolean("is_active").default(true),
  matrixId: text("matrix_id"),
  clientId: uuid("client_id").references(() => clients.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Legacy users table - REMOVED
// export const users = pgTable("users", { ... });

// Clients table (renamed from companies - now represents client companies)
// Now uses UUID for consistency with Supabase Auth
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  tenantCode: text("tenant_code").unique(), // MSSQL tenant code for data sync (VARCHAR(50) for flexibility, convert to INT in code when needed)
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  taxId: text("tax_id"),
  businessType: text("business_type").default("individual"),
  industry: text("industry"),
  fiscalYearStart: integer("fiscal_year_start").default(1), // Month 1-12
  currency: text("currency").default("GEL"),
  isActive: boolean("is_active").default(true),
  status: text("status").default("active"), // 'active', 'inactive', 'archived'
  manager: text("manager"), // Name of assigned manager/accountant
  accountingSoftware: text("accounting_software"), // Name of accounting software used
  idCode: text("id_code"), // Company identification code (tax ID or registration number)
  verificationStatus: text("verification_status").default("not_registered"), // RS.GE verification status
  assignedOwnerId: uuid("assigned_owner_id").references(() => profiles.id),
  assignedAccountantId: uuid("assigned_accountant_id").references(() => profiles.id),
  assignedReviewerId: uuid("assigned_reviewer_id").references(() => profiles.id),
  notes: text("notes"),
  communicationPreferences: jsonb("communication_preferences").default({}),
  portalEnabled: boolean("portal_enabled").default(false),
  portalAccessToken: uuid("portal_access_token").default(sql`gen_random_uuid()`),
  portalInvitationSentAt: timestamp("portal_invitation_sent_at"),
  portalInvitationAcceptedAt: timestamp("portal_invitation_accepted_at"),
  lastPortalLogin: timestamp("last_portal_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Keep companies as an alias for backwards compatibility during transition
export const companies = clients;

// Client Management (CRM) Tables - REMOVED (Migrated to Supabase)


// Task System Enhancements - REMOVED (Migrated to Supabase)


// Email Integration Tables (Gmail API) - REMOVED
// export const emailAccounts = pgTable("email_accounts", { ... });
// export const emailMessages = pgTable("email_messages", { ... });
// export const emailTemplates = pgTable("email_templates", { ... });
// export const emailRoutingRules = pgTable("email_routing_rules", { ... });

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
  clientId: uuid("client_id").references(() => clients.id),
  companyTin: text("company_tin"),
  createdByUserId: uuid("created_by_user_id").references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// RS Credentials - for RS.ge authentication
export const rsCredentials = rs.table("credentials", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  password: text("password").notNull(),
  encryptedPassword: text("encrypted_password").notNull(),
  apiKey: text("api_key"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

// RS Seller Invoices
export const rsSellerInvoices = rs.table("seller_invoices", {
  id: text("ID").primaryKey(),
  companyTin: text("COMPANY_TIN").notNull(),
  invoiceNumber: text("INVOICE_NUMBER"),
  invoiceDate: timestamp("INVOICE_DATE"),
  dueDate: timestamp("DUE_DATE"),
  invoiceAmount: numeric("INVOICE_AMOUNT", { precision: 18, scale: 2 }),
  vatAmount: numeric("VAT_AMOUNT", { precision: 18, scale: 2 }),
  totalAmount: numeric("TOTAL_AMOUNT", { precision: 18, scale: 2 }),
  buyerTin: text("BUYER_TIN"),
  buyerName: text("BUYER_NAME"),
  status: text("STATUS"),
  currency: text("CURRENCY").default("GEL"),
  createdAt: timestamp("CREATED_AT"),
  updatedAt: timestamp("UPDATED_AT"),
  notes: text("NOTES"),
});

// RS Buyer Invoices
export const rsBuyerInvoices = rs.table("buyer_invoices", {
  id: text("ID").primaryKey(),
  companyTin: text("COMPANY_TIN").notNull(),
  invoiceNumber: text("INVOICE_NUMBER"),
  invoiceDate: timestamp("INVOICE_DATE"),
  dueDate: timestamp("DUE_DATE"),
  invoiceAmount: numeric("INVOICE_AMOUNT", { precision: 18, scale: 2 }),
  vatAmount: numeric("VAT_AMOUNT", { precision: 18, scale: 2 }),
  totalAmount: numeric("TOTAL_AMOUNT", { precision: 18, scale: 2 }),
  sellerTin: text("SELLER_TIN"),
  sellerName: text("SELLER_NAME"),
  status: text("STATUS"),
  currency: text("CURRENCY").default("GEL"),
  createdAt: timestamp("CREATED_AT"),
  updatedAt: timestamp("UPDATED_AT"),
  notes: text("NOTES"),
});

// RS Spec Seller Invoices (Special Regime)
export const rsSpecSellerInvoices = rs.table("spec_seller_invoices", {
  id: text("ID").primaryKey(),
  companyTin: text("COMPANY_TIN").notNull(),
  invoiceNumber: text("INVOICE_NUMBER"),
  invoiceDate: timestamp("INVOICE_DATE"),
  invoiceAmount: numeric("INVOICE_AMOUNT", { precision: 18, scale: 2 }),
  buyerTin: text("BUYER_TIN"),
  buyerName: text("BUYER_NAME"),
  status: text("STATUS"),
  createdAt: timestamp("CREATED_AT"),
  updatedAt: timestamp("UPDATED_AT"),
});

// RS Spec Buyer Invoices (Special Regime)
export const rsSpecBuyerInvoices = rs.table("spec_buyer_invoices", {
  id: text("ID").primaryKey(),
  companyTin: text("COMPANY_TIN").notNull(),
  invoiceNumber: text("INVOICE_NUMBER"),
  invoiceDate: timestamp("INVOICE_DATE"),
  invoiceAmount: numeric("INVOICE_AMOUNT", { precision: 18, scale: 2 }),
  sellerTin: text("SELLER_TIN"),
  sellerName: text("SELLER_NAME"),
  status: text("STATUS"),
  createdAt: timestamp("CREATED_AT"),
  updatedAt: timestamp("UPDATED_AT"),
});

// RS Sellers Waybills
export const rsSellersWaybills = rs.table("sellers_waybills", {
  id: text("ID").primaryKey(),
  companyTin: text("COMPANY_TIN").notNull(),
  waybillNumber: text("WAYBILL_NUMBER"),
  waybillDate: timestamp("WAYBILL_DATE"),
  totalAmount: numeric("TOTAL_AMOUNT", { precision: 18, scale: 2 }),
  buyerTin: text("BUYER_TIN"),
  buyerName: text("BUYER_NAME"),
  status: text("STATUS"),
  createdAt: timestamp("CREATED_AT"),
  updatedAt: timestamp("UPDATED_AT"),
});

// RS Buyers Waybills
export const rsBuyersWaybills = rs.table("buyers_waybills", {
  id: text("ID").primaryKey(),
  companyTin: text("COMPANY_TIN").notNull(),
  waybillNumber: text("WAYBILL_NUMBER"),
  waybillDate: timestamp("WAYBILL_DATE"),
  totalAmount: numeric("TOTAL_AMOUNT", { precision: 18, scale: 2 }),
  sellerTin: text("SELLER_TIN"),
  sellerName: text("SELLER_NAME"),
  status: text("STATUS"),
  createdAt: timestamp("CREATED_AT"),
  updatedAt: timestamp("UPDATED_AT"),
});

// RS Sellers Waybill Goods (Line Items)
export const rsSellersWaybillGoods = rs.table("sellers_waybill_goods", {
  id: text("ID").primaryKey(),
  waybillId: text("WAYBILL_ID").notNull(),
  companyTin: text("COMPANY_TIN").notNull(),
  goodsDescription: text("GOODS_DESCRIPTION"),
  quantity: numeric("QUANTITY", { precision: 18, scale: 2 }),
  unitPrice: numeric("UNIT_PRICE", { precision: 18, scale: 2 }),
  totalAmount: numeric("TOTAL_AMOUNT", { precision: 18, scale: 2 }),
  createdAt: timestamp("CREATED_AT"),
  updatedAt: timestamp("UPDATED_AT"),
});

// RS Buyers Waybill Goods (Line Items)
export const rsBuyersWaybillGoods = rs.table("buyers_waybill_goods", {
  id: text("ID").primaryKey(),
  waybillId: text("WAYBILL_ID").notNull(),
  companyTin: text("COMPANY_TIN").notNull(),
  goodsDescription: text("GOODS_DESCRIPTION"),
  quantity: numeric("QUANTITY", { precision: 18, scale: 2 }),
  unitPrice: numeric("UNIT_PRICE", { precision: 18, scale: 2 }),
  totalAmount: numeric("TOTAL_AMOUNT", { precision: 18, scale: 2 }),
  createdAt: timestamp("CREATED_AT"),
  updatedAt: timestamp("UPDATED_AT"),
});

// RS Sellers Invoice Goods (Line Items)
export const rsSellersInvoiceGoods = rs.table("sellers_invoice_goods", {
  id: text("ID").primaryKey(),
  invoiceId: text("INVOICE_ID").notNull(),
  companyTin: text("COMPANY_TIN").notNull(),
  goodsDescription: text("GOODS_DESCRIPTION"),
  quantity: numeric("QUANTITY", { precision: 18, scale: 2 }),
  unitPrice: numeric("UNIT_PRICE", { precision: 18, scale: 2 }),
  vatRate: numeric("VAT_RATE", { precision: 5, scale: 2 }),
  totalAmount: numeric("TOTAL_AMOUNT", { precision: 18, scale: 2 }),
  createdAt: timestamp("CREATED_AT"),
  updatedAt: timestamp("UPDATED_AT"),
});

// RS Buyers Invoice Goods (Line Items)
export const rsBuyersInvoiceGoods = rs.table("buyers_invoice_goods", {
  id: text("ID").primaryKey(),
  invoiceId: text("INVOICE_ID").notNull(),
  companyTin: text("COMPANY_TIN").notNull(),
  goodsDescription: text("GOODS_DESCRIPTION"),
  quantity: numeric("QUANTITY", { precision: 18, scale: 2 }),
  unitPrice: numeric("UNIT_PRICE", { precision: 18, scale: 2 }),
  vatRate: numeric("VAT_RATE", { precision: 5, scale: 2 }),
  totalAmount: numeric("TOTAL_AMOUNT", { precision: 18, scale: 2 }),
  createdAt: timestamp("CREATED_AT"),
  updatedAt: timestamp("UPDATED_AT"),
});

// RS Spec Invoice Goods (Line Items for Special Regime)
export const rsSpecInvoiceGoods = rs.table("spec_invoice_goods", {
  id: text("ID").primaryKey(),
  invoiceId: text("INVOICE_ID").notNull(),
  companyTin: text("COMPANY_TIN").notNull(),
  goodsDescription: text("GOODS_DESCRIPTION"),
  quantity: numeric("QUANTITY", { precision: 18, scale: 2 }),
  unitPrice: numeric("UNIT_PRICE", { precision: 18, scale: 2 }),
  totalAmount: numeric("TOTAL_AMOUNT", { precision: 18, scale: 2 }),
  createdAt: timestamp("CREATED_AT"),
  updatedAt: timestamp("UPDATED_AT"),
});

// RS Waybill Invoices (Linking Table)
export const rsWaybillInvoices = rs.table("waybill_invoices", {
  id: text("ID").primaryKey(),
  waybillId: text("WAYBILL_ID").notNull(),
  invoiceId: text("INVOICE_ID").notNull(),
  companyTin: text("COMPANY_TIN").notNull(),
  createdAt: timestamp("CREATED_AT"),
  updatedAt: timestamp("UPDATED_AT"),
});

// User-Company relationships with roles
export const userCompanies = pgTable("user_companies", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => profiles.id),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  role: text("role").notNull(), // "administrator", "manager", "accountant", "assistant"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Module-Level Permissions: Controls access to entire modules per user per client
export const userClientModules = pgTable("user_client_modules", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => profiles.id).notNull(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  module: text("module").notNull(), // 'accounting', 'banking', 'reports', 'audit', 'rs_integration', 'tasks', 'messenger'
  canView: boolean("can_view").default(false),
  canCreate: boolean("can_create").default(false),
  canEdit: boolean("can_edit").default(false),
  canDelete: boolean("can_delete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Feature-Level Permissions: Controls access to specific features within modules
export const userClientFeatures = pgTable("user_client_features", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => profiles.id).notNull(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  module: text("module").notNull(), // parent module
  feature: text("feature").notNull(), // 'invoices', 'bills', 'journal_entries', 'accounts', 'bank_accounts', etc.
  canView: boolean("can_view").default(false),
  canCreate: boolean("can_create").default(false),
  canEdit: boolean("can_edit").default(false),
  canDelete: boolean("can_delete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chart of Accounts
export const accounts = accounting.table("accounts", {
  id: serial("id").primaryKey(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
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
// Stores journal entries imported from MSSQL GeneralLedger
export const journalEntries = accounting.table("journal_entries", {
  id: serial("id").primaryKey(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  entryNumber: text("entry_number").notNull(),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  reference: text("reference"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  userId: uuid("user_id").references(() => profiles.id),
  isPosted: boolean("is_posted").default(false),
  // MSSQL parity fields (all optional/nullable)
  // TenantCode VARCHAR(50) for flexibility, convert to INT in code when needed
  tenantCode: text("tenant_code"),
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
export const journalEntryLines = accounting.table("journal_entry_lines", {
  id: serial("id").primaryKey(),
  journalEntryId: integer("journal_entry_id").references(() => journalEntries.id).notNull(),
  accountId: integer("account_id").references(() => accounts.id).notNull(),
  description: text("description"),
  debitAmount: decimal("debit_amount", { precision: 15, scale: 2 }).default("0"),
  creditAmount: decimal("credit_amount", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers
export const customers = accounting.table("customers", {
  id: serial("id").primaryKey(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vendors
export const vendors = accounting.table("vendors", {
  id: serial("id").primaryKey(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Invoices
export const invoices = accounting.table("invoices", {
  id: serial("id").primaryKey(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  date: timestamp("date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").default("draft"), // "draft", "sent", "paid", "overdue"
  userId: uuid("user_id").references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bills
export const bills = accounting.table("bills", {
  id: serial("id").primaryKey(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  vendorId: integer("vendor_id").references(() => vendors.id).notNull(),
  billNumber: text("bill_number").notNull(),
  date: timestamp("date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").default("draft"), // "draft", "approved", "paid"
  userId: uuid("user_id").references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity Logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => profiles.id),
  clientId: uuid("client_id").references(() => clients.id),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE, LOGIN, etc.
  resource: text("resource").notNull(), // COMPANY, USER, TRANSACTION, etc.
  resourceId: text("resource_id"), // ID of the affected resource
  details: text("details"), // Additional details about the action
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Company Settings
export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  clientId: uuid("client_id").references(() => clients.id).notNull().unique(),
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

// Main Company Settings - dedicated table for the accounting firm's own company information
// Only ONE row should exist in this table (system-wide main company)
export const mainCompanySettings = pgTable("main_company_settings", {
  id: serial("id").primaryKey(),
  // Company Profile
  name: text("name").notNull(),
  code: text("code").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  taxId: text("tax_id"),
  // Financial Settings
  fiscalYearStart: integer("fiscal_year_start").default(1),
  currency: text("currency").default("GEL"),
  dateFormat: text("date_format").default("MM/DD/YYYY"),
  decimalPlaces: integer("decimal_places").default(2),
  timeZone: text("time_zone").default("America/New_York"),
  // Notification Settings
  emailNotifications: boolean("email_notifications").default(true),
  invoiceReminders: boolean("invoice_reminders").default(true),
  paymentAlerts: boolean("payment_alerts").default(true),
  reportReminders: boolean("report_reminders").default(false),
  systemUpdates: boolean("system_updates").default(true),
  // Document Settings
  autoNumbering: boolean("auto_numbering").default(true),
  invoicePrefix: text("invoice_prefix").default("INV"),
  billPrefix: text("bill_prefix").default("BILL"),
  journalPrefix: text("journal_prefix").default("JE"),
  negativeFormat: text("negative_format").default("minus"),
  // Security Settings
  requirePasswordChange: boolean("require_password_change").default(false),
  passwordExpireDays: integer("password_expire_days").default(90),
  sessionTimeout: integer("session_timeout").default(30),
  enableTwoFactor: boolean("enable_two_factor").default(false),
  allowMultipleSessions: boolean("allow_multiple_sessions").default(true),
  // Integration Settings
  bankConnection: boolean("bank_connection").default(false),
  paymentGateway: boolean("payment_gateway").default(false),
  taxService: boolean("tax_service").default(false),
  reportingTools: boolean("reporting_tools").default(false),
  // SSH Connection Settings
  sshHost: text("ssh_host"),
  sshPort: integer("ssh_port").default(22),
  sshUser: text("ssh_user"),
  sshKeyPath: text("ssh_key_path"),
  sshKeyContent: text("ssh_key_content"), // Store encrypted
  // MSSQL Connection Settings
  mssqlServer: text("mssql_server"),
  mssqlPort: integer("mssql_port").default(1433),
  mssqlUser: text("mssql_user"),
  mssqlPassword: text("mssql_password"), // Store encrypted
  mssqlDatabase: text("mssql_database"),
  mssqlEncrypt: boolean("mssql_encrypt").default(true),
  mssqlTrustServerCertificate: boolean("mssql_trust_server_cert").default(false),
  // Backup Settings
  autoBackup: boolean("auto_backup").default(false),
  backupFrequency: text("backup_frequency").default("weekly"),
  retentionDays: integer("retention_days").default(30),
  backupLocation: text("backup_location").default("cloud"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const profilesRelations = relations(profiles, ({ many }) => ({
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
  rsUsers: many(rsUsers),
  settings: one(companySettings),
}));

export const userCompaniesRelations = relations(userCompanies, ({ one }) => ({
  user: one(profiles, { fields: [userCompanies.userId], references: [profiles.id] }),
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
  user: one(profiles, { fields: [journalEntries.userId], references: [profiles.id] }),
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


export const companySettingsRelations = relations(companySettings, ({ one }) => ({
  company: one(companies, { fields: [companySettings.clientId], references: [companies.id] }),
}));

export const rsUsersRelations = relations(rsUsers, ({ one }) => ({
  company: one(companies, { fields: [rsUsers.clientId], references: [companies.id] }),
  createdBy: one(profiles, { fields: [rsUsers.createdByUserId], references: [profiles.id] }),
}));

// Insert schemas
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, createdAt: true, updatedAt: true });
// Backwards compatibility alias (legacy "users" concept is now "profiles")
export const insertUserSchema = insertProfileSchema;
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
// Backwards compatibility alias
export const insertCompanySchema = insertClientSchema;
export const insertUserCompanySchema = createInsertSchema(userCompanies).omit({ id: true, createdAt: true });
export const insertUserClientModuleSchema = createInsertSchema(userClientModules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserClientFeatureSchema = createInsertSchema(userClientFeatures).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRsUserSchema = createInsertSchema(rsUsers).omit({ id: true, createdAt: true, updatedAt: true, createdByUserId: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, createdAt: true });
export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true });
export const insertJournalEntryLineSchema = createInsertSchema(journalEntryLines).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, userId: true });
export const insertBillSchema = createInsertSchema(bills).omit({ id: true, createdAt: true, userId: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, timestamp: true, clientId: true });
export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({ id: true, createdAt: true, updatedAt: true });

// Main Company Settings Schemas
export const insertMainCompanySettingsSchema = createInsertSchema(mainCompanySettings).omit({ id: true, createdAt: true, updatedAt: true });
export const updateMainCompanySettingsSchema = createInsertSchema(mainCompanySettings).partial().omit({ id: true, createdAt: true, updatedAt: true });

// Enhanced validation schemas with business rules
export const insertProfileSchemaEnhanced = insertProfileSchema.extend({
  email: z.string().email("Invalid email format"),
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username too long"),
  fullName: z.string().min(1, "Full name is required"),
  globalRole: z.enum(["user", "global_administrator"]).default("user")
});

// Backwards compatibility alias (legacy "users" concept is now "profiles")
export const insertUserSchemaEnhanced = insertProfileSchemaEnhanced;

export const insertClientSchemaEnhanced = insertClientSchema.extend({
  name: z.string().min(1, "Client name is required").max(100, "Client name too long"),
  code: z.string().min(2, "Client code must be at least 2 characters").max(10, "Client code too long").regex(/^[A-Z0-9]+$/, "Client code must contain only uppercase letters and numbers"),
  email: z.string().email("Invalid email format").optional(),
  tenantCode: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
    // Convert to string for storage (VARCHAR(50))
    if (val === null || val === undefined) return null;
    return String(val);
  }),
  currency: z.string().length(3, "Currency must be 3 characters (ISO 4217)").default("GEL"),
  fiscalYearStart: z.number().min(1).max(12, "Fiscal year start must be between 1-12"),
  manager: z.string().max(100, "Manager name too long").optional(),
  accountingSoftware: z.string().max(100, "Accounting software name too long").optional(),
  idCode: z.string().max(50, "ID code too long").optional(),
  isActive: z.boolean().default(true),
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
  clientId: uuid("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
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
  clientId: uuid("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
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
  importedBy: uuid("imported_by").references(() => profiles.id),
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
  clientId: uuid("client_id").references(() => clients.id, { onDelete: 'cascade' }).notNull(),
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
  normalizedBy: uuid("normalized_by").references(() => profiles.id),
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
export type User = typeof profiles.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
// Backwards compatibility aliases
export type Company = Client;
export type InsertCompany = InsertClient;
export type UserCompany = typeof userCompanies.$inferSelect;
export type InsertUserCompany = z.infer<typeof insertUserCompanySchema>;
export type UserClientModule = typeof userClientModules.$inferSelect;
export type InsertUserClientModule = z.infer<typeof insertUserClientModuleSchema>;
export type UserClientFeature = typeof userClientFeatures.$inferSelect;
export type InsertUserClientFeature = z.infer<typeof insertUserClientFeatureSchema>;
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
export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type RawBankTransaction = typeof rawBankTransactions.$inferSelect;
export type InsertRawBankTransaction = z.infer<typeof insertRawBankTransactionSchema>;
export type NormalizedBankTransaction = typeof normalizedBankTransactions.$inferSelect;
export type InsertNormalizedBankTransaction = z.infer<typeof insertNormalizedBankTransactionSchema>;
export type MainCompanySettings = typeof mainCompanySettings.$inferSelect;
export type InsertMainCompanySettings = z.infer<typeof insertMainCompanySettingsSchema>;
export type UpdateMainCompanySettings = z.infer<typeof updateMainCompanySettingsSchema>;

// ============ TAXDOME MODULE - REMOVED (Migrated to Supabase) ============


// Migration History Tables
// NOTE: These tables are managed by manual SQL migration (009_migration_tracking.sql)
// Foreign keys reference migration_id (unique column, not primary key) which Drizzle
// doesn't fully support. Do NOT use `drizzle-kit push` on these tables - use manual migrations instead.
export const migrationHistory = pgTable("migration_history", {
  id: serial("id").primaryKey(),
  migrationId: text("migration_id").notNull().unique(),
  type: text("type").notNull(), // 'general-ledger', 'audit', 'rs', 'update'
  tenantCode: text("tenant_code"), // VARCHAR(50) for flexibility, convert to INT in code when needed
  tableName: text("table_name"),
  status: text("status").notNull(), // 'pending', 'running', 'completed', 'failed', 'stopped'
  totalRecords: integer("total_records").default(0),
  processedRecords: integer("processed_records").default(0),
  successCount: integer("success_count").default(0),
  errorCount: integer("error_count").default(0),
  progress: numeric("progress", { precision: 5, scale: 2 }).default("0"),
  batchSize: integer("batch_size").default(1000),
  errorMessage: text("error_message"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Foreign key to migration_history.migration_id is defined in SQL migration, not here
// to avoid Drizzle trying to manage it (Drizzle doesn't fully support FKs to unique non-PK columns)
export const migrationLogs = pgTable("migration_logs", {
  id: serial("id").primaryKey(),
  migrationId: text("migration_id").notNull(), // FK to migration_history.migration_id (defined in SQL)
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  level: text("level").notNull(), // 'info', 'warn', 'error'
  message: text("message").notNull(),
  context: jsonb("context"), // Additional context data
  createdAt: timestamp("created_at").defaultNow(),
});

// Foreign key to migration_history.migration_id is defined in SQL migration, not here
// to avoid Drizzle trying to manage it (Drizzle doesn't fully support FKs to unique non-PK columns)
export const migrationErrors = pgTable("migration_errors", {
  id: serial("id").primaryKey(),
  migrationId: text("migration_id").notNull(), // FK to migration_history.migration_id (defined in SQL)
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  message: text("message").notNull(),
  recordId: text("record_id"),
  recordData: jsonb("record_data"), // Additional record context
  stack: text("stack"), // Stack trace if available
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced types with validation
export type InsertUserEnhanced = z.infer<typeof insertUserSchemaEnhanced>;
export type InsertClientEnhanced = z.infer<typeof insertClientSchemaEnhanced>;
// Backwards compaProfileEnhanced = z.infer<typeof insertProfile
export type InsertCompanyEnhanced = InsertClientEnhanced;
export type InsertAccountEnhanced = z.infer<typeof insertAccountSchemaEnhanced>;
export type InsertJournalEntryEnhanced = z.infer<typeof insertJournalEntrySchemaEnhanced>;
export type InsertJournalEntryLineEnhanced = z.infer<typeof insertJournalEntryLineSchemaEnhanced>;
export type JournalEntryWithLines = z.infer<typeof journalEntryWithLinesSchema>;

// TaxDome Types - REMOVED (Migrated to Supabase)

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => profiles.id).notNull(),
  type: text("type").notNull(), // 'task_assigned', 'task_update', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(profiles, { fields: [notifications.userId], references: [profiles.id] }),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

// Conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title"),
  type: text("type").notNull().default("direct"), // 'direct', 'group', 'client'
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at"),
  isArchived: boolean("is_archived").default(false).notNull(),
});

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  client: one(clients, { fields: [conversations.clientId], references: [clients.id] }),
  createdByUser: one(profiles, { fields: [conversations.createdBy], references: [profiles.id] }),
  participants: many(conversationParticipants),
  messages: many(messages),
}));

// Conversation Participants table
export const conversationParticipants = pgTable("conversation_participants", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastReadAt: timestamp("last_read_at"),
  isMuted: boolean("is_muted").default(false).notNull(),
});

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, { fields: [conversationParticipants.conversationId], references: [conversations.id] }),
  user: one(profiles, { fields: [conversationParticipants.userId], references: [profiles.id] }),
}));

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  senderId: uuid("sender_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("text"), // 'text', 'file', 'system'
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isEdited: boolean("is_edited").default(false).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  sender: one(profiles, { fields: [messages.senderId], references: [profiles.id] }),
}));

// Google Drive Downloads Table (Phase 1)
export const gdriveDownloads = pgTable("gdrive_downloads", {
  id: serial("id").primaryKey(),
  gdriveFileId: text("gdrive_file_id").notNull(),
  filename: text("filename").notNull(),
  downloadTimestamp: timestamp("download_timestamp").defaultNow().notNull(),
  fileSizeBytes: numeric("file_size_bytes"),
  localFilePath: text("local_file_path").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'downloading', 'completed', 'failed'
  fileHash: text("file_hash"),
  createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// MSSQL Restores Table (Phase 2) - Enhanced from backup_restore_history
export const mssqlRestores = pgTable("mssql_restores", {
  id: serial("id").primaryKey(),
  downloadId: integer("download_id").references(() => gdriveDownloads.id, { onDelete: "set null" }),
  googleDriveFileId: text("google_drive_file_id"), // Keep for backward compatibility
  googleDriveFileName: text("google_drive_file_name").notNull(),
  supabaseStoragePath: text("supabase_storage_path"),
  fileHash: text("file_hash"),
  storageSource: text("storage_source").notNull().default("google_drive"), // 'google_drive' or 'supabase_storage'
  restoredDbName: text("restored_db_name").notNull(), // Renamed from tempDatabaseName
  restoreTimestamp: timestamp("restore_timestamp").defaultNow().notNull(), // Renamed from startedAt
  originalBackupDate: timestamp("original_backup_date"), // From MSSQL backup header
  databaseSizeMb: decimal("database_size_mb", { precision: 10, scale: 2 }), // Calculated after restore
  isActive: boolean("is_active").default(true), // For cleanup tracking
  localBackupPath: text("local_backup_path"), // Path to downloaded .bak file
  restoreStatus: text("restore_status").notNull().default("pending"), // 'pending', 'downloading', 'restoring', 'migrating', 'completed', 'failed'
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  restoreOptions: jsonb("restore_options"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Backup Migration Logs Table (Phase 3) - Tracks migrations from restored MSSQL databases to PostgreSQL
export const backupMigrationLogs = pgTable("backup_migration_logs", {
  id: serial("id").primaryKey(),
  restoreId: integer("restore_id").references(() => mssqlRestores.id, { onDelete: "cascade" }),
  sourceTable: text("source_table").notNull(),
  targetTable: text("target_table").notNull(),
  recordsProcessed: integer("records_processed").default(0),
  recordsInserted: integer("records_inserted").default(0),
  recordsFailed: integer("records_failed").default(0),
  migrationTimestamp: timestamp("migration_timestamp").defaultNow().notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'running', 'completed', 'failed'
  errorLog: text("error_log"),
  createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Legacy table name for backward compatibility (will be migrated)
export const backupRestoreHistory = mssqlRestores;

// Insert schemas
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants).omit({ id: true, joinedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, updatedAt: true, isEdited: true, isDeleted: true });
export const insertGdriveDownloadsSchema = createInsertSchema(gdriveDownloads).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMssqlRestoresSchema = createInsertSchema(mssqlRestores).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBackupMigrationLogsSchema = createInsertSchema(backupMigrationLogs).omit({ id: true, createdAt: true, updatedAt: true });
// Legacy schema for backward compatibility
export const insertBackupRestoreHistorySchema = insertMssqlRestoresSchema;

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type"),
  size: integer("size"),
  clientId: uuid("client_id").references(() => clients.id),
  uploadedBy: uuid("uploaded_by").references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, updatedAt: true });

// ============================================================================
// RBAC & User Management
// ============================================================================

export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'admin', 'manager', 'accountant', 'client'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserRolesSchema = createInsertSchema(userRoles).omit({ id: true, createdAt: true, updatedAt: true });

// ============================================================================
// CRM Module - Client Management
// ============================================================================

export const clientContacts = pgTable("client_contacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  position: text("position"),
  isPrimary: boolean("is_primary").default(false),
  notes: text("notes"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientContactsSchema = createInsertSchema(clientContacts).omit({ id: true, createdAt: true, updatedAt: true });

export const clientTeamAssignments = pgTable("client_team_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  role: text("role"), // 'lead', 'accountant', 'assistant', etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientTeamAssignmentsSchema = createInsertSchema(clientTeamAssignments).omit({ id: true, createdAt: true });

export const clientServices = pgTable("client_services", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  serviceName: text("service_name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  billingFrequency: text("billing_frequency"), // 'monthly', 'quarterly', 'annually', 'one-time'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientServicesSchema = createInsertSchema(clientServices).omit({ id: true, createdAt: true, updatedAt: true });

// ============================================================================
// CRM Module - Deals & Pipeline
// ============================================================================

export const dealStages = pgTable("deal_stages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  probability: integer("probability").default(0), // 0-100
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDealStagesSchema = createInsertSchema(dealStages).omit({ id: true, createdAt: true });

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  stageId: uuid("stage_id").references(() => dealStages.id, { onDelete: "set null" }),
  ownerId: uuid("owner_id").references(() => profiles.id, { onDelete: "set null" }),
  value: decimal("value", { precision: 12, scale: 2 }),
  currency: text("currency").default("GEL"),
  expectedCloseDate: timestamp("expected_close_date"),
  actualCloseDate: timestamp("actual_close_date"),
  status: text("status").default("open"), // 'open', 'won', 'lost'
  priority: text("priority").default("medium"), // 'low', 'medium', 'high'
  description: text("description"),
  metadata: jsonb("metadata"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDealsSchema = createInsertSchema(deals).omit({ id: true, createdAt: true, updatedAt: true });

export const dealActivities = pgTable("deal_activities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  activityType: text("activity_type").notNull(), // 'note', 'call', 'email', 'meeting'
  subject: text("subject"),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDealActivitiesSchema = createInsertSchema(dealActivities).omit({ id: true, createdAt: true });

export const dealContacts = pgTable("deal_contacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  contactId: uuid("contact_id").references(() => clientContacts.id, { onDelete: "cascade" }).notNull(),
  role: text("role"), // 'decision_maker', 'influencer', 'user'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDealContactsSchema = createInsertSchema(dealContacts).omit({ id: true, createdAt: true });

// ============================================================================
// Workflow & Task Management Module
// ============================================================================

export const workflowTemplates = pgTable("workflow_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type"), // 'onboarding', 'monthly_close', 'year_end', 'audit', 'custom'
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWorkflowTemplatesSchema = createInsertSchema(workflowTemplates).omit({ id: true, createdAt: true, updatedAt: true });

export const workflowStages = pgTable("workflow_stages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: uuid("template_id").references(() => workflowTemplates.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWorkflowStagesSchema = createInsertSchema(workflowStages).omit({ id: true, createdAt: true });

export const clientPipelines = pgTable("client_pipelines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientPipelinesSchema = createInsertSchema(clientPipelines).omit({ id: true, createdAt: true, updatedAt: true });

export const clientPipelineStages = pgTable("client_pipeline_stages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  pipelineId: uuid("pipeline_id").references(() => clientPipelines.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClientPipelineStagesSchema = createInsertSchema(clientPipelineStages).omit({ id: true, createdAt: true });

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: uuid("template_id").references(() => workflowTemplates.id, { onDelete: "set null" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  currentStageId: uuid("current_stage_id").references(() => workflowStages.id, { onDelete: "set null" }),
  status: text("status").default("active"), // 'active', 'completed', 'cancelled'
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWorkflowsSchema = createInsertSchema(workflows).omit({ id: true, createdAt: true, updatedAt: true });

export const workflowStageHistory = pgTable("workflow_stage_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "cascade" }).notNull(),
  stageId: uuid("stage_id").references(() => workflowStages.id, { onDelete: "cascade" }).notNull(),
  enteredAt: timestamp("entered_at").defaultNow(),
  exitedAt: timestamp("exited_at"),
  notes: text("notes"),
});

export const insertWorkflowStageHistorySchema = createInsertSchema(workflowStageHistory).omit({ id: true, enteredAt: true });

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  workflowId: uuid("workflow_id").references(() => workflows.id, { onDelete: "cascade" }),
  assignedTo: uuid("assigned_to").references(() => profiles.id, { onDelete: "set null" }),
  status: text("status").default("pending"), // 'pending', 'in_progress', 'completed', 'cancelled'
  priority: text("priority").default("medium"), // 'low', 'medium', 'high', 'urgent'
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  tags: jsonb("tags"),
  metadata: jsonb("metadata"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTasksSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });

export const taskTemplates = pgTable("task_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowStageId: uuid("workflow_stage_id").references(() => workflowStages.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  defaultAssignee: uuid("default_assignee").references(() => profiles.id, { onDelete: "set null" }),
  estimatedDays: integer("estimated_days"),
  priority: text("priority").default("medium"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskTemplatesSchema = createInsertSchema(taskTemplates).omit({ id: true, createdAt: true });

export const clientTaskTemplates = pgTable("client_task_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  recurringFrequency: text("recurring_frequency"), // 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientTaskTemplatesSchema = createInsertSchema(clientTaskTemplates).omit({ id: true, createdAt: true, updatedAt: true });

export const checklists = pgTable("checklists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  items: jsonb("items").notNull(), // Array of { text: string, completed: boolean }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChecklistsSchema = createInsertSchema(checklists).omit({ id: true, createdAt: true, updatedAt: true });

export const taskComments = pgTable("task_comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskCommentsSchema = createInsertSchema(taskComments).omit({ id: true, createdAt: true, updatedAt: true });

// ============================================================================
// Calendar Module
// ============================================================================

export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  eventType: text("event_type"), // 'meeting', 'deadline', 'reminder', 'task'
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  organizerId: uuid("organizer_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  isAllDay: boolean("is_all_day").default(false),
  recurrence: jsonb("recurrence"), // Recurrence rules
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCalendarEventsSchema = createInsertSchema(calendarEvents).omit({ id: true, createdAt: true, updatedAt: true });

export const calendarEventParticipants = pgTable("calendar_event_participants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: uuid("event_id").references(() => calendarEvents.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  responseStatus: text("response_status").default("pending"), // 'pending', 'accepted', 'declined', 'tentative'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCalendarEventParticipantsSchema = createInsertSchema(calendarEventParticipants).omit({ id: true, createdAt: true });

// ============================================================================
// Feed/Social Module
// ============================================================================

export const feedProfiles = pgTable("feed_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }).notNull().unique(),
  bio: text("bio"),
  followersCount: integer("followers_count").default(0),
  followingCount: integer("following_count").default(0),
  postsCount: integer("posts_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFeedProfilesSchema = createInsertSchema(feedProfiles).omit({ id: true, createdAt: true, updatedAt: true });

export const feedPosts = pgTable("feed_posts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  authorId: uuid("author_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  attachments: jsonb("attachments"), // URLs, file metadata
  visibility: text("visibility").default("public"), // 'public', 'private', 'team', 'client'
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFeedPostsSchema = createInsertSchema(feedPosts).omit({ id: true, createdAt: true, updatedAt: true });

export const feedComments = pgTable("feed_comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid("post_id").references(() => feedPosts.id, { onDelete: "cascade" }).notNull(),
  authorId: uuid("author_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFeedCommentsSchema = createInsertSchema(feedComments).omit({ id: true, createdAt: true, updatedAt: true });

export const feedLikes = pgTable("feed_likes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid("post_id").references(() => feedPosts.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeedLikesSchema = createInsertSchema(feedLikes).omit({ id: true, createdAt: true });

// ============================================================================
// Passwords Module (Secure Vault)
// ============================================================================

export const passwordFolders = pgTable("password_folders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id"), // Self-referential for nested folders
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPasswordFoldersSchema = createInsertSchema(passwordFolders).omit({ id: true, createdAt: true, updatedAt: true });

export const passwords = pgTable("passwords", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  folderId: uuid("folder_id").references(() => passwordFolders.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  username: text("username"),
  encryptedPassword: text("encrypted_password").notNull(), // Must be encrypted at application level
  url: text("url"),
  notes: text("notes"),
  tags: jsonb("tags"),
  createdBy: uuid("created_by").references(() => profiles.id),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPasswordsSchema = createInsertSchema(passwords).omit({ id: true, createdAt: true, updatedAt: true, lastAccessedAt: true });

