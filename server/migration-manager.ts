import { db, pool } from "./db";
import { sql } from "drizzle-orm";
import { DatabaseValidationService } from "./db-validation";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface Migration {
  id: string;
  name: string;
  version: number;
  up: string;
  down: string;
  checksum: string;
  appliedAt?: Date;
}

export interface MigrationResult {
  success: boolean;
  migrationsApplied: string[];
  errors: string[];
  rollbacksPerformed: string[];
}

/**
 * Safe migration management system
 */
export class MigrationManager {
  private static readonly MIGRATIONS_TABLE = "_migrations";

  /**
   * Initialize migration tracking table
   */
  static async initialize(): Promise<void> {
    try {
      // Ensure public schema exists first
      await db.execute(sql.raw('CREATE SCHEMA IF NOT EXISTS public;'));
      await db.execute(sql.raw('GRANT ALL ON SCHEMA public TO PUBLIC;'));
      
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS ${sql.identifier(this.MIGRATIONS_TABLE)} (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          version INTEGER NOT NULL,
          checksum VARCHAR(64) NOT NULL,
          applied_at TIMESTAMP DEFAULT NOW(),
          execution_time_ms INTEGER,
          UNIQUE(version)
        )
      `);
    } catch (error) {
      throw new Error(`Failed to initialize migrations table: ${error}`);
    }
  }

  /**
   * Get all pending migrations
   */
  static async getPendingMigrations(): Promise<Migration[]> {
    const appliedMigrations = await this.getAppliedMigrations();
    const availableMigrations = await this.loadMigrationFiles();
    
    return availableMigrations.filter(
      migration => !appliedMigrations.find(applied => applied.id === migration.id)
    );
  }

  /**
   * Get all applied migrations
   */
  static async getAppliedMigrations(): Promise<Migration[]> {
    try {
      // Ensure migrations table exists first
      await this.initialize();
      
      const result = await db.execute(sql`
        SELECT id, name, version, checksum, applied_at
        FROM ${sql.identifier(this.MIGRATIONS_TABLE)}
        ORDER BY version ASC
      `);

      return result.rows.map(row => ({
        id: row.id as string,
        name: row.name as string,
        version: row.version as number,
        checksum: row.checksum as string,
        appliedAt: row.applied_at ? (row.applied_at instanceof Date ? row.applied_at : new Date(row.applied_at as string)) : undefined,
        up: "", // Not stored in DB
        down: "" // Not stored in DB
      }));
    } catch (error) {
      // Table might not exist yet - this is OK for fresh databases
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('does not exist')) {
        return [];
      }
      // For other errors, log but don't fail
      console.warn('⚠️  Warning: Could not read applied migrations:', errorMessage);
      return [];
    }
  }

  /**
   * Run all pending migrations
   */
  static async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migrationsApplied: [],
      errors: [],
      rollbacksPerformed: []
    };

    try {
      await this.initialize();
      
      // Get pending migrations first
      const pendingMigrations = await this.getPendingMigrations();
      
      // Only perform health check if we have already applied some migrations
      // This allows initial migrations to run on a fresh database
      const appliedMigrations = await this.getAppliedMigrations();
      if (appliedMigrations.length > 0) {
        // Perform health check only if database has been initialized before
        const healthCheck = await DatabaseValidationService.performHealthCheck();
        if (!healthCheck.isHealthy) {
          // If health check fails but it's just missing tables, continue
          // (migrations will create them)
          const isMissingTablesOnly = healthCheck.issues.every((issue: string) =>
            issue.includes("Missing tables")
          );
          
          if (!isMissingTablesOnly) {
            result.errors.push(`Database health check failed: ${healthCheck.issues.join(', ')}`);
            result.success = false;
            return result;
          }
          // Missing tables are OK - migrations will create them
        }
      }

      // If no pending migrations, check if any tables are missing and need to be created
      if (pendingMigrations.length === 0) {
        console.log("No pending migrations");
        
        // Check if required tables exist - if not, we should re-run relevant migrations
        const requiredTables = [
          "users", "companies", "user_companies", "accounts",
          "journal_entries", "journal_entry_lines", "customers",
          "vendors", "invoices", "bills", "activity_logs",
          "company_settings"
        ];
        
        const existingTablesResult = await db.execute(sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        `);
        
        const existingTables = (existingTablesResult.rows as { table_name: string }[]).map(
          (row) => row.table_name
        );
        
        const missingTables = requiredTables.filter(
          (table) => !existingTables.includes(table)
        );
        
        if (missingTables.length > 0) {
          console.log(`⚠️  Found ${missingTables.length} missing table(s): ${missingTables.join(", ")}`);
          console.log("   Creating missing tables directly (migrations use IF NOT EXISTS)...");
          
          // Re-run all migrations (they use IF NOT EXISTS, so safe)
          // Execute SQL directly without tracking (since migrations are already applied)
          const allMigrations = await this.loadMigrationFiles();
          for (const migration of allMigrations) {
            try {
              // Only execute CREATE TABLE statements for missing tables
              const createsMissingTable = missingTables.some((table) =>
                migration.up.toLowerCase().includes(`create table ${table}`) ||
                migration.up.toLowerCase().includes(`create table if not exists ${table}`)
              );
              
              if (createsMissingTable) {
                console.log(`   Executing ${migration.name} to create missing tables...`);
                
                // Execute SQL directly without tracking (since migration already applied)
                // Split into statements and execute CREATE TABLE/INDEX statements only
                const statements = migration.up
                  .split(';')
                  .map(stmt => stmt.trim())
                  .filter(stmt => 
                    stmt.length > 0 && 
                    !stmt.startsWith('--') &&
                    (stmt.toLowerCase().includes('create table') ||
                     stmt.toLowerCase().includes('create index') ||
                     stmt.toLowerCase().includes('alter table'))
                  );
                
                for (const statement of statements) {
                  try {
                    await db.execute(sql.raw(statement));
                  } catch (error: any) {
                    // Ignore "already exists" errors (safe with IF NOT EXISTS)
                    if (!error.message.includes("already exists") && 
                        !error.message.includes("duplicate key")) {
                      console.log(`     ⚠️  Warning: ${error.message.substring(0, 60)}...`);
                    }
                  }
                }
                
                console.log(`   ✓ Executed ${migration.name} (created missing tables)`);
              }
            } catch (error: any) {
              // Ignore errors about tables already existing
              if (!error.message.includes("already exists")) {
                console.log(`   ⚠️  Warning: ${error.message.substring(0, 60)}...`);
              }
            }
          }
        } else {
          console.log("   ✅ All required tables exist");
        }
        
        return result;
      }

      console.log(`Found ${pendingMigrations.length} pending migrations`);

      for (const migration of pendingMigrations) {
        try {
          await this.applyMigration(migration);
          result.migrationsApplied.push(migration.id);
          console.log(`✓ Applied migration: ${migration.name}`);
        } catch (error) {
          console.error(`✗ Failed to apply migration ${migration.name}:`, error);
          result.errors.push(`${migration.name}: ${error}`);
          result.success = false;
          
          // Attempt rollback
          try {
            await this.rollbackMigration(migration);
            result.rollbacksPerformed.push(migration.id);
            console.log(`✓ Rolled back migration: ${migration.name}`);
          } catch (rollbackError) {
            console.error(`✗ Failed to rollback ${migration.name}:`, rollbackError);
            result.errors.push(`Rollback failed for ${migration.name}: ${rollbackError}`);
          }
          
          break; // Stop on first failure
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Migration process failed: ${error}`);
    }

    return result;
  }

  /**
   * Apply a single migration
   * Uses pool.connect() for proper multi-statement SQL execution
   */
  private static async applyMigration(migration: Migration): Promise<void> {
    const startTime = Date.now();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      try {
        // Set search_path to ensure public schema is used
        await client.query('SET search_path = public, pg_catalog');
        
        // Ensure migrations table exists (in case initialize() wasn't called or failed)
        await client.query(`
          CREATE SCHEMA IF NOT EXISTS public;
          GRANT ALL ON SCHEMA public TO PUBLIC;
        `);
        
        await client.query(`
          CREATE TABLE IF NOT EXISTS "${this.MIGRATIONS_TABLE}" (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            version INTEGER NOT NULL,
            checksum VARCHAR(64) NOT NULL,
            applied_at TIMESTAMP DEFAULT NOW(),
            execution_time_ms INTEGER,
            UNIQUE(version)
          )
        `);
        
        // Extract only the UP section (before -- DOWN)
        const upSection = migration.up.split('-- DOWN')[0].trim();
        
        if (!upSection || upSection.length === 0) {
          throw new Error('Migration UP section is empty');
        }
        
        // Execute multi-statement SQL using client.query()
        // This properly handles multiple statements separated by semicolons
        try {
          await client.query(upSection);
        } catch (sqlError: any) {
          // Extract table/column information from error
          const errorMessage = sqlError instanceof Error ? sqlError.message : String(sqlError);
          const errorCode = (sqlError as any)?.code || 'UNKNOWN';
          const errorDetail = (sqlError as any)?.detail || '';
          const errorHint = (sqlError as any)?.hint || '';
          
          // Try to extract table/column from error message
          let tableName = '';
          let columnName = '';
          
          // Extract table name
          const tableMatch = errorMessage.match(/relation\s+["']?([\w.]+)["']?\s+does not exist/i) ||
                            errorMessage.match(/relation\s+["']?public\.([\w]+)["']?\s+does not exist/i) ||
                            errorMessage.match(/table\s+["']?([\w.]+)["']?/i) ||
                            errorMessage.match(/column\s+["']?([\w]+)["']?\s+of relation\s+["']?([\w.]+)["']?/i);
          if (tableMatch) {
            if (tableMatch[2]) {
              tableName = tableMatch[2];
              columnName = tableMatch[1];
            } else {
              tableName = tableMatch[1];
            }
          }
          
          // Extract column name if not already found
          if (!columnName) {
            const columnMatch = errorMessage.match(/column\s+["']?([\w]+)["']?\s+does not exist/i);
            if (columnMatch) {
              columnName = columnMatch[1];
            }
          }
          
          // Build enhanced error message
          let enhancedError = `Migration ${migration.name} (${migration.version}) failed:\n`;
          enhancedError += `  Error: ${errorMessage}\n`;
          enhancedError += `  Code: ${errorCode}\n`;
          if (tableName) {
            enhancedError += `  Table: ${tableName}\n`;
          }
          if (columnName) {
            enhancedError += `  Column: ${columnName}\n`;
          }
          if (errorDetail) {
            enhancedError += `  Detail: ${errorDetail}\n`;
          }
          if (errorHint) {
            enhancedError += `  Hint: ${errorHint}`;
          }
          
          throw new Error(enhancedError.trim());
        }
        
        // Record the migration
        const executionTime = Date.now() - startTime;
        await client.query(
          `INSERT INTO "${this.MIGRATIONS_TABLE}" 
          (id, name, version, checksum, execution_time_ms)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (version) DO UPDATE SET
            name = EXCLUDED.name,
            checksum = EXCLUDED.checksum,
            execution_time_ms = EXCLUDED.execution_time_ms,
            applied_at = NOW()`,
          [migration.id, migration.name, migration.version, migration.checksum, executionTime]
        );
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } finally {
      client.release();
    }
  }

  /**
   * Rollback a migration
   * Uses pool.connect() for proper multi-statement SQL execution
   */
  private static async rollbackMigration(migration: Migration): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      try {
        // Set search_path to ensure public schema is used
        await client.query('SET search_path = public, pg_catalog');
        
        // Extract only the DOWN section (after -- DOWN)
        const downMatch = migration.down.match(/-- DOWN\s*\n([\s\S]*)/);
        const downSection = downMatch ? downMatch[1].trim() : migration.down.trim();
        
        if (!downSection || downSection.length === 0) {
          console.warn(`  ⚠️  Migration ${migration.name} has no DOWN section, skipping rollback SQL`);
        } else {
          // Execute multi-statement SQL using client.query()
          await client.query(downSection);
        }
        
        // Remove migration record
        await client.query(
          `DELETE FROM "${this.MIGRATIONS_TABLE}" WHERE id = $1`,
          [migration.id]
        );
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Migration rollback failed: ${errorMessage}`);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Load migration files from filesystem
   */
  private static async loadMigrationFiles(): Promise<Migration[]> {
    const migrationsDir = path.join(process.cwd(), "migrations");
    
    try {
      await fs.access(migrationsDir);
    } catch {
      // Create migrations directory if it doesn't exist
      await fs.mkdir(migrationsDir, { recursive: true });
      return [];
    }

    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files.filter(f => f.endsWith('.sql'));
    
    const migrations: Migration[] = [];
    
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      
      const migration = this.parseMigrationFile(file, content);
      if (migration) {
        migrations.push(migration);
      }
    }
    
    return migrations.sort((a, b) => a.version - b.version);
  }

  /**
   * Parse migration file content
   */
  private static parseMigrationFile(filename: string, content: string): Migration | null {
    try {
      // Expected format: 001_migration_name.sql
      const match = filename.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        console.warn(`Skipping invalid migration filename: ${filename}`);
        return null;
      }

      const version = parseInt(match[1]);
      const name = match[2].replace(/_/g, ' ');

      // Split UP and DOWN sections
      // Try to find -- DOWN marker (case insensitive, with optional whitespace)
      const downMatch = content.match(/--\s*DOWN\s*\n?/i);
      if (!downMatch) {
        throw new Error(`Migration ${filename} must have a -- DOWN section`);
      }
      
      const downIndex = downMatch.index!;
      const up = content.substring(0, downIndex).replace(/--\s*UP\s*\n?/i, '').trim();
      const down = content.substring(downIndex + downMatch[0].length).trim();
      
      if (!up || up.length === 0) {
        throw new Error(`Migration ${filename} must have a non-empty UP section`);
      }

      // Generate checksum
      const checksum = this.generateChecksum(content);

      return {
        id: filename,
        name,
        version,
        up,
        down,
        checksum
      };

    } catch (error) {
      console.error(`Failed to parse migration ${filename}:`, error);
      return null;
    }
  }

  /**
   * Generate migration file
   */
  static async generateMigration(name: string, upSQL: string, downSQL: string): Promise<string> {
    const migrationsDir = path.join(process.cwd(), "migrations");
    await fs.mkdir(migrationsDir, { recursive: true });

    // Get next version number
    const existing = await this.loadMigrationFiles();
    const nextVersion = existing.length > 0 ? Math.max(...existing.map(m => m.version)) + 1 : 1;
    
    const filename = `${nextVersion.toString().padStart(3, '0')}_${name.toLowerCase().replace(/\s+/g, '_')}.sql`;
    const filePath = path.join(migrationsDir, filename);

    const content = `-- UP\n${upSQL}\n\n-- DOWN\n${downSQL}\n`;
    
    await fs.writeFile(filePath, content, 'utf-8');
    
    return filename;
  }

  /**
   * Create schema backup before migrations
   */
  static async createSchemaBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `schema_backup_${timestamp}`;
    
    try {
      // This would need to be adapted based on your database setup
      // For now, we'll create a simple table listing
      const tables = await DatabaseValidationService.getSchemaInfo();
      const backupData = {
        timestamp: new Date().toISOString(),
        tables: tables.tables,
        version: tables.version
      };
      
      const backupsDir = path.join(process.cwd(), "backups");
      await fs.mkdir(backupsDir, { recursive: true });
      
      const backupPath = path.join(backupsDir, `${backupName}.json`);
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
      
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create schema backup: ${error}`);
    }
  }

  /**
   * Generate checksum for migration content
   */
  private static generateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Get migration status
   */
  static async getStatus(): Promise<{
    applied: Migration[];
    pending: Migration[];
    healthCheck: any;
  }> {
    const [applied, pending, healthCheck] = await Promise.all([
      this.getAppliedMigrations(),
      this.getPendingMigrations(),
      DatabaseValidationService.performHealthCheck()
    ]);

    return { applied, pending, healthCheck };
  }
}

/**
 * CLI helper for migration operations
 */
export class MigrationCLI {
  static async status(): Promise<void> {
    console.log("🔍 Checking migration status...\n");
    
    // Ensure migrations table exists before checking status
    try {
      await MigrationManager.initialize();
    } catch (error) {
      console.error("⚠️  Failed to initialize migrations table:", error);
    }
    
    const status = await MigrationManager.getStatus();
    
    console.log(`✅ Applied migrations: ${status.applied.length}`);
    status.applied.forEach(m => {
      console.log(`   ${m.version}: ${m.name} (${m.appliedAt?.toISOString()})`);
    });
    
    console.log(`\n⏳ Pending migrations: ${status.pending.length}`);
    status.pending.forEach(m => {
      console.log(`   ${m.version}: ${m.name}`);
    });
    
    console.log(`\n🏥 Database health: ${status.healthCheck.isHealthy ? '✅ Healthy' : '❌ Issues found'}`);
    if (!status.healthCheck.isHealthy) {
      status.healthCheck.issues.forEach((issue: string) => {
        console.log(`   ⚠️  ${issue}`);
      });
    }
  }

  static async migrate(): Promise<void> {
    console.log("🚀 Running migrations...\n");
    
    const result = await MigrationManager.migrate();
    
    if (result.success) {
      console.log(`✅ Successfully applied ${result.migrationsApplied.length} migrations`);
    } else {
      console.log(`❌ Migration failed with ${result.errors.length} errors`);
      result.errors.forEach(error => console.log(`   ❌ ${error}`));
    }
    
    if (result.rollbacksPerformed.length > 0) {
      console.log(`🔄 Performed ${result.rollbacksPerformed.length} rollbacks`);
    }
  }

  static async generate(name: string): Promise<void> {
    const upSQL = `-- Add your UP migration SQL here
-- Example:
-- CREATE TABLE example_table (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(255) NOT NULL
-- );`;

    const downSQL = `-- Add your DOWN migration SQL here
-- Example:
-- DROP TABLE IF EXISTS example_table;`;

    const filename = await MigrationManager.generateMigration(name, upSQL, downSQL);
    console.log(`✅ Generated migration: ${filename}`);
    console.log("📝 Edit the file to add your SQL statements");
  }
} 