# Fixing Supabase 403 Forbidden Errors

## Problem
The application is making direct Supabase client-side queries that are being blocked by Row Level Security (RLS) policies:
- `deals` (403)
- `profiles` (403)  
- `deal_stages` (400 - column doesn't exist)
- `tasks` (403)
- `clients` (403)
- `workflow_templates` (403)
- `workflows` (400)
- `calendar_events` (400 - column doesn't exist)
- `conversations` (403)

## Root Cause
These tables have RLS enabled in Supabase, but the application architecture uses:
- **Client-side**: Supabase client with ANON key (for auth + storage only)
- **Backend API**: Authentication via `requireAuth` middleware
- **Direct table access**: Client code directly queries Supabase tables instead of going through backend

## Solution Options

### Option 1: Disable RLS (Quick Fix) ⚡
Run the SQL script in Supabase SQL Editor:

```bash
# File location:
supabase/disable-rls-for-backend-auth.sql
```

**Steps:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `disable-rls-for-backend-auth.sql`
3. Run the script
4. Refresh your application

**Pros:** Immediate fix, no code changes
**Cons:** Less security if using Supabase Storage or other direct features

### Option 2: Create Backend API Endpoints (Recommended) 🏗️
Create proper backend routes for these resources:

**Need to create:**
- `/api/deals` - CRM deals management
- `/api/deal-stages` - Deal pipeline stages  
- `/api/tasks` - Task management
- `/api/workflows` - Workflow instances
- `/api/workflow-templates` - Workflow templates
- `/api/calendar-events` - Calendar functionality
- `/api/conversations` - Messaging/chat

**Benefits:**
- Centralized access control
- Better security
- Consistent API patterns
- Easier to audit and maintain

### Option 3: Configure RLS Policies (Complex) 🔒
Add RLS policies for each table. Example:

```sql
-- Allow authenticated users to read all profiles
CREATE POLICY "Authenticated users can view profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Repeat for each table and operation (SELECT, INSERT, UPDATE, DELETE)
```

**Cons:** High maintenance, complex policy logic, doesn't match current architecture

## Schema Issues Found

### Missing Columns (400 errors)
1. **calendar_event_participants.status** - Query expects a `status` column that doesn't exist
2. **deal_stages.order_position** - Query expects an `order_position` column  
3. **workflows.current_stage_id** - Foreign key column missing

### Recommendations
Check if these tables need schema updates or if the queries are using outdated field names.

## Immediate Action Required

**Run this SQL in Supabase:**
