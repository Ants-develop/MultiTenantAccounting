# Database Setup Fix

## Issues Found

### 1. Missing Database Tables

The following tables are defined in the schema but don't exist in the database:
- `bank_accounts`
- `raw_bank_transactions`
- `jobs`
- `pipelines`
- `tasks`
- `automations`

**Error**: `relation "table_name" does not exist`

### 2. Authentication Errors

Some endpoints are trying to access `req.user.id` when `req.user` is undefined:
- `/api/automations`
- `/api/email/accounts`
- `/api/email/inbox`

**Error**: `Cannot read properties of undefined (reading 'id')`

## Solutions

### Fix 1: Create Missing Database Tables

Run the database push command to create all tables from the schema:

```bash
cd /home/avto/MultiTenantAccounting
npm run db:push
```

This will:
- Read the schema from `shared/schema.ts`
- Create all missing tables in the database
- Set up foreign keys and constraints

**Note**: Make sure your `.env` file has the correct `DATABASE_URL` pointing to your PostgreSQL database.

### Fix 2: Verify Database Connection

Check that your database connection is working:

```bash
npm run db:status
```

### Fix 3: Check Authentication Middleware

The authentication errors suggest that `req.user` is not being set properly. Check:

1. **Session middleware** is properly configured
2. **requireAuth middleware** is setting `req.user` correctly
3. **Session data** is being loaded from the session store

The logs show sessions are being created (`hasSession: true, userId: 1`), but `req.user` might not be populated in some routes.

## Quick Fix Commands

```bash
# 1. Navigate to project directory
cd /home/avto/MultiTenantAccounting

# 2. Push schema to database (creates all tables)
npm run db:push

# 3. Verify tables were created
npm run db:status

# 4. Restart PM2 process
pm2 restart new-react-backend

# 5. Check logs
pm2 logs new-react-backend
```

## After Running db:push

You should see output like:
```
✓ Pushed schema to database
✓ Created tables: bank_accounts, raw_bank_transactions, jobs, pipelines, tasks, automations, ...
```

## If db:push Fails

1. **Check database connection**:
   ```bash
   # Test connection
   psql $DATABASE_URL -c "SELECT version();"
   ```

2. **Check schema file**:
   ```bash
   # Verify schema file exists and is valid
   cat shared/schema.ts | head -50
   ```

3. **Check for migration conflicts**:
   ```bash
   npm run db:status
   ```

## Authentication Fix

If authentication errors persist after creating tables, check:

1. **Session configuration** in server code
2. **requireAuth middleware** implementation
3. **req.user assignment** in authentication middleware

The session logs show sessions are working (`userId: 1`), so the issue is likely that `req.user` object is not being set from the session data.

## Verification

After running `db:push`, test the endpoints:

```bash
# Check if tables exist
psql $DATABASE_URL -c "\dt" | grep -E "(bank_accounts|jobs|pipelines|tasks)"

# Test API endpoints (should not return 500 errors)
curl http://localhost:4000/api/bank/accounts
curl http://localhost:4000/api/jobs
curl http://localhost:4000/api/pipelines
curl http://localhost:4000/api/tasks
```

## Next Steps

1. ✅ Run `npm run db:push` to create tables
2. ✅ Restart PM2 process
3. ✅ Monitor logs for errors
4. ✅ Test API endpoints
5. ⚠️ If auth errors persist, investigate `requireAuth` middleware

