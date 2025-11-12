# Schema Validation Module

This module provides comprehensive schema validation that compares:
1. **Actual Database Structure** - What exists in the PostgreSQL database
2. **Expected Schema** (`shared/schema.ts`) - Drizzle ORM schema definitions
3. **Migration Files** (`migrations/*.sql`) - Historical SQL migrations

## Overview

The schema validation system consists of two main components:

### 1. `server/schema-validator.ts`
Core validation logic that:
- Reads expected schema from `shared/schema.ts`
- Queries actual database structure via PostgreSQL `information_schema`
- Compares tables, columns, types, nullability, defaults
- Generates detailed validation reports

### 2. `scripts/validate-schema-comparison.ts`
Comparison script that:
- Parses migration files to understand what they create/modify
- Compares migrations vs schema.ts vs database
- Identifies discrepancies across all three sources
- Provides actionable reports

## Usage

### Run Full Schema Validation

```bash
npm run db:validate-schema
```

This will:
1. ✅ Validate database structure against expected schema
2. 📊 Analyze migration files
3. 🔍 Compare schema.ts vs migrations vs database
4. 📋 Generate detailed comparison report

### Output Example

```
================================================================================
DATABASE SCHEMA VALIDATION REPORT
================================================================================

✅ Schema validation PASSED
   All tables and columns match expected schema

================================================================================
MIGRATION ANALYSIS
================================================================================

📁 Found 8 migration files:

  001_initial_schema.sql
    Tables: users, companies, user_companies, accounts, journal_entries, journal_entry_lines, customers, vendors, invoices, bills, activity_logs
    Operations: 

  002_company_settings.sql
    Tables: company_settings
    Operations: ALTER TABLE company_settings

  ...

================================================================================
SCHEMA vs MIGRATIONS vs DATABASE COMPARISON
================================================================================

📊 Table Comparison:

  Schema.ts tables:      12
  Migration tables:       13
  Database tables:        13

⚠️  In migrations but not in schema.ts:
   - general_ledger

================================================================================
DETAILED TABLE STATUS
================================================================================

✅ users                       [Schema, Migrations, Database]
✅ companies                   [Schema, Migrations, Database]
✅ user_companies              [Schema, Migrations, Database]
...
⚠️  general_ledger              [Migrations, Database]
```

## What It Validates

### Table Validation
- ✅ Tables exist in database
- ✅ Tables match schema.ts definitions
- ✅ Tables are accounted for in migrations

### Column Validation
- ✅ Column names match expected schema
- ✅ Column types are compatible
- ✅ Nullability matches (`NULL` vs `NOT NULL`)
- ✅ Default values are present
- ✅ Unique constraints are correct

### Migration Validation
- ✅ All tables from migrations exist in database
- ✅ Tables in database are accounted for in migrations
- ✅ Tables in schema.ts match migrations

## Key Features

### 1. **Type Compatibility Checking**
The validator performs loose type checking that accounts for PostgreSQL type variations:
- `integer`, `int4`, `serial` → all treated as compatible
- `text`, `varchar(n)` → compatible text types
- `numeric(p,s)` → precision-aware numeric matching

### 2. **Migration Analysis**
Automatically parses migration files to:
- Extract table names from `CREATE TABLE` statements
- Detect `ALTER TABLE` operations
- Identify `DROP TABLE` operations
- Extract timestamps from migration filenames

### 3. **Comprehensive Reporting**
- ✅ Clear pass/fail indicators
- ⚠️  Warnings for extra tables/columns
- ❌ Errors for missing tables/columns
- 📊 Detailed per-table differences

## Expected Schema Tables

The validator checks for these tables defined in `shared/schema.ts`:

1. `users` - User accounts
2. `companies` - Company/organization records
3. `user_companies` - User-company relationships
4. `accounts` - Chart of accounts
5. `journal_entries` - Journal entry headers (with MSSQL parity fields)
6. `journal_entry_lines` - Journal entry line items
7. `customers` - Customer records
8. `vendors` - Vendor records
9. `invoices` - Invoice records
10. `bills` - Bill records
11. `activity_logs` - Activity logging
12. `company_settings` - Company configuration

### Special Cases

#### `general_ledger` Table
- ✅ Exists in migrations (`003_general_ledger.sql`)
- ⚠️  NOT in `shared/schema.ts` (legacy table)
- ✅ Still validated if present in database

#### `journal_entries` MSSQL Parity Fields
The validator expects all MSSQL parity fields added in migrations:
- `tenant_code`, `tenant_name`, `abonent`
- `account_dr`, `account_cr` and related fields
- `amount`, `amount_cur` with precision `numeric(21,2)`
- `rate`, `document_rate` with precision `numeric(19,13)`
- And 50+ other parity fields

## Common Issues & Solutions

### Issue: Table Missing in Database

**Error:**
```
❌ Missing Tables (1):
   - shared_items
```

**Solution:**
1. Check if migration exists for the table
2. Run migrations: `npm run db:migrate`
3. If no migration, generate one: `npm run db:generate`

### Issue: Column Type Mismatch

**Error:**
```
⚠️  Column differences (1):
     - amount:
       • Type mismatch: expected numeric(21,2), got numeric(20,4)
```

**Solution:**
1. Check if migration exists to fix precision: `008_fix_decimal_precision.sql`
2. Run the migration: `npm run db:migrate`
3. If needed, create new migration for precision fix

### Issue: Table in Database But Not in Schema

**Warning:**
```
⚠️  Extra Tables (1):
   - old_table_name
```

**Solution:**
1. If table is deprecated: Create migration to drop it
2. If table should exist: Add it to `shared/schema.ts`
3. Generate migration: `npm run db:generate`

## Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/validate.yml
- name: Validate Database Schema
  run: npm run db:validate-schema
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

The script exits with:
- `0` - Validation passed
- `1` - Validation failed (missing tables/columns)

## Troubleshooting

### Connection Issues

If you see connection errors:
```bash
# Test database connection first
npm run db:test

# Check environment variables
echo $DATABASE_URL
```

### Type Checking Issues

If type mismatches are reported but types are actually compatible:
- The validator uses loose type checking
- PostgreSQL type variations are normalized
- Check the actual column definition in database:
  ```sql
  SELECT column_name, data_type, udt_name 
  FROM information_schema.columns 
  WHERE table_name = 'your_table';
  ```

### Migration File Parsing

If migration analysis is incorrect:
- Ensure migration files follow naming: `###_description.sql`
- Check that `CREATE TABLE` statements use standard SQL syntax
- Verify file encoding is UTF-8

## Related Commands

```bash
# Validate schema only (quick check)
npm run db:validate

# Generate new migration from schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Check migration status
npm run db:status

# Test database connection
npm run db:test
```

## Architecture

```
┌─────────────────────┐
│  shared/schema.ts   │ ← Expected schema (Drizzle ORM)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ schema-validator.ts │ ← Core validation logic
└──────────┬──────────┘
           │
           ├──────────────┬──────────────┐
           ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Database │   │ Migrations│   │ Schema.ts│
    │  (actual)│   │  (history)│   │ (expected)│
    └──────────┘   └──────────┘   └──────────┘
           │              │              │
           └──────────────┴──────────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │ Comparison Report   │
           └─────────────────────┘
```

## Future Enhancements

- [ ] Index validation (check index existence and types)
- [ ] Foreign key constraint validation
- [ ] Check constraint validation
- [ ] Trigger validation
- [ ] Default value validation (exact match)
- [ ] Unique constraint validation
- [ ] Export validation report to JSON/HTML
- [ ] Diff generation (SQL to fix differences)

