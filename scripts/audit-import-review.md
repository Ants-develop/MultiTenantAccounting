# Audit Import Process - Full Review & Improvements

## Current Flow Analysis

### ✅ What Works Well:
1. **Table Name Conversion**: `AccountsSummary` (MSSQL) → `accounts_summary` (PostgreSQL)
2. **Column Name Conversion**: `TenantCode` → `tenant_code`, `CompanyID` → `company_id`
3. **Bracket Wrapping**: `1690Stock` → `[1690Stock]` for MSSQL queries
4. **Type Conversions**: Proper handling of decimals, dates, strings, etc.

### ⚠️ Issues Found:

#### 1. **Inconsistent `company_code` in Migration File**
- Only added to `1690_stock` table
- Missing from other 24 tables in `002_audit_schema.sql`
- **Fix**: Add `company_code INTEGER REFERENCES companies(id) ON DELETE CASCADE` to ALL tables

#### 2. **Column Order Logic**
Current: `company_code, tenant_code, ..., company_id, ...`
- `company_code` = Our foreign key (INTEGER) - added manually as $1
- `company_id` = MSSQL's CompanyID (VARCHAR) - from data
- This is correct but could be clearer in comments

#### 3. **Naming Clarity**
- `companyId` parameter (TypeScript) vs `company_code` (DB) vs `company_id` (MSSQL data)
- **Fix**: Rename parameter to `currentCompanyId` for clarity

## Recommended Changes:

### Priority 1: Fix Migration File
Add `company_code` column to all 24 remaining audit tables

### Priority 2: Improve Code Comments
Add clear documentation about the dual company columns

### Priority 3: Parameter Naming
```typescript
// Before:
migrateAuditSchemaTable(pool, tableName, companyId, batchSize)

// After:
migrateAuditSchemaTable(pool, tableName, currentCompanyId, batchSize)
```

### Priority 4: Console Logging
Improve debug output to show:
- MSSQL table name (PascalCase)
- PostgreSQL table name (snake_case)
- Column mapping (before/after)

