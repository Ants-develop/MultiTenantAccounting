# ✅ Audit Import Process - Final Implementation

## Overview
Complete, intuitive MSSQL → PostgreSQL audit data migration system with clear naming conventions and logical flow.

---

## 📋 Table Structure

### PostgreSQL Audit Tables (25 total)
All tables follow consistent naming patterns:

```sql
audit."1690_stock" (
    company_code INTEGER REFERENCES companies(id) ON DELETE CASCADE,  -- Our FK
    tenant_code VARCHAR(50) NOT NULL,
    posting_month CHAR(7) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    analytic VARCHAR(255) NOT NULL,
    balance NUMERIC(18,2) NOT NULL,
    company_name VARCHAR(255),
    identification_code VARCHAR(50),
    company_id VARCHAR(50),                                           -- MSSQL CompanyID
    manager VARCHAR(50),
    accountant VARCHAR(50),
    PRIMARY KEY (tenant_code, posting_month, account_number, analytic)
);
```

---

## 🔄 Naming Conversions

### Table Names
| MSSQL (PascalCase)           | PostgreSQL (snake_case)              |
|------------------------------|--------------------------------------|
| `1690Stock`                  | `"1690_stock"`                       |
| `AccountsSummary`            | `accounts_summary`                   |
| `AnalyticsBalanceSummary`    | `analytics_balance_summary`          |
| `NegativCreditor`            | `negativ_creditor` (preserves typo)  |

### Column Names
| MSSQL (PascalCase)     | PostgreSQL (snake_case) |
|------------------------|-------------------------|
| `TenantCode`           | `tenant_code`           |
| `PostingMonth`         | `posting_month`         |
| `AccountNumber`        | `account_number`        |
| `CompanyID`            | `company_id`            |
| `IdentificationCode`   | `identification_code`   |

---

## 🎯 Key Distinguishing Features

### Company Column Naming
- **`company_code`** (INTEGER) = PostgreSQL foreign key to `companies(id)` table
  - Added by our system
  - Links audit data to current company
  - Provided as parameter to migration function

- **`company_id`** (VARCHAR) = Original MSSQL `CompanyID` string value
  - Part of the MSSQL audit data
  - Preserved for reference
  - May contain tenant/company identifiers from source system

---

## 🔧 Technical Implementation

### Function Signature
```typescript
migrateAuditSchemaTable(
  mssqlPool: sql.ConnectionPool,
  tableName: string,                    // MSSQL name: "AccountsSummary"
  currentCompanyId: number,             // Becomes company_code
  batchSize: number = 1000
): Promise<MigrationProgress>
```

### Process Flow
1. **Table Name Resolution**
   - Input: `AccountsSummary` (MSSQL PascalCase)
   - Wrap if starts with number: `1690Stock` → `[1690Stock]`
   - Convert: `AccountsSummary` → `accounts_summary`

2. **Column Discovery**
   - Query MSSQL `INFORMATION_SCHEMA.COLUMNS`
   - Get all column names in order
   - Example: `TenantCode, PostingMonth, AccountNumber, ..., CompanyID, ...`

3. **Data Extraction**
   - Stream data from MSSQL in batches
   - Process 1000 records at a time (configurable)

4. **Data Transformation**
   - Prepend `currentCompanyId` as first value (→ `company_code`)
   - Convert all MSSQL column values:
     - Decimals: proper precision handling
     - Dates: ensure Date objects
     - Strings: explicit string conversion
     - Nulls: preserve as NULL
   - Convert column names: `TenantCode` → `tenant_code`

5. **Data Insertion**
   ```sql
   INSERT INTO audit."accounts_summary" (
     company_code,              -- Our FK (from currentCompanyId parameter)
     tenant_code,               -- From MSSQL TenantCode
     posting_month,             -- From MSSQL PostingMonth
     account_number,            -- From MSSQL AccountNumber
     ...
     company_id,                -- From MSSQL CompanyID
     ...
   ) VALUES ($1, $2, $3, $4, ..., $n)
   ON CONFLICT DO NOTHING;
   ```

---

## 🎨 Console Output Example

```
📊 Starting migration of audit.AccountsSummary → audit.accounts_summary
   Total records: 3199
   MSSQL Columns (11): TenantCode, DocDate, AccountDr, AccountCr, Amount, DocumentComments, CompanyName, IdentificationCode, CompanyID, Manager, Accountant
   PostgreSQL Columns: company_code (FK), tenant_code, doc_date, account_dr, account_cr, amount, document_comments, company_name, identification_code, company_id, manager, accountant
   
✅ Migration of AccountsSummary → accounts_summary completed: 3199 success, 0 errors
```

---

## 🔍 Special Handling

### Numeric Table Names
- MSSQL requires brackets: `SELECT * FROM audit.[1690Stock]`
- PostgreSQL uses quotes: `INSERT INTO audit."1690_stock"`

### Preserved Typos
Original MSSQL table names with typos are preserved:
- `NegativCreditor` → `negativ_creditor` (not `negative_creditor`)
- `NegativDebitor` → `negativ_debitor` (not `negative_debitor`)
- `NegativInterest` → `negativ_interest`
- `NegativSalary` → `negativ_salary`

### Type Conversions
- **DECIMAL/NUMERIC**: Proper precision preservation
- **DATE/DATETIME2**: Converted to PostgreSQL DATE
- **NVARCHAR/VARCHAR/CHAR**: Explicit string conversion
- **INT**: Integer validation and conversion
- **NULL**: Preserved as NULL in PostgreSQL

---

## 📊 Migration Progress Tracking

```typescript
interface MigrationProgress {
  migrationId: string;          // Unique identifier
  type: 'audit';                // Migration type
  tableName: string;            // MSSQL table name
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  progress: number;             // Percentage (0-100)
  startTime: Date;
  endTime?: Date;
  batchSize: number;
}
```

---

## ✨ Benefits of This Design

1. **Clear Naming**: `company_code` vs `company_id` distinction is explicit
2. **Data Preservation**: All original MSSQL data is preserved, including CompanyID
3. **Relational Integrity**: Foreign key to companies table maintains referential integrity
4. **Flexibility**: Can query by our company or by original MSSQL company identifier
5. **Batch Processing**: Memory-efficient streaming with configurable batch size
6. **Progress Tracking**: Real-time progress updates with detailed statistics
7. **Error Handling**: Continues on errors, tracks failures, uses ON CONFLICT DO NOTHING
8. **Type Safety**: Proper TypeScript typing throughout

---

## 🚀 Usage Example

```typescript
// Import AccountsSummary for company ID 5
await migrateAuditSchemaTable(
  mssqlPool,
  'AccountsSummary',    // MSSQL table name
  5,                    // Current company ID (becomes company_code)
  1000                  // Batch size
);

// Result: Data inserted into audit.accounts_summary with company_code = 5
```

---

## 📝 Migration File

Location: `migrations/002_audit_schema.sql`

- Creates `audit` schema
- Creates all 25 tables with proper structure
- All tables include `company_code INTEGER REFERENCES companies(id) ON DELETE CASCADE`
- Preserves original column names from MSSQL (as snake_case)
- Includes comments and documentation

---

## ✅ Quality Checklist

- [x] Consistent naming conventions (snake_case)
- [x] Clear distinction between company_code (FK) and company_id (data)
- [x] All 25 tables have company_code column
- [x] Proper type conversions
- [x] Batch processing for memory efficiency
- [x] Progress tracking and error handling
- [x] Special character handling (brackets, quotes)
- [x] Preserved typos from original schema
- [x] Comprehensive documentation
- [x] TypeScript type safety
- [x] No linter errors

---

**Status**: ✅ **Production Ready**

**Last Updated**: $(date)
**Version**: 1.0.0

