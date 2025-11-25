# PostgreSQL Migration Guide
## Audit Analytics Tables - MSSQL to PostgreSQL

---

## Overview

This migration script converts 25 audit analytics tables from Microsoft SQL Server (MSSQL) to PostgreSQL format, specifically optimized for **Neon PostgreSQL**.

**Total Tables:** 25  
**Schema:** `audit`  
**Migration File:** `migrations.sql`

---

## Quick Start

### 1. Connect to Your Neon PostgreSQL Database

```bash
psql "postgresql://[user]:[password]@[host]/[database]?sslmode=require"
```

### 2. Run the Migration

```bash
psql -f migrations.sql "postgresql://[connection-string]"
```

Or within psql:
```sql
\i migrations.sql
```

---

## Migration Details

### Data Type Conversions

| MSSQL Type | PostgreSQL Type | Notes |
|------------|-----------------|-------|
| `NVARCHAR(n)` | `VARCHAR(n)` | Unicode string |
| `NVARCHAR(MAX)` | `TEXT` | Unlimited text |
| `CHAR(n)` | `CHAR(n)` | Fixed-length string |
| `DECIMAL(18,2)` | `NUMERIC(18,2)` | Decimal numbers |
| `INT` | `INTEGER` | 4-byte integer |
| `DATE` | `DATE` | Date without time |
| `DATETIME2` | `TIMESTAMP` | Date and time |

### Naming Convention Changes

**Tables:**
- MSSQL: `PascalCase` → PostgreSQL: `lowercase_with_underscores`
- Examples:
  - `1690Stock` → `1690_stock` (quoted identifier)
  - `AccountsSummary` → `accounts_summary`
  - `NegativCreditor` → `negativ_creditor` (preserves typo)

**Columns:**
- MSSQL: `PascalCase` → PostgreSQL: `lowercase_with_underscores`
- Examples:
  - `TenantCode` → `tenant_code`
  - `PostingMonth` → `posting_month`
  - `CompanyName` → `company_name`

**Special Cases:**
- Georgian column names preserved: `ხარჯი`, `შემოსავალი`, `უნიკალური გატარებები`
- Database typos preserved: `negativ_creditor`, `negativ_debitor`, `negativ_interest`, `negativ_salary`

---

## Table List

| # | Table Name | Purpose |
|---|------------|---------|
| 1 | `audit."1690_stock"` | Inventory balance analysis (account 169*) |
| 2 | `audit.accounts_summary` | Account 515 payables analysis |
| 3 | `audit.accrued_interest` | Accrued interest (account 145*) |
| 4 | `audit.analytics` | Income/expense cumulative analytics |
| 5 | `audit.analytics_balance_summary` | Combined 141*/311* balances |
| 6 | `audit.capital_accounts` | Capital transactions |
| 7 | `audit.capital_accounts_summary` | Capital account summary |
| 8 | `audit.creditors_avans` | Advance payments to creditors |
| 9 | `audit.debitors_avans` | Advance payments from debtors |
| 10 | `audit.dublicate_creditors` | Duplicate creditor detection |
| 11 | `audit.dublicate_debitors` | Duplicate debtor detection |
| 12 | `audit.high_amount_per_quantity_summary` | Price anomaly detection |
| 13 | `audit.negativ_creditor` | Negative creditor balances |
| 14 | `audit.negativ_debitor` | Negative debtor balances |
| 15 | `audit.negative_balance_141_summary` | Fixed assets negatives |
| 16 | `audit.negative_balance_311_summary` | Trade receivables negatives |
| 17 | `audit.negative_balance_summary` | General negative balances |
| 18 | `audit.negative_loans` | Negative loan balances |
| 19 | `audit.negative_stock` | Negative stock balances |
| 20 | `audit.negativ_interest` | Negative interest balances |
| 21 | `audit.negativ_salary` | Negative salary balances |
| 22 | `audit.positive_balance_summary` | Positive balance summary |
| 23 | `audit.revaluation_status_summary` | Currency revaluation status |
| 24 | `audit.salary_expense` | Salary expense analysis |
| 25 | `audit.writeoff_stock` | Stock write-off analysis |

---

## Common Column Structure

Most analytics tables share these standard columns:

| Column | Type | Description |
|--------|------|-------------|
| `tenant_code` | VARCHAR(50) NOT NULL | Accounting tenant code |
| `posting_month` | CHAR(7) NOT NULL | Format: yyyy-MM |
| `company_name` | VARCHAR(255) | Company name |
| `identification_code` | VARCHAR(50) | Company TIN |
| `company_id` | VARCHAR(50) | Company ID |
| `manager` | VARCHAR(50) | Manager user ID |
| `accountant` | VARCHAR(50) | Accountant user ID |

---

## Primary Keys

Tables with primary keys (composite keys based on business logic):

```sql
-- Example: audit.1690_stock
PRIMARY KEY (tenant_code, posting_month, account_number, analytic)

-- Example: audit.analytics
PRIMARY KEY (tenant_code, posting_month)
```

---

## Special Notes

### 1. Quoted Identifiers
The table `1690_stock` starts with a number, so it requires quotes:
```sql
SELECT * FROM audit."1690_stock";
```

### 2. Georgian Language Support
Table `audit.analytics` contains Georgian column names:
```sql
SELECT 
    tenant_code,
    "ხარჯი" AS expenses,          -- Expenses
    "შემოსავალი" AS income,         -- Income
    "უნიკალური გატარებები" AS unique_transactions
FROM audit.analytics;
```

### 3. Idempotent Script
The migration uses `CREATE TABLE IF NOT EXISTS`, making it safe to run multiple times.

### 4. No Data Migration
This script creates **table structures only**. Data migration from MSSQL to PostgreSQL requires separate ETL processes.

---

## Verification Queries

After migration, verify tables were created:

```sql
-- List all audit schema tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'audit' 
ORDER BY table_name;

-- Count total tables (should be 25)
SELECT COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'audit';

-- View table structure
\d audit.analytics

-- View table with comments
SELECT 
    table_name,
    obj_description((table_schema||'.'||table_name)::regclass, 'pg_class') as table_comment
FROM information_schema.tables 
WHERE table_schema = 'audit'
ORDER BY table_name;
```

---

## Rollback (if needed)

To remove all tables and schema:

```sql
-- Drop all tables in audit schema
DROP SCHEMA IF EXISTS audit CASCADE;
```

**⚠️ WARNING:** This will delete all data. Use with caution!

---

## Next Steps

After successful migration:

1. ✅ Verify all 25 tables created
2. ✅ Check primary keys and constraints
3. ✅ Review table comments
4. 📊 Plan data migration from MSSQL
5. 🔍 Create indexes for performance (if needed)
6. 🔐 Set up appropriate permissions
7. 📈 Implement monitoring

---

## Neon-Specific Considerations

### Serverless PostgreSQL
Neon uses serverless PostgreSQL with some specific features:

- **Automatic connection pooling** - Built-in pgBouncer
- **Autoscaling** - Storage scales automatically
- **Branching** - Create database branches for testing

### Connection Pooling
If using connection pooling, be aware:
```sql
-- Neon connection string example
postgresql://user:pass@ep-xxx-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
```

---

## Support

For issues or questions:
- Review `DATABASE_SCHEMA.md` for detailed table documentation
- Check PostgreSQL logs for errors
- Verify Neon console for connection issues

---

**Migration Created:** 2025-11-04  
**Source Database:** Microsoft SQL Server  
**Target Database:** PostgreSQL (Neon)  
**Tables Migrated:** 25

