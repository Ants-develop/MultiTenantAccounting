# MSSQL Import Flow

## Overview

The import process follows this flow:

1. **Read from MSSQL** `audit.GeneralLedger` filtered by `TenantCode`
2. **Identify TenantCode** - Validate tenant code exists in companies table
3. **Insert into `general_ledger`** - Store raw MSSQL data (with binary as BYTEA)
4. **Copy to `journal_entries`** - Copy all columns from `general_ledger` to `journal_entries` with `mssql_record_id` reference

## Data Flow

```
MSSQL audit.GeneralLedger
   ↓
[Filter by TenantCode]
   ↓
PostgreSQL general_ledger (raw storage)
   ↓
[Copy all columns]
   ↓
PostgreSQL journal_entries (with mssql_record_id → general_ledger.id)
```

## Table Structure

### `general_ledger` (Raw Storage)
- Stores **raw data** from MSSQL GeneralLedger
- Binary fields stored as BYTEA (not hex text)
- Used for:
  - Audit trail
  - Data validation
  - Reference for `journal_entries`

### `journal_entries` (Working Data)
- **Copy** of `general_ledger` after tenantCode identification
- Binary fields stored as **hex text** (for display/editing)
- Has `mssql_record_id` → `general_ledger.id` for tracking
- Used for:
  - Application display
  - Editing/modification
  - Business operations

## Key Fields

- `general_ledger.id` - Internal tracking ID (SERIAL PRIMARY KEY)
- `journal_entries.mssql_record_id` - References `general_ledger.id` for tracking individual records
- Both tables have all MSSQL parity columns

## Migration Process

1. Read MSSQL data filtered by TenantCode
2. Transform data types (binary to bytea for general_ledger, binary to hex for journal_entries)
3. Insert into `general_ledger` first
4. Get inserted `general_ledger.id`
5. Copy to `journal_entries` with `mssql_record_id = general_ledger.id`

