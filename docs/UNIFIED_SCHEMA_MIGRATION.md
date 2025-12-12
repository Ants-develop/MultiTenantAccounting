# Database Schema Migration Consolidation

**Date:** December 13, 2025  
**Status:** ✅ Complete  
**Impact:** No data loss, no downtime

## Overview

Consolidated 16 incremental migrations into a single unified schema migration for improved maintainability and clarity.

## What Changed

### Before
- 16 separate migration files spanning December 11-12, 2025
- Multiple iterations on same features (feed system created twice)
- Cleanup migrations fixing earlier mistakes
- Difficult to understand overall database structure
- Confusing for new developers

### After
- **1 unified migration**: `20251213000000_unified_schema.sql` (1,400+ lines)
- Complete schema definition in single file
- Clear module organization
- All tables, indexes, RLS policies, functions, and triggers
- Old migrations archived in `supabase/migrations/archive/`

## Schema Modules Included

| Module | Tables | Features |
|--------|--------|----------|
| **Core** | `profiles`, `user_roles` | User management, role-based access |
| **Client** | `clients`, `client_contacts`, `client_team_assignments` | Client management |
| **Workflow** | `workflow_templates`, `workflow_stages`, `workflows`, `client_pipelines`, `client_pipeline_stages` | Workflow automation |
| **Task** | `tasks`, `task_templates`, `checklists`, `task_comments` | Task management |
| **CRM** | `deals`, `deal_stages`, `deal_activities`, `deal_contacts` | Sales pipeline |
| **Calendar** | `calendar_events`, `calendar_event_participants` | Event scheduling |
| **Messaging** | `conversations`, `conversation_participants`, `messages` | Internal messaging |
| **Notification** | `notifications` | User notifications |
| **Feed** | `feed_profiles`, `feed_posts`, `feed_likes`, `feed_comments` | Social feed |

## Database Objects Summary

- **Custom Types (ENUMs)**: 6
- **Tables**: 40+
- **Indexes**: 30+
- **RLS Policies**: 50+
- **Functions**: 6
- **Triggers**: 10+

## Migration Process

### Step 1: Archive Old Migrations
```bash
# All December 2025 migrations moved to archive/
supabase/migrations/202512*.sql → supabase/migrations/archive/
```

### Step 2: Create Unified Migration
Created comprehensive `20251213000000_unified_schema.sql` combining:
- All table definitions with correct UUID types
- All foreign key relationships referencing `profiles` table
- Complete RLS policies for security
- All stored procedures and functions
- Database triggers for automation

### Step 3: Mark as Applied
```bash
npx supabase migration repair --status applied 20251213000000 --linked
```

No SQL was re-executed. The unified migration was marked as "applied" in the migration history table to maintain consistency.

## Benefits

### For Development
- ✅ Single source of truth for database schema
- ✅ Easy to review entire structure
- ✅ Clear module boundaries
- ✅ No need to trace through 16 files

### For New Environments
- ✅ One migration to apply
- ✅ No confusion about order
- ✅ Faster setup process
- ✅ Reduced error potential

### For Maintenance
- ✅ Easier to spot inconsistencies
- ✅ Clear relationships between tables
- ✅ All RLS policies in one place
- ✅ Better documentation

## Production Impact

### Database State
- ✅ No tables dropped
- ✅ No data modified
- ✅ No schema changes
- ✅ Zero downtime

### Migration History
```
Old: 16 migrations (20251211130000 through 20251212170000)
New: 17 migrations (old 16 + new unified 20251213000000)
```

All old migrations remain marked as "applied" in remote database. The unified migration represents the **current state**, not a new change.

## Hook Fixes Applied

As part of this consolidation, fixed foreign key relationships in hooks:

| Hook | Issue | Fix |
|------|-------|-----|
| `useWorkflows.ts` | Querying non-existent `users` table | Changed to `profiles(full_name, avatar_url)` |
| `useJobTasks.ts` | Wrong column names | Changed to correct profile schema |
| `useCalendarEvents.ts` | Querying `users` table | Changed to `profiles` via `user_id` FK |
| `useMessages.ts` | Using explicit FK names | Simplified to use column-based FK joins |
| `useUsers.ts` | Selecting from wrong table | Complete rewrite to use `profiles` |
| `useTasks.ts` | Schema mismatch | Fixed in earlier session |
| `useDeals.ts` | Schema mismatch | Fixed in earlier session |

## Verification

### Check Migration Status
```bash
npx supabase migration list --linked
```

Expected output:
```
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
                  | 20251211130000 | 2025-12-11 13:00:00
                  | ... (14 more)
                  | 20251212170000 | 2025-12-12 17:00:00
   20251213000000 | 20251213000000 | 2025-12-13 00:00:00
```

### Test Database Connection
```bash
npm run dev
```

All queries should work without errors.

## For New Developers

**Starting fresh?** 

1. Clone the repository
2. Link to Supabase: `npx supabase link --project-ref YOUR_REF`
3. Apply unified migration: `npx supabase db push --linked`
4. Done! ✅

**Ignore** the `archive/` folder - it's for historical reference only.

## Rollback Plan

If issues arise (none expected):

1. Restore archived migrations:
   ```bash
   cp supabase/migrations/archive/*.sql supabase/migrations/
   ```

2. Remove unified migration locally:
   ```bash
   rm supabase/migrations/20251213000000_unified_schema.sql
   ```

3. Repair remote history:
   ```bash
   npx supabase migration repair --status reverted 20251213000000 --linked
   ```

## Related Documentation

- [Archive README](../supabase/migrations/archive/README.md) - History of consolidated migrations
- [README.md](../README.md) - Updated with new schema information
- [Database Setup](../README.md#8-database-schema--migrations) - Installation instructions

## Conclusion

✅ **Success!** Database schema is now consolidated into a single, maintainable migration file. All functionality preserved, zero downtime, improved developer experience.
