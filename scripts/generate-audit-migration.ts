import fs from 'fs';
import path from 'path';

const oldMigrationPath = path.join(process.cwd(), 'migrations_old_backup', '003_audit_module.sql');
const newMigrationPath = path.join(process.cwd(), 'migrations', '0015_audit_module_schema.sql');

const oldContent = fs.readFileSync(oldMigrationPath, 'utf-8');

// 1. Change company_code type
let newContent = oldContent.replace(/company_code INTEGER/g, 'company_code UUID');

// 2. Extract table names to add RLS
const tableRegex = /CREATE TABLE IF NOT EXISTS audit\."?([a-zA-Z0-9_]+)"?/g;
let match;
const tables: string[] = [];

while ((match = tableRegex.exec(newContent)) !== null) {
  tables.push(match[1]);
}

// 3. Append RLS commands
newContent += `\n\n-- =====================================================\n-- RLS Policies\n-- =====================================================\n`;

tables.forEach(table => {
  const tableName = `audit."${table}"`; // Quote table name just in case (e.g. 1690_stock)
  
  newContent += `\nALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;\n`;
  
  newContent += `\nCREATE POLICY "Users can view their own company audit data" ON ${tableName}
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_companies
            WHERE user_companies.user_id = auth.uid()
            AND user_companies.client_id = ${tableName}.company_code
            AND user_companies.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.global_role = 'admin'
        )
    );\n`;
});

fs.writeFileSync(newMigrationPath, newContent);
console.log(`Generated migration file at ${newMigrationPath}`);
