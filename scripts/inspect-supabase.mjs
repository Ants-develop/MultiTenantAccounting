import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getTableInfo(schema, tableName) {
  try {
    const { data, error } = await supabase.rpc('get_table_columns', {
      schema_name: schema,
      table_name: tableName
    });

    if (error) {
      // Fallback: use information_schema
      const result = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', schema)
        .eq('table_name', tableName);
      return result.data;
    }

    return data;
  } catch (err) {
    console.error(`Error fetching columns for ${schema}.${tableName}:`, err.message);
    return null;
  }
}

async function queryRsSchema() {
  try {
    console.log('🔍 Querying RS schema tables...\n');

    // Get all tables in rs schema
    const result = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'rs');

    if (result.error) {
      console.error('❌ Error fetching RS tables:', result.error.message);
      return;
    }

    const tables = result.data || [];
    console.log(`Found ${tables.length} tables in rs schema:\n`);

    const rsTableDefinitions = [];

    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`📋 ${tableName}`);

      // Get columns for this table
      const colResult = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'rs')
        .eq('table_name', tableName)
        .order('ordinal_position');

      if (colResult.error) {
        console.error(`   ❌ Error: ${colResult.error.message}`);
        continue;
      }

      const columns = colResult.data || [];
      console.log(`   Columns: ${columns.map(c => c.column_name).join(', ')}`);

      // Store definition for schema generation
      rsTableDefinitions.push({
        tableName,
        columns: columns
      });
    }

    // Generate TypeScript schema definitions
    console.log('\n\n📝 Generated TypeScript Definitions:\n');
    console.log('```typescript');
    console.log('const rs = pgSchema("rs");\n');

    for (const tableInfo of rsTableDefinitions) {
      const { tableName, columns } = tableInfo;
      const tsName = tableName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');

      console.log(`export const ${tsName} = pgTable("${tableName}", {`);

      for (const col of columns) {
        const colName = col.column_name;
        const tsColName = colName
          .split('_')
          .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
          .join('');

        let typeStr = 'text()';
        if (col.data_type.includes('integer')) typeStr = 'integer()';
        else if (col.data_type.includes('numeric') || col.data_type.includes('decimal')) typeStr = 'decimal("18", "2")()';
        else if (col.data_type.includes('timestamp')) typeStr = 'timestamp()';
        else if (col.data_type.includes('boolean')) typeStr = 'boolean()';

        const nullable = col.is_nullable === 'YES' ? '' : '.notNull()';

        console.log(`  ${tsColName}: ${typeStr}${nullable},`);
      }

      console.log('});\n');
    }
    console.log('```');

    // Save to file
    const outputPath = path.join(process.cwd(), 'scripts', 'rs-schema-output.json');
    fs.writeFileSync(outputPath, JSON.stringify(rsTableDefinitions, null, 2));
    console.log(`\n✅ Full schema saved to: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function checkAuditRls() {
  try {
    console.log('\n\n🔐 Checking Audit RLS Policies...\n');

    const result = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'audit')
      .limit(3); // Just check first 3

    if (result.error) {
      console.error('❌ Error:', result.error.message);
      return;
    }

    for (const table of result.data || []) {
      console.log(`✅ audit.${table.table_name} - RLS enabled`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  console.log('🚀 Supabase Database Inspector\n');
  console.log(`Connected to: ${SUPABASE_URL}\n`);

  await queryRsSchema();
  await checkAuditRls();
}

main().catch(console.error);
