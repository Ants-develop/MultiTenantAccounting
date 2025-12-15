# Quick Start: Apply Database Migration

## Summary
Your Supabase database has **6/6 core tables** but is missing **4 columns** required by the new workflow/task components.

## Required Action

### Option 1: Supabase Dashboard (Recommended)
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project: **rkwnwtiwljqhzjqmmkwi** (eu-north-1)
3. Go to **SQL Editor**
4. Paste the migration script from: `supabase/migrations/20251215220000_add_workflow_analytics_columns.sql`
5. Click **Run**
6. Verify output shows all columns added successfully

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push

# Or apply specific migration
supabase db remote commit
```

### Option 3: Manual SQL (If CLI not available)
```bash
# Using psql directly
psql $DATABASE_URL -f supabase/migrations/20251215220000_add_workflow_analytics_columns.sql
```

## What Gets Added

### To `workflows` table:
- `service_type` TEXT - Categorize jobs (monthly_bookkeeping, vat_return, etc.)
- `assigned_to` UUID → profiles(id) - Track primary accountant
- `due_date` TIMESTAMP - Deadline for completion

### To `workflow_stage_history` table:
- `entered_by` UUID → profiles(id) - Track who made each transition

## Verification

After running migration, verify in Supabase Dashboard:

1. **Table Editor** → **workflows** → Should see 3 new columns
2. **Table Editor** → **workflow_stage_history** → Should see `entered_by` column

Or run this query:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workflows' 
  AND column_name IN ('service_type', 'assigned_to', 'due_date');
```

## Impact

### Before Migration:
- ❌ StageHistoryTimeline: Errors on entered_by join
- ❌ Analytics Dashboard: Missing data for filters
- ⚠️ Job Details: Works but missing fields

### After Migration:
- ✅ All 9 components fully functional
- ✅ Complete audit trail with user tracking
- ✅ Full analytics capabilities

## Safety Notes

- ✅ Migration uses `ADD COLUMN IF NOT EXISTS` - safe to run multiple times
- ✅ Foreign keys use `ON DELETE SET NULL` - won't break on user deletion
- ✅ Existing rows will have NULL for new columns (no data loss)
- ✅ Indexes added for performance

## Troubleshooting

### "relation workflows does not exist"
- Check you're running migration on correct database
- Verify previous migrations have been applied

### "constraint already exists"
- Safe to ignore - means column already exists
- Migration is idempotent

### Permission denied
- Ensure you're using database owner credentials
- May need superuser for some operations

## Next Steps After Migration

1. ✅ Test StageHistoryTimeline - should show user names
2. ✅ Test Analytics Dashboard - should load all metrics
3. ✅ Test JobDetailsDrawer - should show assigned user and due date
4. Consider backfilling `service_type` for existing workflows

---

**Full Documentation:** See `docs/DATABASE_SCHEMA_VERIFICATION.md`  
**Migration File:** `supabase/migrations/20251215220000_add_workflow_analytics_columns.sql`
