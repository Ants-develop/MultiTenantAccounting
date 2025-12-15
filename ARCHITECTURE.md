# Architecture: Supabase RLS + Backend Hybrid

## Overview
This project uses a **hybrid architecture** combining Supabase RLS (Row Level Security) for data access control with backend APIs for business logic.

## Authentication
- **Method**: Supabase Auth (JWT tokens)
- **Validation**: Backend `requireAuth` middleware validates tokens by calling `supabaseAdmin.auth.getUser()`
- **Client**: Uses Supabase client with ANON key
- **Backend**: Uses service role key for admin operations

## Data Access Patterns

### Direct Supabase Queries (with RLS)
These tables are accessed directly from the client via Supabase queries:

**User & Client Management:**
- `profiles` - User profiles and directory
- `clients` - Client companies
- `user_companies` - User-client assignments

**CRM Module:**
- `deals` - Sales opportunities
- `deal_stages` - Pipeline stages
- `deal_activities` - Deal activity tracking
- `deal_contacts` - Contact associations

**Task Management:**
- `tasks` - Task assignments
- `task_templates` - Task blueprints
- `task_comments` - Task discussions

**Workflow Management:**
- `workflows` - Workflow instances
- `workflow_templates` - Workflow blueprints
- `workflow_stages` - Workflow progression

**Calendar:**
- `calendar_events` - Events and meetings
- `calendar_event_participants` - Event attendees

**Messaging:**
- `conversations` - Chat conversations
- `conversation_participants` - Conversation members
- `messages` - Chat messages

**Feed/Social:**
- `feed_posts` - Social feed posts
- `feed_comments` - Post comments
- `feed_likes` - Post reactions
- `feed_profiles` - User social profiles

**RLS Policies:**
- Multi-tenant isolation: Users only see their assigned clients' data
- Role-based access: Global admins see everything
- Resource ownership: Users manage their own tasks/deals
- Participation-based: Calendar/message participants see events/messages

### Backend API Routes
These require backend business logic or aggregations:

**Authentication & Core:**
- `POST /api/auth/me` - Session validation + main company config

**Admin Operations:**
- `/api/global-admin/*` - Admin dashboard, user management (needs `requireGlobalAdmin`)

**Accounting Module:**
- `/api/accounts` - Chart of accounts logic
- `/api/journal-entries` - Double-entry bookkeeping
- `/api/reports` - Financial report generation
- `/api/reporting` - Report aggregations
- `/api/bank` - Bank reconciliation logic
- `/api/dashboard` - KPI calculations
- `/api/home` - Home page aggregations
- `/api/customers-vendors` - Customer/vendor operations

**Integration & Import:**
- `/api/audit` - Audit trail logging
- `/api/rs-integration` - RS.GE tax system integration
- `/api/rs-sync` - RS.GE data synchronization
- `/api/mssql-import` - MSSQL database imports
- `/api/mssql-restore-ssh` - SSH backup restoration
- `/api/backup-restore` - Backup management

**Operations:**
- `/api/activity-logs` - Activity logging
- `/api/permissions` - Permission calculations
- `/api/notifications` - Notification delivery
- `/api/storage` - File storage operations
- `/api/connections` - External connection management
- `/api/documents` - Document operations
- `/api/feed` - Feed operations (uses service role key)

**Company Setup:**
- `/api/company` - Main company configuration
- `/api/companies` - Multi-company management (legacy)
- `/api/clients` - Client CRUD operations

## Migration Path

### ✅ Completed
- Enabled RLS on core tables
- Created comprehensive RLS policies
- Removed `/api/users` endpoint (client queries `profiles` directly)
- Removed `/api/messages` endpoint (client queries `messages` directly)

### 🔄 Can Be Migrated Later
These could potentially move to Supabase RLS if business logic is minimal:
- `/api/notifications` (if just data fetch)
- `/api/documents` (if using Supabase Storage)
- `/api/activity-logs` (if just logging)

### 🔒 Must Stay Backend
These require complex business logic and will remain backend APIs:
- All accounting operations (journal entries, reports)
- All integrations (RS.GE, MSSQL imports)
- All aggregations (dashboards, KPIs)
- Permission calculations
- Backup/restore operations

## Benefits of This Approach

**Direct Supabase Queries:**
- ✅ Real-time subscriptions
- ✅ Automatic access control via RLS
- ✅ Less backend code
- ✅ Better performance (no backend hop)
- ✅ Supabase handles pagination, filtering

**Backend APIs:**
- ✅ Complex business logic
- ✅ Aggregations and calculations
- ✅ Third-party integrations
- ✅ Audit trails
- ✅ Transaction management

## Security Model

1. **Client Authentication**: Supabase Auth JWT tokens
2. **Backend Validation**: `requireAuth` middleware validates tokens
3. **RLS Enforcement**: Supabase enforces policies on direct queries
4. **Backend Authorization**: Middleware checks roles for backend APIs
5. **Service Role**: Backend uses service role key for admin operations

## Development Guidelines

### Adding New Features

**Use Direct Supabase (RLS) when:**
- Simple CRUD operations
- Data filtering by user/client
- Real-time updates needed
- No complex calculations

**Use Backend API when:**
- Complex business logic required
- Aggregations across multiple tables
- Third-party API integrations
- Transaction guarantees needed
- Audit logging required

### Creating RLS Policies

```sql
-- Template for new table
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Users see their clients' data
CREATE POLICY "users_read_client_data"
ON new_table FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.client_id = new_table.client_id
    AND uc.is_active = true
  )
);

-- Global admins see everything
CREATE POLICY "global_admins_manage_all"
ON new_table FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.global_role = 'global_administrator'
  )
);
```

## File Locations

- **RLS Policies**: `supabase/migrations/20251214210*_enable_*_rls_policies.sql`
- **Table Schemas**: `supabase/migrations/20251214210*_create_*_tables.sql`
- **Backend Routes**: `server/routes.ts`
- **Middleware**: `server/middleware/auth.ts`
- **Drizzle Schema**: `shared/schema.ts`

## Troubleshooting

**403 Forbidden Errors:**
- Check RLS is enabled: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;`
- Check policies exist: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
- Verify user has valid JWT token
- Check user has correct client assignments in `user_companies`

**401 Unauthorized Errors:**
- Check token is in `Authorization: Bearer <token>` header
- Verify token is not expired
- Check backend middleware chain includes `requireAuth`

**Performance Issues:**
- Add indexes on foreign keys used in RLS policies
- Use `.select('specific,columns')` instead of `SELECT *`
- Implement pagination with `.range(from, to)`
- Use realtime subscriptions instead of polling
