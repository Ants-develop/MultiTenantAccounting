import { db } from "./db";
import { sql } from "drizzle-orm";
import * as schema from "@shared/schema";

/**
 * Expected schema from shared/schema.ts
 * Maps Drizzle schema definitions to expected database structure
 */
interface ExpectedTable {
  name: string;
  columns: ExpectedColumn[];
  primaryKey?: string;
  indexes?: string[];
  constraints?: string[];
}

interface ExpectedColumn {
  name: string;
  type: string;
  nullable: boolean;
  default?: string | boolean | number;
  unique?: boolean;
}

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  indexes: string[];
  constraints: string[];
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  unique: boolean;
}

interface ValidationResult {
  isValid: boolean;
  missingTables: string[];
  extraTables: string[];
  tableDifferences: TableDifference[];
  errors: string[];
  warnings: string[];
}

interface TableDifference {
  table: string;
  missingColumns: string[];
  extraColumns: string[];
  columnDifferences: ColumnDifference[];
}

interface ColumnDifference {
  column: string;
  expected: ExpectedColumn;
  actual: ColumnInfo;
  issues: string[];
}

/**
 * Get expected schema from shared/schema.ts
 * Maps Drizzle schema to expected database structure
 */
function getExpectedSchema(): ExpectedTable[] {
  const tables: ExpectedTable[] = [];

  // Users table
  tables.push({
    name: "users",
    columns: [
      { name: "id", type: "integer", nullable: false },
      { name: "username", type: "text", nullable: false, unique: true },
      { name: "email", type: "text", nullable: false, unique: true },
      { name: "password", type: "text", nullable: false },
      { name: "first_name", type: "text", nullable: false },
      { name: "last_name", type: "text", nullable: false },
      { name: "global_role", type: "text", nullable: true, default: "user" },
      { name: "is_active", type: "boolean", nullable: true, default: true },
      { name: "created_at", type: "timestamp", nullable: true },
    ],
    primaryKey: "id",
  });

  // Companies table
  tables.push({
    name: "companies",
    columns: [
      { name: "id", type: "integer", nullable: false },
      { name: "name", type: "text", nullable: false },
      { name: "code", type: "text", nullable: false, unique: true },
      { name: "tenant_code", type: "integer", nullable: true, unique: true },
      { name: "address", type: "text", nullable: true },
      { name: "phone", type: "text", nullable: true },
      { name: "email", type: "text", nullable: true },
      { name: "tax_id", type: "text", nullable: true },
      { name: "fiscal_year_start", type: "integer", nullable: true, default: 1 },
      { name: "currency", type: "text", nullable: true, default: "GEL" },
      { name: "is_active", type: "boolean", nullable: true, default: true },
      { name: "created_at", type: "timestamp", nullable: true },
    ],
    primaryKey: "id",
  });

  // User companies table
  tables.push({
    name: "user_companies",
    columns: [
      { name: "id", type: "integer", nullable: false },
      { name: "user_id", type: "integer", nullable: true },
      { name: "company_id", type: "integer", nullable: false },
      { name: "role", type: "text", nullable: false },
      { name: "is_active", type: "boolean", nullable: true, default: true },
      { name: "created_at", type: "timestamp", nullable: true },
    ],
    primaryKey: "id",
  });

  // Accounts table
  tables.push({
    name: "accounts",
    columns: [
      { name: "id", type: "integer", nullable: false },
      { name: "company_id", type: "integer", nullable: false },
      { name: "code", type: "text", nullable: false },
      { name: "name", type: "text", nullable: false },
      { name: "type", type: "text", nullable: false },
      { name: "sub_type", type: "text", nullable: true },
      { name: "parent_id", type: "integer", nullable: true },
      { name: "account_class", type: "text", nullable: true },
      { name: "category", type: "text", nullable: true },
      { name: "is_subaccount_allowed", type: "boolean", nullable: true, default: false },
      { name: "is_foreign_currency", type: "boolean", nullable: true, default: false },
      { name: "is_analytical", type: "boolean", nullable: true, default: false },
      { name: "is_active", type: "boolean", nullable: true, default: true },
      { name: "created_at", type: "timestamp", nullable: true },
    ],
    primaryKey: "id",
  });

  // Journal entries table (with MSSQL parity fields)
  tables.push({
    name: "journal_entries",
    columns: [
      { name: "id", type: "integer", nullable: false },
      { name: "company_id", type: "integer", nullable: false },
      { name: "entry_number", type: "text", nullable: false },
      { name: "date", type: "timestamp", nullable: false },
      { name: "description", type: "text", nullable: false },
      { name: "reference", type: "text", nullable: true },
      { name: "total_amount", type: "numeric(15,2)", nullable: false },
      { name: "user_id", type: "integer", nullable: true },
      { name: "is_posted", type: "boolean", nullable: true, default: false },
      { name: "tenant_code", type: "integer", nullable: true },
      { name: "tenant_name", type: "text", nullable: true },
      { name: "abonent", type: "text", nullable: true },
      { name: "postings_period", type: "timestamp", nullable: true },
      { name: "register", type: "text", nullable: true },
      { name: "branch", type: "text", nullable: true },
      { name: "content_text", type: "text", nullable: true },
      { name: "responsible_person", type: "text", nullable: true },
      { name: "account_dr", type: "text", nullable: true },
      { name: "account_name_dr", type: "text", nullable: true },
      { name: "analytic_dr", type: "text", nullable: true },
      { name: "analytic_ref_dr", type: "text", nullable: true },
      { name: "id_dr", type: "text", nullable: true },
      { name: "legal_form_dr", type: "text", nullable: true },
      { name: "country_dr", type: "text", nullable: true },
      { name: "profit_tax_dr", type: "boolean", nullable: true },
      { name: "withholding_tax_dr", type: "boolean", nullable: true },
      { name: "double_taxation_dr", type: "boolean", nullable: true },
      { name: "pension_scheme_participant_dr", type: "boolean", nullable: true },
      { name: "account_cr", type: "text", nullable: true },
      { name: "account_name_cr", type: "text", nullable: true },
      { name: "analytic_cr", type: "text", nullable: true },
      { name: "analytic_ref_cr", type: "text", nullable: true },
      { name: "id_cr", type: "text", nullable: true },
      { name: "legal_form_cr", type: "text", nullable: true },
      { name: "country_cr", type: "text", nullable: true },
      { name: "profit_tax_cr", type: "boolean", nullable: true },
      { name: "withholding_tax_cr", type: "boolean", nullable: true },
      { name: "double_taxation_cr", type: "boolean", nullable: true },
      { name: "pension_scheme_participant_cr", type: "boolean", nullable: true },
      { name: "currency", type: "text", nullable: true },
      { name: "amount", type: "numeric(21,2)", nullable: true },
      { name: "amount_cur", type: "numeric(21,2)", nullable: true },
      { name: "quantity_dr", type: "numeric(21,4)", nullable: true },
      { name: "quantity_cr", type: "numeric(21,4)", nullable: true },
      { name: "rate", type: "numeric(19,13)", nullable: true },
      { name: "document_rate", type: "numeric(19,13)", nullable: true },
      { name: "tax_invoice_number", type: "text", nullable: true },
      { name: "tax_invoice_date", type: "timestamp", nullable: true },
      { name: "tax_invoice_series", type: "text", nullable: true },
      { name: "waybill_number", type: "text", nullable: true },
      { name: "attached_files", type: "numeric(17,5)", nullable: true },
      { name: "doc_type", type: "text", nullable: true },
      { name: "doc_date", type: "timestamp", nullable: true },
      { name: "doc_number", type: "text", nullable: true },
      { name: "document_creation_date", type: "timestamp", nullable: true },
      { name: "document_modify_date", type: "timestamp", nullable: true },
      { name: "document_comments", type: "text", nullable: true },
      { name: "posting_number", type: "integer", nullable: true },
      { name: "created_at", type: "timestamp", nullable: true },
    ],
    primaryKey: "id",
  });

  // Journal entry lines
  tables.push({
    name: "journal_entry_lines",
    columns: [
      { name: "id", type: "integer", nullable: false },
      { name: "journal_entry_id", type: "integer", nullable: false },
      { name: "account_id", type: "integer", nullable: false },
      { name: "description", type: "text", nullable: true },
      { name: "debit_amount", type: "numeric(15,2)", nullable: true, default: "0" },
      { name: "credit_amount", type: "numeric(15,2)", nullable: true, default: "0" },
      { name: "created_at", type: "timestamp", nullable: true },
    ],
    primaryKey: "id",
  });

  // Customers
  tables.push({
    name: "customers",
    columns: [
      { name: "id", type: "integer", nullable: false },
      { name: "company_id", type: "integer", nullable: false },
      { name: "name", type: "text", nullable: false },
      { name: "email", type: "text", nullable: true },
      { name: "phone", type: "text", nullable: true },
      { name: "address", type: "text", nullable: true },
      { name: "is_active", type: "boolean", nullable: true, default: true },
      { name: "created_at", type: "timestamp", nullable: true },
    ],
    primaryKey: "id",
  });

  // Vendors
  tables.push({
    name: "vendors",
    columns: [
      { name: "id", type: "integer", nullable: false },
      { name: "company_id", type: "integer", nullable: false },
      { name: "name", type: "text", nullable: false },
      { name: "email", type: "text", nullable: true },
      { name: "phone", type: "text", nullable: true },
      { name: "address", type: "text", nullable: true },
      { name: "is_active", type: "boolean", nullable: true, default: true },
      { name: "created_at", type: "timestamp", nullable: true },
    ],
    primaryKey: "id",
  });

  // Invoices
  tables.push({
    name: "invoices",
    columns: [
      { name: "id", type: "integer", nullable: false },
      { name: "company_id", type: "integer", nullable: false },
      { name: "customer_id", type: "integer", nullable: false },
      { name: "invoice_number", type: "text", nullable: false },
      { name: "date", type: "timestamp", nullable: false },
      { name: "due_date", type: "timestamp", nullable: false },
      { name: "subtotal", type: "numeric(15,2)", nullable: false },
      { name: "tax_amount", type: "numeric(15,2)", nullable: true, default: "0" },
      { name: "total_amount", type: "numeric(15,2)", nullable: false },
      { name: "status", type: "text", nullable: true, default: "draft" },
      { name: "user_id", type: "integer", nullable: true },
      { name: "created_at", type: "timestamp", nullable: true },
    ],
    primaryKey: "id",
  });

  // Bills
  tables.push({
    name: "bills",
    columns: [
      { name: "id", type: "integer", nullable: false },
      { name: "company_id", type: "integer", nullable: false },
      { name: "vendor_id", type: "integer", nullable: false },
      { name: "bill_number", type: "text", nullable: false },
      { name: "date", type: "timestamp", nullable: false },
      { name: "due_date", type: "timestamp", nullable: false },
      { name: "subtotal", type: "numeric(15,2)", nullable: false },
      { name: "tax_amount", type: "numeric(15,2)", nullable: true, default: "0" },
      { name: "total_amount", type: "numeric(15,2)", nullable: false },
      { name: "status", type: "text", nullable: true, default: "draft" },
      { name: "user_id", type: "integer", nullable: true },
      { name: "created_at", type: "timestamp", nullable: true },
    ],
    primaryKey: "id",
  });

  // Activity logs
  tables.push({
    name: "activity_logs",
    columns: [
      { name: "id", type: "integer", nullable: false },
      { name: "user_id", type: "integer", nullable: true }, // Made nullable in migration 004
      { name: "company_id", type: "integer", nullable: true }, // Added in later migrations
      { name: "action", type: "text", nullable: false },
      { name: "resource", type: "text", nullable: false },
      { name: "resource_id", type: "integer", nullable: true },
      { name: "details", type: "text", nullable: true },
      { name: "ip_address", type: "text", nullable: true },
      { name: "user_agent", type: "text", nullable: true },
      { name: "timestamp", type: "timestamp", nullable: false },
    ],
    primaryKey: "id",
  });

  // Company settings
  tables.push({
    name: "company_settings",
    columns: [
      { name: "id", type: "integer", nullable: false },
      { name: "company_id", type: "integer", nullable: false, unique: true },
      { name: "email_notifications", type: "boolean", nullable: true, default: true },
      { name: "invoice_reminders", type: "boolean", nullable: true, default: true },
      { name: "payment_alerts", type: "boolean", nullable: true, default: true },
      { name: "report_reminders", type: "boolean", nullable: true, default: false },
      { name: "system_updates", type: "boolean", nullable: true, default: true },
      { name: "auto_numbering", type: "boolean", nullable: true, default: true },
      { name: "invoice_prefix", type: "text", nullable: true, default: "INV" },
      { name: "bill_prefix", type: "text", nullable: true, default: "BILL" },
      { name: "journal_prefix", type: "text", nullable: true, default: "JE" },
      { name: "decimal_places", type: "integer", nullable: true, default: 2 },
      { name: "negative_format", type: "text", nullable: true, default: "minus" },
      { name: "date_format", type: "text", nullable: true, default: "MM/DD/YYYY" },
      { name: "time_zone", type: "text", nullable: true, default: "America/New_York" },
      { name: "require_password_change", type: "boolean", nullable: true, default: false },
      { name: "password_expire_days", type: "integer", nullable: true, default: 90 },
      { name: "session_timeout", type: "integer", nullable: true, default: 30 },
      { name: "enable_two_factor", type: "boolean", nullable: true, default: false },
      { name: "allow_multiple_sessions", type: "boolean", nullable: true, default: true },
      { name: "bank_connection", type: "boolean", nullable: true, default: false },
      { name: "payment_gateway", type: "boolean", nullable: true, default: false },
      { name: "tax_service", type: "boolean", nullable: true, default: false },
      { name: "reporting_tools", type: "boolean", nullable: true, default: false },
      { name: "auto_backup", type: "boolean", nullable: true, default: false },
      { name: "backup_frequency", type: "text", nullable: true, default: "weekly" },
      { name: "retention_days", type: "integer", nullable: true, default: 30 },
      { name: "backup_location", type: "text", nullable: true, default: "cloud" },
      { name: "created_at", type: "timestamp", nullable: true },
      { name: "updated_at", type: "timestamp", nullable: true },
    ],
    primaryKey: "id",
  });

  // General ledger (from migration 003, not in schema.ts but exists in DB)
  tables.push({
    name: "general_ledger",
    columns: [
      { name: "id", type: "integer", nullable: false },
      { name: "company_id", type: "integer", nullable: false },
      { name: "tenant_code", type: "numeric", nullable: true },
      { name: "tenant_name", type: "varchar(100)", nullable: true },
      { name: "abonent", type: "varchar(64)", nullable: true },
      { name: "postings_period", type: "timestamp", nullable: true },
      { name: "register", type: "bytea", nullable: true },
      { name: "branch", type: "varchar(150)", nullable: true },
      { name: "content", type: "varchar(150)", nullable: true },
      { name: "responsible_person", type: "varchar(100)", nullable: true },
      { name: "account_dr", type: "varchar(26)", nullable: true },
      { name: "account_name_dr", type: "varchar(120)", nullable: true },
      { name: "analytic_dr", type: "varchar(150)", nullable: true },
      { name: "analytic_ref_dr", type: "bytea", nullable: true },
      { name: "id_dr", type: "varchar(50)", nullable: true },
      { name: "legal_form_dr", type: "varchar(50)", nullable: true },
      { name: "country_dr", type: "varchar(60)", nullable: true },
      { name: "profit_tax_dr", type: "boolean", nullable: true },
      { name: "withholding_tax_dr", type: "boolean", nullable: true },
      { name: "double_taxation_dr", type: "boolean", nullable: true },
      { name: "pension_scheme_participant_dr", type: "boolean", nullable: true },
      { name: "account_cr", type: "varchar(26)", nullable: true },
      { name: "account_name_cr", type: "varchar(120)", nullable: true },
      { name: "analytic_cr", type: "varchar(150)", nullable: true },
      { name: "analytic_ref_cr", type: "bytea", nullable: true },
      { name: "id_cr", type: "varchar(50)", nullable: true },
      { name: "legal_form_cr", type: "varchar(50)", nullable: true },
      { name: "country_cr", type: "varchar(60)", nullable: true },
      { name: "profit_tax_cr", type: "boolean", nullable: true },
      { name: "withholding_tax_cr", type: "boolean", nullable: true },
      { name: "double_taxation_cr", type: "boolean", nullable: true },
      { name: "pension_scheme_participant_cr", type: "boolean", nullable: true },
      { name: "currency", type: "varchar(10)", nullable: true },
      { name: "amount", type: "numeric", nullable: true },
      { name: "amount_cur", type: "numeric", nullable: true },
      { name: "quantity_dr", type: "numeric", nullable: true },
      { name: "quantity_cr", type: "numeric", nullable: true },
      { name: "rate", type: "numeric", nullable: true },
      { name: "document_rate", type: "numeric", nullable: true },
      { name: "tax_invoice_number", type: "varchar(30)", nullable: true },
      { name: "tax_invoice_date", type: "timestamp", nullable: true },
      { name: "tax_invoice_series", type: "varchar(20)", nullable: true },
      { name: "waybill_number", type: "varchar(1024)", nullable: true },
      { name: "attached_files", type: "numeric", nullable: true },
      { name: "doc_type", type: "varchar(50)", nullable: true },
      { name: "doc_date", type: "timestamp", nullable: true },
      { name: "doc_number", type: "varchar(30)", nullable: true },
      { name: "document_creation_date", type: "timestamp", nullable: true },
      { name: "document_modify_date", type: "timestamp", nullable: true },
      { name: "document_comments", type: "varchar(1024)", nullable: true },
      { name: "posting_number", type: "numeric", nullable: true },
      { name: "created_at", type: "timestamp", nullable: true },
      { name: "updated_at", type: "timestamp", nullable: true },
    ],
    primaryKey: "id",
  });

  return tables;
}

/**
 * Get actual database structure
 */
async function getActualSchema(): Promise<TableInfo[]> {
  const tables: TableInfo[] = [];

  // Get all tables
  const tablesResult = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const tableNames = (tablesResult.rows as { table_name: string }[]).map(
    (row) => row.table_name
  );

  for (const tableName of tableNames) {
    // Get columns
    const columnsResult = await db.execute(sql.raw(`
      SELECT 
        column_name,
        data_type,
        udt_name,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}'
      ORDER BY ordinal_position
    `));

    const columns: ColumnInfo[] = (columnsResult.rows as any[]).map((row) => {
      let type = row.data_type;
      if (row.udt_name === "numeric" || row.udt_name === "decimal") {
        type = `numeric(${row.numeric_precision},${row.numeric_scale})`;
      } else if (row.udt_name?.startsWith("varchar") && row.character_maximum_length) {
        type = `varchar(${row.character_maximum_length})`;
      } else if (row.udt_name === "int4") {
        type = "integer";
      } else if (row.udt_name === "bool") {
        type = "boolean";
      } else if (row.udt_name === "timestamp") {
        type = "timestamp";
      } else if (row.udt_name === "text") {
        type = "text";
      } else if (row.udt_name === "bytea") {
        type = "bytea";
      } else if (row.udt_name === "serial") {
        type = "integer";
      }

      return {
        name: row.column_name,
        type: type || row.udt_name || row.data_type,
        nullable: row.is_nullable === "YES",
        default: row.column_default,
        unique: false, // Will check separately
      };
    });

    // Get indexes
    const indexesResult = await db.execute(sql.raw(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = '${tableName}'
      AND indexname NOT LIKE '%_pkey'
    `));

    const indexes = (indexesResult.rows as { indexname: string }[]).map(
      (row) => row.indexname
    );

    // Get constraints
    const constraintsResult = await db.execute(sql.raw(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name = '${tableName}'
      AND constraint_type != 'PRIMARY KEY'
    `));

    const constraints = (constraintsResult.rows as any[]).map(
      (row) => row.constraint_name
    );

    tables.push({
      name: tableName,
      columns,
      indexes,
      constraints,
    });
  }

  return tables;
}

/**
 * Compare expected schema with actual database
 */
async function validateSchema(): Promise<ValidationResult> {
  const expected = getExpectedSchema();
  const actual = await getActualSchema();

  const result: ValidationResult = {
    isValid: true,
    missingTables: [],
    extraTables: [],
    tableDifferences: [],
    errors: [],
    warnings: [],
  };

  const actualTableNames = actual.map((t) => t.name);
  const expectedTableNames = expected.map((t) => t.name);

  // Find missing tables
  result.missingTables = expectedTableNames.filter(
    (name) => !actualTableNames.includes(name)
  );

  // Find extra tables (exist in DB but not in schema)
  result.extraTables = actualTableNames.filter(
    (name) => !expectedTableNames.includes(name)
  );

  // Compare each expected table
  for (const expectedTable of expected) {
    const actualTable = actual.find((t) => t.name === expectedTable.name);

    if (!actualTable) {
      result.errors.push(`Table '${expectedTable.name}' does not exist in database`);
      result.isValid = false;
      continue;
    }

    const diff: TableDifference = {
      table: expectedTable.name,
      missingColumns: [],
      extraColumns: [],
      columnDifferences: [],
    };

    const actualColumnNames = actualTable.columns.map((c) => c.name);
    const expectedColumnNames = expectedTable.columns.map((c) => c.name);

    // Find missing columns
    diff.missingColumns = expectedColumnNames.filter(
      (name) => !actualColumnNames.includes(name)
    );

    // Find extra columns
    diff.extraColumns = actualColumnNames.filter(
      (name) => !expectedColumnNames.includes(name)
    );

    // Compare each column
    for (const expectedCol of expectedTable.columns) {
      const actualCol = actualTable.columns.find(
        (c) => c.name === expectedCol.name
      );

      if (!actualCol) {
        continue; // Already in missingColumns
      }

      const columnDiff: ColumnDifference = {
        column: expectedCol.name,
        expected: expectedCol,
        actual: actualCol,
        issues: [],
      };

      // Check type compatibility (loose check - numeric precision can vary)
      const expectedTypeBase = expectedCol.type.replace(/\(\d+,\d+\)/, "").replace(/\(\d+\)/, "");
      const actualTypeBase = actualCol.type.replace(/\(\d+,\d+\)/, "").replace(/\(\d+\)/, "");
      
      if (expectedTypeBase !== actualTypeBase && !isTypeCompatible(expectedTypeBase, actualTypeBase)) {
        columnDiff.issues.push(
          `Type mismatch: expected ${expectedCol.type}, got ${actualCol.type}`
        );
      }

      // Check nullable
      if (expectedCol.nullable !== actualCol.nullable) {
        columnDiff.issues.push(
          `Nullable mismatch: expected ${expectedCol.nullable ? "nullable" : "NOT NULL"}, got ${actualCol.nullable ? "nullable" : "NOT NULL"}`
        );
      }

      if (columnDiff.issues.length > 0) {
        diff.columnDifferences.push(columnDiff);
      }
    }

    if (
      diff.missingColumns.length > 0 ||
      diff.extraColumns.length > 0 ||
      diff.columnDifferences.length > 0
    ) {
      result.tableDifferences.push(diff);
      if (diff.missingColumns.length > 0) {
        result.isValid = false;
      }
    }
  }

  // Warnings for extra tables
  if (result.extraTables.length > 0) {
    result.warnings.push(
      `Found ${result.extraTables.length} extra table(s) in database not defined in schema: ${result.extraTables.join(", ")}`
    );
  }

  return result;
}

/**
 * Check if types are compatible (loose check)
 */
function isTypeCompatible(expected: string, actual: string): boolean {
  const compatMap: Record<string, string[]> = {
    integer: ["int4", "integer", "int", "serial"],
    text: ["text", "varchar", "character varying"],
    boolean: ["bool", "boolean"],
    timestamp: ["timestamp", "timestamp without time zone"],
    numeric: ["numeric", "decimal", "numeric(21,2)", "numeric(19,13)"],
  };

  return compatMap[expected]?.includes(actual) || false;
}

/**
 * Print validation results in a readable format
 */
export function printValidationResults(result: ValidationResult): void {
  console.log("\n" + "=".repeat(80));
  console.log("DATABASE SCHEMA VALIDATION REPORT");
  console.log("=".repeat(80) + "\n");

  if (result.isValid && result.tableDifferences.length === 0) {
    console.log("✅ Schema validation PASSED");
    console.log("   All tables and columns match expected schema\n");
    return;
  }

  console.log("❌ Schema validation FAILED\n");

  if (result.missingTables.length > 0) {
    console.log(`❌ Missing Tables (${result.missingTables.length}):`);
    result.missingTables.forEach((table) => {
      console.log(`   - ${table}`);
    });
    console.log("");
  }

  if (result.extraTables.length > 0) {
    console.log(`⚠️  Extra Tables (${result.extraTables.length}):`);
    result.extraTables.forEach((table) => {
      console.log(`   - ${table}`);
    });
    console.log("");
  }

  if (result.tableDifferences.length > 0) {
    console.log(`📊 Table Differences (${result.tableDifferences.length}):\n`);
    
    result.tableDifferences.forEach((diff) => {
      console.log(`Table: ${diff.table}`);
      
      if (diff.missingColumns.length > 0) {
        console.log(`  ❌ Missing columns (${diff.missingColumns.length}):`);
        diff.missingColumns.forEach((col) => {
          console.log(`     - ${col}`);
        });
      }
      
      if (diff.extraColumns.length > 0) {
        console.log(`  ⚠️  Extra columns (${diff.extraColumns.length}):`);
        diff.extraColumns.forEach((col) => {
          console.log(`     - ${col}`);
        });
      }
      
      if (diff.columnDifferences.length > 0) {
        console.log(`  ⚠️  Column differences (${diff.columnDifferences.length}):`);
        diff.columnDifferences.forEach((colDiff) => {
          console.log(`     - ${colDiff.column}:`);
          colDiff.issues.forEach((issue) => {
            console.log(`       • ${issue}`);
          });
        });
      }
      console.log("");
    });
  }

  if (result.errors.length > 0) {
    console.log(`❌ Errors (${result.errors.length}):`);
    result.errors.forEach((error) => {
      console.log(`   - ${error}`);
    });
    console.log("");
  }

  if (result.warnings.length > 0) {
    console.log(`⚠️  Warnings (${result.warnings.length}):`);
    result.warnings.forEach((warning) => {
      console.log(`   - ${warning}`);
    });
    console.log("");
  }

  console.log("=".repeat(80));
}

/**
 * Main validation function
 */
export async function validateDatabaseSchema(): Promise<ValidationResult> {
  try {
    console.log("🔍 Validating database schema...");
    const result = await validateSchema();
    printValidationResults(result);
    return result;
  } catch (error: any) {
    console.error("❌ Schema validation failed:", error.message);
    throw error;
  }
}

