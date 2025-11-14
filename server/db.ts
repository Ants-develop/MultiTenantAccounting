import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

/**
 * Get database connection string
 * Uses a single DATABASE_URL for all environments
 */
function getDatabaseUrl(): string {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      `DATABASE_URL environment variable is not set. ` +
      `Please configure your database connection string in .env or system environment variables.`
    );
  }
  return process.env.DATABASE_URL;
}

const databaseUrl = getDatabaseUrl();

// Log which database is being used (without exposing credentials)
if (process.env.NODE_ENV !== 'production') {
  const urlParts = databaseUrl.split('@');
  const dbInfo = urlParts.length > 1 ? `@${urlParts[1]}` : 'database';
  console.log(`📊 Database: Using ${process.env.NODE_ENV || 'development'} database (${dbInfo})`);
}

// Create connection pool with proper Supabase configuration
// Note: For Supabase, if using connection pooler (port 6543), statement timeout is 60s by default
// For direct connection (port 5432), you can set custom statement_timeout
export const pool = new Pool({ 
  connectionString: databaseUrl,
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

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const db = drizzle({ client: pool, schema });