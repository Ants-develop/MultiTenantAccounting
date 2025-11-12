# Audit Schema Import - Quick Start Guide

## 🚀 Quick Setup

### 1. Check Available Audit Tables

```bash
GET /api/mssql-audit/audit-tables
```

**Response:**
```json
{
  "auditTables": [
    { "tableName": "NegativDebitor", "recordCount": 12500 },
    { "tableName": "CapitalAccounts", "recordCount": 3400 },
    // ... 23 more tables
  ]
}
```

---

## 📊 Import Options

### Option A: Import Single Table

**Best for:** Testing, specific analytics table

```bash
POST /api/mssql-audit/start-audit-table-migration
{
  "tableName": "NegativDebitor",
  "batchSize": 1000
}
```

**Time:** 5-30 seconds (depending on table size)

---

### Option B: Import All Audit Tables

**Best for:** Complete data sync, full audit setup

```bash
POST /api/mssql-audit/start-full-audit-export
{
  "batchSize": 1000
}
```

**Time:** 10-60 minutes (25 tables total)

---

## 📈 Monitor Progress

```bash
GET /api/mssql-audit/migration-status
```

**Response:**
```json
{
  "migrationId": "audit_table_1699500000000",
  "status": "running",
  "progress": 45.5,
  "processedRecords": 5689,
  "totalRecords": 12500,
  "successCount": 5689,
  "errorCount": 0
}
```

**Status Values:**
- `running` - Currently processing
- `completed` - Finished
- `failed` - Error occurred
- `stopped` - User stopped it

---

## ⏸️ Stop Migration (if needed)

```bash
POST /api/mssql-audit/stop-migration
```

---

## 📋 Audit Tables Reference

### Group 1: Debtor Analytics (141 Account)
- **NegativDebitor** - Negative debtor balances
- **NegativeBalance141Summary** - Debtor balance summary
- **DublicateDebitors** - Duplicate debtor detection
- **DebitorsAvans** - Debtor advances (141/312)

### Group 2: Creditor Analytics (311 Account)
- **NegativCreditor** - Negative creditor balances
- **NegativeBalance311Summary** - Creditor balance summary
- **DublicateCreditors** - Duplicate creditor detection
- **CreditorsAvans** - Creditor advances (311/148)

### Group 3: Inventory Analytics (16 Account)
- **NegativeStock** - Negative inventory
- **WriteoffStock** - Inventory write-offs
- **1690Stock** - Additional expenses

### Group 4: Capital Analytics (515 Account)
- **CapitalAccounts** - Capital transactions
- **CapitalAccountsSummary** - Capital summary
- **NegativeBalanceSummary** - Negative capital
- **AccountsSummary** - Account usage

### Group 5: Interest Analytics (18 & 34 Account)
- **AccruedInterest** - Receivable interest (18)
- **NegativInterest** - Negative interest
- **PositiveBalanceSummary** - Payable interest (34)

### Group 6: Salary Analytics (3130 Account)
- **NegativSalary** - Negative salaries
- **SalaryExpense** - Salary expenses

### Group 7: Loan Analytics (32-41 Account)
- **NegativeLoans** - Negative loan balances

### Group 8: General Analytics
- **Analytics** - General analytics with Georgian columns
- **AnalyticsBalanceSummary** - Analytics balance summary
- **HighAmountPerQuantitySummary** - Fixed assets written off
- **RevaluationStatusSummary** - Asset revaluation status

---

## 🎯 Common Use Cases

### Use Case 1: Audit Compliance Check

1. Import NegativDebitor table
2. Check for negative debtor balances
3. Export report for audit team

```bash
POST /api/mssql-audit/start-audit-table-migration
{ "tableName": "NegativDebitor" }
```

---

### Use Case 2: Financial Analysis

1. Import Analytics table
2. Get expense/income analytics
3. Create dashboard visualizations

```bash
POST /api/mssql-audit/start-audit-table-migration
{ "tableName": "Analytics" }
```

---

### Use Case 3: Capital Account Verification

1. Import capital-related tables:
   - CapitalAccounts
   - CapitalAccountsSummary
   - NegativeBalanceSummary

```bash
POST /api/mssql-audit/start-audit-table-migration
{ "tableName": "CapitalAccounts" }
```

---

### Use Case 4: Monthly Audit Export

Run full audit export at month-end for complete analytics

```bash
POST /api/mssql-audit/start-full-audit-export
{ "batchSize": 2000 }
```

---

## ⚙️ Batch Size Guidelines

| Dataset Size | Recommended Batch Size |
|------------|------------------------|
| 0 - 10K records | 500 |
| 10K - 100K records | 1000 |
| 100K - 1M records | 2000 |
| 1M+ records | 5000 |

**Larger batches = Faster but uses more memory**
**Smaller batches = Slower but uses less memory**

---

## ✅ Verify Import Success

```sql
-- Check row count
SELECT COUNT(*) FROM audit."NegativDebitor";

-- Check for data
SELECT * FROM audit."NegativDebitor" LIMIT 5;

-- Verify company association
SELECT DISTINCT company_id FROM audit."NegativDebitor";
```

---

## 🔴 Troubleshooting

### Problem: "No company selected"
**Fix:** Login and select a company first

### Problem: "Migration is already running"
**Fix:** Stop current migration or wait for completion
```bash
POST /api/mssql-audit/stop-migration
```

### Problem: "Failed to fetch audit tables"
**Fix:** Check MSSQL connection is working

### Problem: High error count
**Fix:** 
1. Verify PostgreSQL audit schema exists
2. Check table column names match
3. Reduce batch size and retry

---

## 📊 Performance Tips

1. **Test first** - Start with small table
2. **Off-peak hours** - Run during low usage
3. **Tune batch size** - Larger = faster (if memory allows)
4. **Monitor progress** - Check status every minute
5. **Full export** - Plan for 10-60 minutes

---

## 🔗 Related Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/mssql/tenant-codes` | GET | Get GL tenant codes |
| `/api/mssql/start-migration` | POST | Import general ledger |
| `/api/mssql-audit/audit-tables` | GET | List audit tables |
| `/api/mssql-audit/start-audit-table-migration` | POST | Import single table |
| `/api/mssql-audit/start-full-audit-export` | POST | Import all tables |
| `/api/mssql-audit/migration-status` | GET | Check progress |
| `/api/mssql-audit/stop-migration` | POST | Stop migration |

---

## 📝 Example cURL Commands

### Get Tables
```bash
curl -X GET http://localhost:5000/api/mssql-audit/audit-tables
```

### Start Import
```bash
curl -X POST http://localhost:5000/api/mssql-audit/start-audit-table-migration \
  -H "Content-Type: application/json" \
  -d '{"tableName": "NegativDebitor", "batchSize": 1000}'
```

### Check Status
```bash
curl -X GET http://localhost:5000/api/mssql-audit/migration-status
```

### Stop Migration
```bash
curl -X POST http://localhost:5000/api/mssql-audit/stop-migration
```

---

## 📚 For More Details

See `AUDIT_SCHEMA_IMPORT.md` for:
- Complete API documentation
- Data type mappings
- Database setup requirements
- Performance metrics
- Security considerations
- Error handling details

