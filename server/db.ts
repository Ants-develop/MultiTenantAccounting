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
export const pool = new Pool({ 
  connectionString: databaseUrl,
  // Add some sensible defaults for connection pooling
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const db = drizzle({ client: pool, schema });