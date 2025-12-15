# Supabase Migrations - Single Source of Truth

This directory contains the **authoritative schema** for the MultiTenantAccounting application, using **Supabase CLI** as the single migration system.

## Migration Strategy

### ✅ Current Approach (Unified)
- **Source of Truth**: `shared/schema.ts` (Drizzle ORM schema)
- **Generation**: Run `npm run db:generate` to create Supabase migrations from schema.ts
- **Application**: Run `npm run db:push` or `npm run db:reset` to apply migrations
- **System**: Supabase CLI only

### ❌ Old Approach (Deprecated)
- `/migrations/` folder with custom migration manager - **NO LONGER USED**
- Multiple conflicting migration files - **ARCHIVED**

## Schema Overview

### Core Design
- **UUID-based**: All IDs use UUID for consistency with Supabase Auth
  - `profiles.id` → UUID (references `auth.users(id)`)
  - `clients.id` → UUID (generated with `gen_random_uuid()`)
  - All `user_id` foreign keys → UUID
  - All `client_id` foreign keys → UUID

### Supabase Auth Integration
- **Profiles Table**: Linked to `auth.users` via CASCADE delete
- **Auto-Profile Creation**: Trigger `handle_new_user()` creates profile on signup
- **RLS Policies**: Row Level Security enabled on profiles table
- **JWT Authentication**: Backend validates Supabase tokens in middleware

### Database Schemas
- `public` - Core tables (profiles, clients, user relationships)
- `accounting` - Accounting module tables (accounts, journal entries, invoices, bills)
- `rs` - RS.GE integration tables

## Available Commands

```bash
# Generate new migration from schema.ts changes
npm run db:generate

# Apply migrations to remote database
npm run db:push

# Reset database and apply all migrations
npm run db:reset

# Apply migrations (alternative)
npm run db:migrate
```

## Current Migration

### 0000_nostalgic_xorn.sql
**Created**: December 14, 2025  
**Purpose**: Consolidated unified schema with full UUID support

**Features**:
- 30+ tables with UUID foreign keys
- Supabase Auth integration (profiles → auth.users)
- RLS policies on profiles
- Auto-profile creation trigger
- Updated_at triggers on key tables
- Default client seed data

**Schemas Created**:
- `accounting` - 8 tables
- `rs` - 1 table

**Key Tables**:
- `profiles` - User profiles (UUID PK, references auth.users)
- `clients` - Client/company records (UUID PK)
- `user_companies` - User-client relationships
- `user_client_modules` - Module permissions
- `user_client_features` - Feature permissions
- `bank_accounts` - Bank account management
- `conversations` + `messages` - Messaging system
- `notifications` - User notifications

## Making Schema Changes

1. **Update** `shared/schema.ts` with your changes
2. **Generate** migration: `npm run db:generate`
3. **Review** generated SQL in new migration file
4. **Enhance** with Supabase-specific features if needed:
   - RLS policies
   - Triggers
   - Functions
   - auth.users references
5. **Apply**: `npm run db:push`

## Supabase-Specific Enhancements

When Drizzle generates migrations, manually add these as needed:

### RLS Policies
```sql
ALTER TABLE "your_table" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_name"
  ON "your_table" FOR SELECT
  USING (auth.uid() = user_id);
```

### Auth Integration
```sql
-- Reference auth.users
id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE

-- Check service role
USING (auth.jwt()->>'role' = 'service_role')
```

### Triggers
```sql
CREATE TRIGGER update_your_table_updated_at
  BEFORE UPDATE ON your_table
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Archive

Old migrations from conflicting approaches are stored in:
- `archive/20251214_before_consolidation/` - Conflicting 20251213 migrations
- `archive/` - Historical migrations from previous iterations

**Do NOT use archived migrations**. They contain conflicts and are kept for reference only.

## Backend Integration

### Constants
- `DEFAULT_CLIENT_UUID` = '00000000-0000-0000-0000-000000000001'

### Authentication Flow
1. User signs up via Supabase Auth
2. Trigger automatically creates profile record
3. Frontend stores JWT token
4. Backend validates token in middleware
5. Backend sets `req.user` and `req.profile` for all routes

### Type Safety
- `shared/schema.ts` exports TypeScript types
- All UUID fields typed as `string` in TypeScript
- Drizzle ORM provides full type safety
