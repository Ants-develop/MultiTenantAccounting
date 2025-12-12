# Archived Migrations

**Date Archived:** December 13, 2025

This folder contains the original incremental migrations that were consolidated into the unified schema migration `20251213000000_unified_schema.sql`.

## Why These Were Archived

The original migrations represented an iterative development process with:
- Multiple passes on similar features (feed system added twice)
- Cleanup operations (CRM schema fixes, calendar schema fixes)
- Incremental RLS policy updates
- Back-and-forth on table structures

While functional, this made it difficult to:
- Understand the current database state at a glance
- Set up new environments cleanly
- Onboard new developers
- Maintain consistency

## Consolidated Migration

All these migrations have been combined into a single source of truth:
**`../20251213000000_unified_schema.sql`**

This unified migration includes:
- All ENUMs and custom types
- Complete table schemas with correct column types
- All foreign key relationships
- Indexes for performance
- RLS policies for security
- Stored procedures and functions
- Database triggers
- Initial seed data (deal stages)

## Migration History Preservation

These files are kept for:
- Git history reference
- Understanding the evolution of the schema
- Debugging any issues that may reference old migration names
- Audit trail

## Remote Database Status

All these migrations remain marked as "applied" in the remote Supabase database's `supabase_migrations.schema_migrations` table. The unified migration was also marked as applied without re-running the SQL, ensuring no data disruption.

## Original Migrations Included

1. `20251211130000_feed_system.sql` - Initial feed system
2. `20251211140000_notifications_system.sql` - Notifications tables
3. `20251211150000_feed_improvements.sql` - Feed enhancements
4. `20251211160000_fix_feed_rls.sql` - Feed RLS fixes
5. `20251211170000_fix_feed_rls_permissions.sql` - More RLS fixes
6. `20251211180000_ensure_service_role_access.sql` - Service role access
7. `20251212000000_add_core_schema.sql` - Core schema (profiles, clients, workflows, tasks)
8. `20251212000001_add_crm_schema.sql` - CRM module (deals, activities, contacts)
9. `20251212100000_calendar_rls.sql` - Calendar RLS policies
10. `20251212110000_feed_system.sql` - Feed system (duplicate)
11. `20251212120000_messaging_system.sql` - Messaging tables
12. `20251212130000_notifications_enhanced.sql` - Enhanced notifications
13. `20251212140000_add_feed_meta_column.sql` - Feed meta column
14. `20251212150000_feed_posts_add_type_meta.sql` - Feed post types
15. `20251212160000_fix_calendar_schema.sql` - Calendar schema fixes (UUID migration)
16. `20251212170000_cleanup_old_crm.sql` - Remove old CRM/TaxDome tables

## For New Developers

**Ignore this folder.** Start with the unified migration file in the parent directory. These are historical artifacts only.
