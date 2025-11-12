# MSSQL Audit Schema Import Guide

## Overview

This system allows you to import audit analytics tables from MSSQL database into Neon PostgreSQL. The audit schema contains 25 specialized reporting and analytics tables used for financial audits and compliance checks.

## Architecture

### Supported Audit Tables

The following audit tables from MSSQL audit schema are supported:

1. **1690Stock** - Additional expenses from account 1690
2. **AccountsSummary** - Account transaction summary (515 account usage)
3. **AccruedInterest** - Interest accrual tracking (account 18)
4. **Analytics** - Analytical report data with Georgian columns
5. **AnalyticsBalanceSummary** - Balance summary by analytics
6. **CapitalAccounts** - Capital account transactions (515 usage)
7. **CapitalAccountsSummary** - Capital account summary
8. **CreditorsAvans** - Creditor advance balances (311/148)
9. **DebitorsAvans** - Debtor advance balances (141/312)
10. **DublicateCreditors** - Duplicate creditor detection
11. **DublicateDebitors** - Duplicate debtor detection
12. **HighAmountPerQuantitySummary** - Fixed assets written off
13. **NegativCreditor** - Negative creditor balances
14. **NegativDebitor** - Negative debtor balances
15. **NegativeBalance141Summary** - Negative debtor balances summary
16. **NegativeBalance311Summary** - Negative creditor balances summary
17. **NegativeBalanceSummary** - Negative capital balances (515)
18. **NegativeLoans** - Negative loan balances (32-41)
19. **NegativeStock** - Negative inventory balances (16)
20. **NegativInterest** - Negative interest balances
21. **NegativSalary** - Negative salary balances (3130)
22. **PositiveBalanceSummary** - Payable interest accrual (34 account)
23. **RevaluationStatusSummary** - Asset revaluation status
24. **SalaryExpense** - Salary expense transactions
25. **WriteoffStock** - Inventory write-off transactions

## API Endpoints

### 1. Get Available Audit Tables

**Endpoint:** `GET /api/mssql-audit/audit-tables`

**Description:** Retrieves list of all audit tables with record counts from MSSQL

**Authentication:** Required (session user must be authenticated)

**Response:**
```json
{
  "auditTables": [
    {
      "tableName": "1690Stock",
      "recordCount": 12500
    },
    {
      "tableName": "AccountsSummary",
      "recordCount": 3400
    }
    // ... more tables
  ]
}
```

**Error Responses:**
- `400` - No company selected
- `404` - Company not found
- `500` - Failed to fetch audit tables

---

### 2. Start Single Table Migration

**Endpoint:** `POST /api/mssql-audit/start-audit-table-migration`

**Description:** Starts background migration of a specific audit table

**Authentication:** Required (session user must be authenticated)

**Request Body:**
```json
{
  "tableName": "NegativDebitor",
  "batchSize": 1000
}
```

**Parameters:**
- `tableName` (required): Name of the audit table to migrate
- `batchSize` (optional): Number of records per batch, default 1000

**Response:**
```json
{
  "success": true,
  "message": "Audit table migration started for NegativDebitor",
  "migrationId": "audit_table_1699500000000",
  "totalRecords": 0,
  "estimatedTime": "Calculating..."
}
```

**Notes:**
- Migration runs in background after returning response
- Only one migration can run at a time (checked)
- Progress can be tracked via `/api/mssql-audit/migration-status`

---

### 3. Start Full Audit Schema Export

**Endpoint:** `POST /api/mssql-audit/start-full-audit-export`

**Description:** Starts background migration of ALL audit tables sequentially

**Authentication:** Required (session user must be authenticated)

**Request Body:**
```json
{
  "batchSize": 1000
}
```

**Parameters:**
- `batchSize` (optional): Number of records per batch, default 1000

**Response:**
```json
{
  "success": true,
  "message": "Full audit export started for 25 tables",
  "migrationId": "full_audit_1699500000000",
  "totalTables": 25,
  "tablesCompleted": 0,
  "estimatedTime": "Calculating..."
}
```

**Notes:**
- Processes all 25 audit tables sequentially
- Provides table-by-table progress updates
- Better for complete data sync operations

---

### 4. Get Migration Status

**Endpoint:** `GET /api/mssql-audit/migration-status`

**Description:** Get current migration progress

**Authentication:** Required (session user must be authenticated)

**Response (Running):**
```json
{
  "migrationId": "audit_table_1699500000000",
  "type": "audit",
  "tenantCode": null,
  "status": "running",
  "totalRecords": 12500,
  "processedRecords": 5430,
  "successCount": 5420,
  "errorCount": 10,
  "progress": 43.44,
  "startTime": "2024-11-09T10:00:00.000Z",
  "batchSize": 1000
}
```

**Response (Completed):**
```json
{
  "migrationId": "audit_table_1699500000000",
  "type": "audit",
  "tenantCode": null,
  "status": "completed",
  "totalRecords": 12500,
  "processedRecords": 12500,
  "successCount": 12500,
  "errorCount": 0,
  "progress": 100,
  "startTime": "2024-11-09T10:00:00.000Z",
  "endTime": "2024-11-09T10:05:30.000Z",
  "batchSize": 1000
}
```

**Possible Status Values:**
- `pending` - Migration queued
- `running` - Currently processing
- `completed` - Finished successfully
- `failed` - Encountered error
- `stopped` - User initiated stop

---

### 5. Stop Migration

**Endpoint:** `POST /api/mssql-audit/stop-migration`

**Description:** Stop currently running migration

**Authentication:** Required (session user must be authenticated)

**Response (Success):**
```json
{
  "success": true,
  "message": "Migration stopped successfully"
}
```

**Response (No Migration Running):**
```json
{
  "success": false,
  "message": "No active migration to stop"
}
```

---

## Data Flow & Type Conversions

### Type Mapping

| MSSQL Type | PostgreSQL Type | Conversion |
|-----------|-----------------|-----------|
| `nvarchar` | `text` | Direct string conversion |
| `varchar` | `text` | Direct string conversion |
| `char` | `text` | Direct string conversion |
| `date` | `date` | Direct timestamp conversion |
| `datetime2` | `timestamp` | Direct timestamp conversion |
| `decimal(p,s)` | `numeric(p,s)` | Number conversion with validation |
| `int` | `integer` | Number conversion |
| `binary` | `text` | Converted to hex string |

### Null Handling

All columns marked as nullable in MSSQL are stored as NULL in PostgreSQL. Required fields are enforced with NOT NULL constraints.

### Georgian Text Support

Georgian column names and text values are preserved:
- Column example: `ხარჯი` (Expense), `შემოსავალი` (Income)
- Data is stored in UTF-8 encoding
- Full Georgian language support

## PostgreSQL Schema Requirements

The audit schema tables must exist in PostgreSQL with the following structure:

```sql
-- Example audit table structure
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE audit."NegativDebitor" (
  company_id INT NOT NULL,
  tenant_code NVARCHAR(50) NOT NULL,
  posting_month CHAR(7) NOT NULL,
  account_number NVARCHAR(50) NOT NULL,
  analytic NVARCHAR(255) NOT NULL,
  balance NUMERIC(18, 2) NOT NULL,
  company_name NVARCHAR(255),
  identification_code NVARCHAR(50),
  company_id NVARCHAR(50),
  manager NVARCHAR(50),
  accountant NVARCHAR(50),
  -- ... other columns matching MSSQL schema
);
```

**Key Points:**
- Each table gets a `company_id` column added for multi-tenancy
- Column names are converted to lowercase with underscores
- All MSSQL columns are replicated as-is
- Use PostgreSQL native types (not MSSQL types)

## Implementation Details

### Batch Processing

- Records are processed in configurable batches (default: 1000)
- Each batch pauses the stream, processes records, then resumes
- Reduces memory usage for large datasets
- Better error isolation per batch

### Progress Tracking

- Real-time progress updates via EventEmitter
- Progress percentage calculated: `(processedRecords / totalRecords) * 100`
- Separate counters for success/error records
- Migration status persists for 5 minutes after completion

### Error Handling

- Individual record errors don't stop the migration
- Error count tracked separately from success count
- Batch errors logged to console with details
- Failed migrations return error message and status

### On Conflict Strategy

```sql
INSERT INTO audit."TableName" (columns...)
VALUES (values...)
ON CONFLICT DO NOTHING
```

- Prevents duplicate key violations
- Idempotent migrations (safe to re-run)
- Existing records unchanged

## Usage Examples

### Example 1: Get Available Tables

```bash
curl -X GET http://localhost:5000/api/mssql-audit/audit-tables \
  -H "Cookie: sessionId=your_session_id"
```

### Example 2: Migrate Single Table

```bash
curl -X POST http://localhost:5000/api/mssql-audit/start-audit-table-migration \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionId=your_session_id" \
  -d '{
    "tableName": "NegativDebitor",
    "batchSize": 2000
  }'
```

### Example 3: Full Audit Export

```bash
curl -X POST http://localhost:5000/api/mssql-audit/start-full-audit-export \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionId=your_session_id" \
  -d '{
    "batchSize": 1500
  }'
```

### Example 4: Check Progress

```bash
curl -X GET http://localhost:5000/api/mssql-audit/migration-status \
  -H "Cookie: sessionId=your_session_id"
```

### Example 5: Stop Migration

```bash
curl -X POST http://localhost:5000/api/mssql-audit/stop-migration \
  -H "Cookie: sessionId=your_session_id"
```

## Configuration

### Environment Variables

No additional environment variables required. Uses existing MSSQL connection config:

```bash
MSSQL_SERVER=95.104.94.20
MSSQL_DATABASE=Audit
MSSQL_USERNAME=sa
MSSQL_PASSWORD=asQW12ZX12!!
```

### Performance Tuning

**Batch Size Recommendations:**

| Dataset Size | Recommended Batch Size | Memory Impact |
|-------------|------------------------|---------------|
| < 10K rows | 500 | Low |
| 10K - 100K rows | 1000 | Medium |
| 100K - 1M rows | 2000 | Medium-High |
| > 1M rows | 5000 | High |

## Logging & Debugging

### Console Output

Migrations produce detailed console logs:

```
📊 Starting migration of audit.NegativDebitor
   Total records: 12500
   Columns: TenantCode, PostingMonth, AccountNumber, ...
[Audit Migration audit_table_1699500000000] Progress: 43.4% (5430/12500)
✅ Migration of NegativDebitor completed: 12500 success, 0 errors
```

### Log Levels

- ✅ Success operations
- ⚠️ Warnings (missing tables, partial failures)
- ❌ Errors (connection issues, insert failures)
- 📊 Info (progress updates, record counts)
- 📍 Route markers (API request tracking)
- 🔄 Process updates (initialization, state changes)

## Troubleshooting

### Issue: "No company selected"

**Solution:** Ensure authenticated user has selected a company in the session

```bash
# Check company in session
GET /api/auth/me
```

### Issue: "Failed to fetch audit tables"

**Possible Causes:**
- MSSQL connection unreachable
- Audit schema doesn't exist
- Incorrect credentials

**Solution:** Verify MSSQL connection config and network connectivity

### Issue: "Migration is already running"

**Solution:** Wait for current migration to complete or stop it

```bash
POST /api/mssql-audit/stop-migration
```

### Issue: High error count

**Possible Causes:**
- PostgreSQL table schema mismatch
- Data type conversion errors
- Column name mismatches

**Solution:** Check PostgreSQL audit schema and error logs

### Issue: Slow migration speed

**Solution:** Try increasing batch size

```bash
POST /api/mssql-audit/start-audit-table-migration
{
  "tableName": "NegativDebitor",
  "batchSize": 5000
}
```

## Best Practices

1. **Test with Small Tables First**
   - Start with tables that have fewer records
   - Verify data integrity before full export

2. **Monitor Migration Progress**
   - Check status frequently for long-running migrations
   - Watch error count for data quality issues

3. **Use Batch Optimization**
   - Adjust batch size based on your hardware
   - Balance between speed and memory usage

4. **Validate Results**
   - Compare row counts between MSSQL and PostgreSQL
   - Spot-check data samples
   - Verify decimal precision and date formats

5. **Schedule Full Exports**
   - Run during off-peak hours
   - Full export can take significant time for large datasets
   - Plan for 5+ hours for 25 tables with millions of records

6. **Keep Audit Trail**
   - Log migration IDs for traceability
   - Track completion times
   - Archive error logs for compliance

## Database Maintenance

### After Successful Migration

```sql
-- Verify record counts
SELECT COUNT(*) FROM audit."NegativDebitor";

-- Check for NULL values
SELECT COUNT(*) FROM audit."NegativDebitor" 
WHERE company_id IS NULL;

-- Analyze table
ANALYZE audit."NegativDebitor";
```

### Removing Duplicate Data

If re-running migrations:

```sql
-- Clear old data (use with caution!)
DELETE FROM audit."TableName" 
WHERE company_id = :company_id;

-- Then re-run migration
```

## Performance Metrics

### Expected Performance

- **Small tables** (< 10K records): 1-5 seconds
- **Medium tables** (10K - 100K): 5-30 seconds
- **Large tables** (100K - 1M): 30 seconds - 5 minutes
- **Full export** (all 25 tables): 10-60 minutes

### Factors Affecting Performance

- Network latency to MSSQL server
- PostgreSQL write throughput
- Batch size
- Hardware specifications
- Concurrent database operations

## Security Considerations

1. **Authentication:** All endpoints require valid session authentication
2. **Company Isolation:** Each user can only import to their assigned company
3. **Credentials:** MSSQL credentials stored in environment variables
4. **Data Integrity:** ON CONFLICT prevents unauthorized overwrites
5. **Audit Logging:** All migrations are logged with timestamps

## Limitations

1. **Single Active Migration:** Only one migration per connection pool
2. **Table List Hardcoded:** Audit tables must be added to the code if new tables created
3. **No Rollback:** Migrations are additive only (ON CONFLICT DO NOTHING)
4. **Memory:** Large batches require significant memory
5. **Network:** Connection must remain active for duration of migration

## Future Enhancements

- [ ] Web UI for migration management
- [ ] Scheduled migrations via cron
- [ ] Delta sync (only new/changed records)
- [ ] Table-level parallel processing
- [ ] Data validation reports
- [ ] Selective column import
- [ ] Custom table mapping

---

## Support & Feedback

For issues or improvements, contact the development team with:
- Migration ID and timestamp
- Table name and record count
- Error logs and messages
- Expected vs actual results

