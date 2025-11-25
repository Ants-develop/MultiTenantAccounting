# MSSQL Import Flow

## Overview

The import process follows this flow:

1. **Read from MSSQL** `GeneralLedger` or `audit.GeneralLedger` filtered by `TenantCode`
2. **Identify TenantCode** - Validate tenant code exists in clients table
3. **Insert directly into `journal_entries`** - Transform and store MSSQL data with proper client relationships

## Data Flow

```
MSSQL GeneralLedger / audit.GeneralLedger
   ↓
[Filter by TenantCode]
   ↓
[Transform data types: binary to hex, validate client]
   ↓
PostgreSQL journal_entries (with client_id relationship)
```

## Table Structure

### `journal_entries` (Primary Storage)
- Stores **all journal entries** imported from MSSQL GeneralLedger
- Binary fields stored as **hex text** (for display/editing)
- Has `client_id` → `clients.id` for proper multi-tenant relationships
- Used for:
  - Application display
  - Editing/modification
  - Business operations
  - Reporting and analysis

## Key Fields

- `journal_entries.id` - Internal tracking ID (SERIAL PRIMARY KEY)
- `journal_entries.client_id` - References `clients.id` for multi-tenant data isolation
- `journal_entries.entry_number` - Unique entry number per client (format: GL-{tenantCode}-{number})
- `journal_entries.tenant_code` - MSSQL tenant code for reference
- All MSSQL parity columns are stored directly in `journal_entries`

## Migration Process

1. Read MSSQL data filtered by TenantCode
2. Transform data types (binary to hex text, validate client exists)
3. Generate unique entry_number per client
4. Insert directly into `journal_entries` with `client_id` relationship
5. Handle duplicates using `ON CONFLICT (client_id, entry_number) DO NOTHING`

