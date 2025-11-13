import { db } from "./db";
import { sql } from "drizzle-orm";
import { 
  insertUserSchemaEnhanced,
  insertCompanySchemaEnhanced,
  insertAccountSchemaEnhanced,
  insertJournalEntrySchemaEnhanced,
  insertJournalEntryLineSchemaEnhanced,
  journalEntryWithLinesSchema,
  type InsertUserEnhanced,
  type InsertCompanyEnhanced,
  type InsertAccountEnhanced,
  type InsertJournalEntryEnhanced,
  type InsertJournalEntryLineEnhanced,
  type JournalEntryWithLines
} from "@shared/schema";
import { z } from "zod";

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DatabaseHealthCheck {
  isHealthy: boolean;
  issues: string[];
  performance: {
    connectionTime: number;
    queryTime: number;
  };
  schema: {
    tablesExist: boolean;
    foreignKeysValid: boolean;
    indexesOptimal: boolean;
  };
}

/**
 * Enhanced validation service for database operations
 */
export class DatabaseValidationService {

  /**
   * Validate data before insertion with comprehensive business rules
   */
  static async validateBeforeInsert<T>(
    schema: z.ZodSchema<T>, 
    data: unknown,
    additionalChecks?: (data: T) => Promise<string[]>
  ): Promise<SchemaValidationResult> {
    const result: SchemaValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Basic schema validation
      const validatedData = schema.parse(data);
      
      // Additional business logic checks
      if (additionalChecks) {
        const businessErrors = await additionalChecks(validatedData);
        result.errors.push(...businessErrors);
      }

      result.isValid = result.errors.length === 0;
      
    } catch (error) {
      result.isValid = false;
      if (error instanceof z.ZodError) {
        result.errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      } else {
        result.errors.push(`Validation error: ${error}`);
      }
    }

    return result;
  }

  /**
   * Validate user data with uniqueness checks
   */
  static async validateUser(userData: unknown): Promise<SchemaValidationResult> {
    return this.validateBeforeInsert(insertUserSchemaEnhanced, userData, async (data) => {
      const errors: string[] = [];
      
      try {
        // Check username uniqueness
        const existingUsername = await db.execute(
          sql`SELECT id FROM users WHERE username = ${data.username} LIMIT 1`
        );
        if (existingUsername.rows.length > 0) {
          errors.push("Username already exists");
        }

        // Check email uniqueness
        const existingEmail = await db.execute(
          sql`SELECT id FROM users WHERE email = ${data.email} LIMIT 1`
        );
        if (existingEmail.rows.length > 0) {
          errors.push("Email already exists");
        }
      } catch (dbError) {
        errors.push(`Database validation error: ${dbError}`);
      }

      return errors;
    });
  }

  /**
   * Validate company data with business rules
   */
  static async validateCompany(companyData: unknown): Promise<SchemaValidationResult> {
    return this.validateBeforeInsert(insertCompanySchemaEnhanced, companyData, async (data) => {
      const errors: string[] = [];
      
      try {
        // Check company code uniqueness
        const existingCode = await db.execute(
          sql`SELECT id FROM companies WHERE code = ${data.code} LIMIT 1`
        );
        if (existingCode.rows.length > 0) {
          errors.push("Company code already exists");
        }
      } catch (dbError) {
        errors.push(`Database validation error: ${dbError}`);
      }

      return errors;
    });
  }

  /**
   * Validate account data with chart of accounts rules
   */
  static async validateAccount(accountData: unknown): Promise<SchemaValidationResult> {
    return this.validateBeforeInsert(insertAccountSchemaEnhanced, accountData, async (data) => {
      const errors: string[] = [];
      
      try {
        // Check account code uniqueness within company
        const existingCode = await db.execute(
          sql`SELECT id FROM accounts WHERE code = ${data.code} AND company_id = ${data.companyId} LIMIT 1`
        );
        if (existingCode.rows.length > 0) {
          errors.push("Account code already exists in this company");
        }

        // Validate parent account exists and is in same company
        if (data.parentId) {
          const parentAccount = await db.execute(
            sql`SELECT company_id FROM accounts WHERE id = ${data.parentId} LIMIT 1`
          );
          if (parentAccount.rows.length === 0) {
            errors.push("Parent account does not exist");
          } else if (parentAccount.rows[0].company_id !== data.companyId) {
            errors.push("Parent account must be in the same company");
          }
        }
      } catch (dbError) {
        errors.push(`Database validation error: ${dbError}`);
      }

      return errors;
    });
  }

  /**
   * Validate journal entry with complete business rules
   */
  static async validateJournalEntry(entryData: unknown): Promise<SchemaValidationResult> {
    return this.validateBeforeInsert(journalEntryWithLinesSchema, entryData, async (data) => {
      const errors: string[] = [];
      
      try {
        // Check entry number uniqueness within company
        const existingEntry = await db.execute(
          sql`SELECT id FROM journal_entries WHERE entry_number = ${data.entry.entryNumber} AND company_id = ${data.entry.companyId} LIMIT 1`
        );
        if (existingEntry.rows.length > 0) {
          errors.push("Entry number already exists in this company");
        }

        // Validate all accounts exist and belong to the same company
        for (const line of data.lines) {
          const account = await db.execute(
            sql`SELECT company_id FROM accounts WHERE id = ${line.accountId} LIMIT 1`
          );
          if (account.rows.length === 0) {
            errors.push(`Account ID ${line.accountId} does not exist`);
          } else if (account.rows[0].company_id !== data.entry.companyId) {
            errors.push(`Account ID ${line.accountId} does not belong to this company`);
          }
        }

        // Check fiscal period is open (placeholder for future fiscal period logic)
        const entryDate = new Date(data.entry.date);
        const currentDate = new Date();
        if (entryDate > currentDate) {
          errors.push("Cannot create entries for future dates");
        }

      } catch (dbError) {
        errors.push(`Database validation error: ${dbError}`);
      }

      return errors;
    });
  }

  /**
   * Comprehensive database health check
   */
  static async performHealthCheck(): Promise<DatabaseHealthCheck> {
    const healthCheck: DatabaseHealthCheck = {
      isHealthy: true,
      issues: [],
      performance: {
        connectionTime: 0,
        queryTime: 0
      },
      schema: {
        tablesExist: false,
        foreignKeysValid: false,
        indexesOptimal: false
      }
    };

    try {
      // Test connection speed
      const connectionStart = Date.now();
      await db.execute(sql`SELECT 1`);
      healthCheck.performance.connectionTime = Date.now() - connectionStart;

      // Test query performance
      const queryStart = Date.now();
      await db.execute(sql`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'`);
      healthCheck.performance.queryTime = Date.now() - queryStart;

      // Check if all required tables exist
      const tableCheck = await this.checkTablesExist();
      healthCheck.schema.tablesExist = tableCheck.allExist;
      if (!tableCheck.allExist) {
        healthCheck.issues.push(`Missing tables: ${tableCheck.missing.join(', ')}`);
      }

      // Check foreign key constraints
      const fkCheck = await this.checkForeignKeys();
      healthCheck.schema.foreignKeysValid = fkCheck.isValid;
      if (!fkCheck.isValid) {
        healthCheck.issues.push(`Foreign key issues: ${fkCheck.issues.join(', ')}`);
      }

      // Check index optimization
      const indexCheck = await this.checkIndexes();
      healthCheck.schema.indexesOptimal = indexCheck.isOptimal;
      if (!indexCheck.isOptimal) {
        healthCheck.issues.push(`Index issues: ${indexCheck.recommendations.join(', ')}`);
      }

      // Performance warnings
      if (healthCheck.performance.connectionTime > 1000) {
        healthCheck.issues.push("Slow database connection (>1s)");
      }
      if (healthCheck.performance.queryTime > 500) {
        healthCheck.issues.push("Slow query performance (>500ms)");
      }

      healthCheck.isHealthy = healthCheck.issues.length === 0;

    } catch (error) {
      healthCheck.isHealthy = false;
      healthCheck.issues.push(`Health check failed: ${error}`);
    }

    return healthCheck;
  }

  /**
   * Check if all required tables exist
   */
  private static async checkTablesExist(): Promise<{ allExist: boolean; missing: string[] }> {
    const requiredTables = [
      'users', 'clients', 'user_companies', 'accounts', 
      'journal_entries', 'journal_entry_lines', 'customers', 
      'vendors', 'invoices', 'bills', 'activity_logs'
    ];

    try {
      const existingTables = await db.execute(
        sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
      );
      
      const existing = existingTables.rows.map(row => row.table_name as string);
      const missing = requiredTables.filter(table => !existing.includes(table));
      
      return {
        allExist: missing.length === 0,
        missing
      };
    } catch (error) {
      return {
        allExist: false,
        missing: requiredTables
      };
    }
  }

  /**
   * Check foreign key constraints
   */
  private static async checkForeignKeys(): Promise<{ isValid: boolean; issues: string[] }> {
    try {
      const issues: string[] = [];

      // Check for orphaned records
      const orphanChecks = [
        { table: 'user_companies', column: 'user_id', refTable: 'users', query: sql`SELECT COUNT(*) as count FROM user_companies uc LEFT JOIN users u ON uc.user_id = u.id WHERE u.id IS NULL` },
        { table: 'user_companies', column: 'client_id', refTable: 'clients', query: sql`SELECT COUNT(*) as count FROM user_companies uc LEFT JOIN clients c ON uc.client_id = c.id WHERE c.id IS NULL` },
        { table: 'accounts', column: 'client_id', refTable: 'clients', query: sql`SELECT COUNT(*) as count FROM accounts a LEFT JOIN clients c ON a.client_id = c.id WHERE c.id IS NULL` },
        { table: 'journal_entries', column: 'client_id', refTable: 'clients', query: sql`SELECT COUNT(*) as count FROM journal_entries je LEFT JOIN clients c ON je.client_id = c.id WHERE c.id IS NULL` },
        { table: 'journal_entry_lines', column: 'journal_entry_id', refTable: 'journal_entries', query: sql`SELECT COUNT(*) as count FROM journal_entry_lines jel LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id WHERE je.id IS NULL` }
      ];

      for (const check of orphanChecks) {
        const result = await db.execute(check.query);
        const count = parseInt(result.rows[0].count as string);
        if (count > 0) {
          issues.push(`Found ${count} orphaned records in ${check.table}.${check.column}`);
        }
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [`Foreign key check failed: ${error}`]
      };
    }
  }

  /**
   * Check index optimization
   */
  private static async checkIndexes(): Promise<{ isOptimal: boolean; recommendations: string[] }> {
    try {
      const recommendations: string[] = [];

      // Check for missing indexes on frequently queried columns
      const indexChecks = [
        { table: 'user_companies', columns: ['user_id', 'client_id'], name: 'user_companies_user_company_idx' },
        { table: 'accounts', columns: ['client_id'], name: 'accounts_client_idx' },
        { table: 'journal_entries', columns: ['client_id', 'date'], name: 'journal_entries_client_date_idx' },
        { table: 'journal_entry_lines', columns: ['journal_entry_id'], name: 'journal_entry_lines_entry_idx' },
        { table: 'journal_entry_lines', columns: ['account_id'], name: 'journal_entry_lines_account_idx' }
      ];

      for (const check of indexChecks) {
        const existingIndex = await db.execute(
          sql`SELECT indexname FROM pg_indexes WHERE tablename = ${check.table} AND indexdef LIKE ${'%' + check.columns.join('%') + '%'}`
        );
        
        if (existingIndex.rows.length === 0) {
          recommendations.push(`Consider adding index on ${check.table}(${check.columns.join(', ')})`);
        }
      }

      return {
        isOptimal: recommendations.length === 0,
        recommendations
      };
    } catch (error) {
      return {
        isOptimal: false,
        recommendations: [`Index check failed: ${error}`]
      };
    }
  }

  /**
   * Get database schema information
   */
  static async getSchemaInfo(): Promise<{
    tables: Array<{ name: string; rowCount: number }>;
    version: string;
    size: string;
  }> {
    try {
      // Get table information
      const tablesResult = await db.execute(
        sql`
          SELECT 
            t.table_name,
            COALESCE(c.reltuples, 0)::bigint as row_count
          FROM information_schema.tables t
          LEFT JOIN pg_class c ON c.relname = t.table_name
          WHERE t.table_schema = 'public' 
          AND t.table_type = 'BASE TABLE'
          ORDER BY t.table_name
        `
      );

      const tables = tablesResult.rows.map(row => ({
        name: row.table_name as string,
        rowCount: parseInt(row.row_count as string) || 0
      }));

      // Get PostgreSQL version
      const versionResult = await db.execute(sql`SELECT version()`);
      const version = versionResult.rows[0].version as string;

      // Get database size
      const sizeResult = await db.execute(
        sql`SELECT pg_size_pretty(pg_database_size(current_database())) as size`
      );
      const size = sizeResult.rows[0].size as string;

      return { tables, version, size };
    } catch (error) {
      throw new Error(`Failed to get schema info: ${error}`);
    }
  }
}

/**
 * Validation middleware for API routes
 */
export function createValidationMiddleware<T>(
  schema: z.ZodSchema<T>,
  additionalChecks?: (data: T) => Promise<string[]>
) {
  return async (req: any, res: any, next: any) => {
    try {
      const validation = await DatabaseValidationService.validateBeforeInsert(
        schema, 
        req.body, 
        additionalChecks
      );

      if (!validation.isValid) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.errors,
          warnings: validation.warnings
        });
      }

      // Store validated data
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      console.error("Validation middleware error:", error);
      res.status(500).json({ error: "Internal validation error" });
    }
  };
}

/**
 * Database transaction wrapper with validation
 */
export async function withValidatedTransaction<T>(
  operation: () => Promise<T>,
  onError?: (error: any) => void
): Promise<T> {
  try {
    return await db.transaction(async (tx) => {
      return await operation();
    });
  } catch (error) {
    console.error("Database transaction failed:", error);
    if (onError) onError(error);
    throw error;
  }
} 