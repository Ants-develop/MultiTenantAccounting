import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { config } from 'dotenv';
import { resolve } from 'path';

const { Pool } = pg;

/**
 * Ensure .env is loaded before accessing DATABASE_URL
 * This is important because db.ts might be imported before server/index.ts loads dotenv
 */
function ensureEnvLoaded(): void {
  // Only load if DATABASE_URL is not already set
  if (!process.env.DATABASE_URL) {
    // Try to load .env from common locations
    // This is a fallback in case tsx --env-file didn't work or server/index.ts hasn't loaded it yet
    const envPaths = [
      resolve(process.cwd(), '.env'),
      resolve(process.cwd(), '.env.development'),
      resolve(process.cwd(), '.env.production'),
    ];

    for (const envPath of envPaths) {
      try {
        const result = config({ path: envPath, override: false });
        if (!result.error && process.env.DATABASE_URL) {
          // Only log in development to avoid noise
          if (process.env.NODE_ENV !== 'production') {
            console.log(`📝 db.ts: Loaded DATABASE_URL from: ${envPath}`);
          }
          return;
        }
      } catch (error) {
        // Continue to next path
      }
    }
    
    // If we get here, DATABASE_URL is still not set
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ db.ts: DATABASE_URL not found after trying to load .env');
      console.error(`   Tried paths: ${envPaths.join(', ')}`);
      console.error(`   Current working directory: ${process.cwd()}`);
    }
  }
  // DATABASE_URL is already set (from tsx --env-file, server/index.ts, or system env)
}

/**
 * Get database connection string
 * Uses a single DATABASE_URL for all environments
 */
function getDatabaseUrl(): string {
  // Ensure .env is loaded first
  ensureEnvLoaded();
  
  if (!process.env.DATABASE_URL) {
    throw new Error(
      `DATABASE_URL environment variable is not set. ` +
      `Please configure your database connection string in .env or system environment variables. ` +
      `Current working directory: ${process.cwd()}`
    );
  }
  return process.env.DATABASE_URL;
}

// Lazy initialization to ensure DATABASE_URL is loaded from .env first
let databaseUrl: string | null = null;
let poolInstance: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function getDatabaseUrlInstance(): string {
  if (!databaseUrl) {
    databaseUrl = getDatabaseUrl();
    
    // Log which database is being used (without exposing credentials)
    if (process.env.NODE_ENV !== 'production') {
      const urlParts = databaseUrl.split('@');
      const dbInfo = urlParts.length > 1 ? `@${urlParts[1]}` : 'database';
      console.log(`📊 Database: Using ${process.env.NODE_ENV || 'development'} database (${dbInfo})`);
    }
  }
  return databaseUrl;
}

// Create connection pool with proper Supabase configuration
// Note: For Supabase, if using connection pooler (port 6543), statement timeout is 60s by default
// For direct connection (port 5432), you can set custom statement_timeout
function getPool(): pg.Pool {
  if (!poolInstance) {
    poolInstance = new Pool({ 
      connectionString: getDatabaseUrlInstance(),
      // Add some sensible defaults for connection pooling
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      // Set statement timeout to 5 minutes (300000ms) for long-running queries
      // This applies to direct connections. For pooler, use ?statement_timeout=300000 in connection string
      // Note: Supabase pooler has a hard limit of 60s, so use direct connection for long queries
      statement_timeout: 300000, // 5 minutes in milliseconds
      query_timeout: 300000, // 5 minutes in milliseconds
    });

    // Set search_path to public on all new connections to ensure we use public schema, not temporal
    poolInstance.on('connect', async (client) => {
      try {
        await client.query('SET search_path = public, pg_catalog');
      } catch (error) {
        console.error('Error setting search_path on new connection:', error);
      }
    });

    // Handle pool errors
    poolInstance.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return poolInstance;
}

function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle({ client: getPool(), schema });
  }
  return dbInstance;
}

// Export the instances - they will be initialized lazily
// The getPool() and getDb() functions have internal lazy initialization,
// so the connection is only created on first use
// ensureEnvLoaded() will be called to load .env if DATABASE_URL is not set
export const pool = getPool();
export const db = getDb();