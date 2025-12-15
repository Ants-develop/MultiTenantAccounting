import { defineConfig } from "drizzle-kit";

// Build connection string from Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL;
const password = process.env.SUPABASE_DB_PASSWORD;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL must be set for migrations");
}

if (!password) {
  throw new Error("SUPABASE_DB_PASSWORD must be set for migrations");
}

// Extract project reference and build connection string
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
const region = 'eu-north-1';
const connectionString = `postgresql://postgres.${projectRef}:${password}@aws-1-${region}.pooler.supabase.com:5432/postgres`;

export default defineConfig({
  out: "./supabase/migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
