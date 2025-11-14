# Database Statement Timeout Fix

## Issue

PostgreSQL statement timeout errors when querying large datasets:
```
error: canceling statement due to statement timeout
```

## Root Causes

1. **Supabase Connection Pooler Timeout**: If using Supabase connection pooler (port 6543), there's a hard 60-second timeout limit
2. **Slow Count Queries**: `COUNT(*)` queries on large tables without proper indexes can exceed timeout
3. **Large Dataset Queries**: Queries on tables with 50,000+ records can take longer than default timeouts

## Solutions

### Solution 1: Use Direct Connection for Long Queries (Recommended)

If you're using Supabase connection pooler, switch to direct connection for queries that might take longer:

**Connection String Format:**
```
# Pooler (port 6543) - 60s timeout limit
postgresql://user:pass@host:6543/db?pgbouncer=true

# Direct (port 5432) - Custom timeout possible
postgresql://user:pass@host:5432/db?statement_timeout=300000
```

**Update `.env`:**
```bash
# For long-running queries, use direct connection
DATABASE_URL=postgresql://user:pass@host:5432/db?statement_timeout=300000
```

### Solution 2: Add Database Indexes

Add indexes to speed up count and filter queries:

```sql
-- Index on client_id (most common filter)
CREATE INDEX IF NOT EXISTS idx_journal_entries_client_id 
ON accounting.journal_entries(client_id);

-- Index on tenant_code (for MSSQL imported data)
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_code 
ON accounting.journal_entries(tenant_code);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_journal_entries_client_tenant 
ON accounting.journal_entries(client_id, tenant_code);

-- Index on date for sorting
CREATE INDEX IF NOT EXISTS idx_journal_entries_date 
ON accounting.journal_entries(date DESC);
```

### Solution 3: Optimize Count Queries

The code now includes:
- Timeout error handling
- Fallback count estimation when timeout occurs
- Better error messages

### Solution 4: Increase Statement Timeout (Already Implemented)

The `db.ts` file now sets:
- `statement_timeout: 300000` (5 minutes)
- `query_timeout: 300000` (5 minutes)

**Note**: This only works with direct connections. Pooler connections ignore these settings.

## Implementation Status

✅ **Completed:**
- Added statement_timeout configuration in `db.ts`
- Added timeout error handling in journal entries API
- Added fallback count estimation

⚠️ **Recommended Next Steps:**
1. Add database indexes (see Solution 2)
2. Switch to direct connection if using Supabase pooler
3. Monitor query performance and adjust timeout as needed

## Testing

After implementing fixes:

1. **Test with large dataset:**
   ```bash
   # Check if count query completes
   curl http://localhost:4000/api/journal-entries?limit=1000
   ```

2. **Monitor logs:**
   ```bash
   pm2 logs new-react-backend --lines 50
   ```

3. **Check query performance:**
   ```sql
   EXPLAIN ANALYZE 
   SELECT count(*) 
   FROM accounting.journal_entries 
   WHERE client_id = 1;
   ```

## Supabase-Specific Notes

### Connection Pooler (Port 6543)
- **Timeout**: Hard limit of 60 seconds
- **Use Case**: Short queries, high concurrency
- **Limitation**: Cannot increase timeout

### Direct Connection (Port 5432)
- **Timeout**: Configurable (default 0 = no limit)
- **Use Case**: Long-running queries, migrations
- **Advantage**: Can set custom `statement_timeout`

### Recommendation
- Use **pooler** for normal API requests
- Use **direct connection** for:
  - Data migrations
  - Large exports
  - Complex analytics queries
  - Any query expected to take > 30 seconds

## Error Handling

The code now handles timeout errors gracefully:
- Catches timeout errors specifically
- Provides fallback count estimation
- Logs warnings instead of crashing
- Continues to serve data even if count fails

## Performance Tips

1. **Always use pagination** - Don't load all records at once
2. **Add filters** - Reduce dataset size before querying
3. **Use indexes** - Speed up WHERE clauses
4. **Monitor slow queries** - Use `EXPLAIN ANALYZE` to identify bottlenecks
5. **Consider materialized views** - For frequently accessed aggregated data

