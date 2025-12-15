
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const projectRef = 'rkwnwtiwljqhzjqmmkwi';
const dbPassword = process.env.SUPABASE_DB_PASSWORD || 'jZDQquHI4Rsipqbl';

console.log(`Connecting to database...`);

async function applyMigration() {
  const migrationPath = path.join(process.cwd(), 'migrations', '015_fix_calendar_and_passwords.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Try multiple connection strings if needed
  const regions = [
    'eu-central-1',
    'eu-west-1',
    'eu-west-2',
    'us-east-1',
    'us-west-1',
    'ap-southeast-1',
    'sa-east-1',
    'eu-north-1'
  ];
  
  const connectionStrings = [];
  for (const region of regions) {
    // Try aws-0 and aws-1
    connectionStrings.push(`postgresql://postgres.${projectRef}:${dbPassword}@aws-0-${region}.pooler.supabase.com:5432/postgres`);
    connectionStrings.push(`postgresql://postgres.${projectRef}:${dbPassword}@aws-0-${region}.pooler.supabase.com:6543/postgres`);
    connectionStrings.push(`postgresql://postgres.${projectRef}:${dbPassword}@aws-1-${region}.pooler.supabase.com:5432/postgres`);
    connectionStrings.push(`postgresql://postgres.${projectRef}:${dbPassword}@aws-1-${region}.pooler.supabase.com:6543/postgres`);
  }

  for (const connStr of connectionStrings) {
    console.log(`Trying connection: ${connStr.replace(dbPassword, '****')} ...`);
    const client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000 // 3s timeout
    });
      
    try {
      await client.connect();
      console.log('Connected! Applying migration...');
      await client.query(sql);
      console.log('Migration applied successfully.');
      await client.end();
      return;
    } catch (e) {
      // console.error('Connection failed:', e.message);
      await client.end();
    }
  }
  console.error('All connection attempts failed.');
  process.exit(1);
}

applyMigration();
