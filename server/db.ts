import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

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

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });