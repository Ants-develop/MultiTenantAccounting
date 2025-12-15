import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

/**
 * Database connection using Supabase
 * Builds connection string from SUPABASE_URL and SUPABASE_DB_PASSWORD
 * This approach bypasses RLS policies for server-side operations
 */

function getSupabaseConnectionString(): string {
  const supabaseUrl = process.env.SUPABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL must be set in .env');
  }
  
  if (!password) {
    throw new Error('SUPABASE_DB_PASSWORD must be set in .env');
  }
  
  // Extract project reference from SUPABASE_URL
  // Format: https://PROJECT_REF.supabase.co
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
  
  // Build Supabase direct connection string
  // Region: eu-north-1 (from your current setup)
  const region = 'eu-north-1';
  const connectionString = `postgresql://postgres.${projectRef}:${password}@aws-1-${region}.pooler.supabase.com:5432/postgres`;
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📊 Database: Supabase connection (${projectRef} @ ${region})`);
  }
  
  return connectionString;
}

// Create postgres client
const connectionString = getSupabaseConnectionString();
const client = postgres(connectionString, {
  prepare: false, // Disable prepared statements for connection pooler compatibility
  max: 10, // Maximum pool size
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export client for raw queries if needed
export { client };

// Pool-compatible wrapper for legacy code
export const pool = {
  query: async (text: string, params?: any[]) => {
    const normalizedParams = (params || []).map((p) => {
      if (p === undefined) return null;
      if (p instanceof Date) return p.toISOString();
      return p;
    });
    const result = await client.unsafe(text, normalizedParams);
    return { rows: result, rowCount: (result as any)?.count ?? (Array.isArray(result) ? result.length : 0) };
  },
  connect: () => {
    return Promise.resolve({
      query: async (text: string, params?: any[]) => {
        const normalizedParams = (params || []).map((p) => {
          if (p === undefined) return null;
          if (p instanceof Date) return p.toISOString();
          return p;
        });
        const result = await client.unsafe(text, normalizedParams);
        return { rows: result, rowCount: (result as any)?.count ?? (Array.isArray(result) ? result.length : 0) };
      },
      release: () => {},
    });
  },
  end: () => client.end(),
};
