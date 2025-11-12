# Migrating Database from Main Branch to Development Branch

## 🎯 Understanding Supabase Branching

When you create a **new Supabase branch**:
- ✅ It starts with **schema from your GitHub branch** (via migrations)
- ❌ It starts **WITHOUT data** (empty database)
- 🔄 It applies migrations automatically when connected to GitHub

## 📋 Migration Options

### Option 1: Schema Only (Recommended for Development)

**How it works:**
- Supabase automatically applies migrations from your `migrations/` folder
- New branch gets all tables, indexes, constraints, etc.
- No data (empty tables)

**Steps:**
1. ✅ **Already done** - Your migrations are in the repo
2. Connect your new branch to GitHub (done via Lovable)
3. Supabase applies migrations automatically
4. Done! Schema is migrated

**This is what happens automatically!** Your migrations in `migrations/` folder are applied.

### Option 2: Schema + Data (Full Copy)

If you want to copy **data** from main branch:

#### Method A: Using Supabase Dashboard (Easiest)

1. **Export from Main Branch:**
   - Go to Supabase Dashboard → Main branch
   - Navigate to **Database** → **Backups**
   - Create a backup or use **SQL Editor** to export data

2. **Import to Development Branch:**
   - Go to Supabase Dashboard → Development branch
   - Navigate to **SQL Editor**
   - Run exported SQL or restore from backup

#### Method B: Using pg_dump/pg_restore (Command Line)

1. **Export from Main Branch:**
```bash
# Get connection string from Supabase Dashboard → Settings → Database
pg_dump "postgresql://[main-branch-connection-string]" \
  --schema-only \           # Schema only
  --file=schema.sql

# OR with data:
pg_dump "postgresql://[main-branch-connection-string]" \
  --data-only \            # Data only
  --file=data.sql

# OR both:
pg_dump "postgresql://[main-branch-connection-string]" \
  --file=full_backup.sql
```

2. **Import to Development Branch:**
```bash
# Import schema
psql "postgresql://[dev-branch-connection-string]" < schema.sql

# OR import data
psql "postgresql://[dev-branch-connection-string]" < data.sql

# OR import everything
psql "postgresql://[dev-branch-connection-string]" < full_backup.sql
```

#### Method C: Using SQL Scripts (Manual)

1. **Export specific tables:**
```sql
-- Run in Main branch SQL Editor
COPY (SELECT * FROM users) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM companies) TO STDOUT WITH CSV HEADER;
-- ... etc
```

2. **Import to Development Branch:**
```sql
-- Run in Development branch SQL Editor
COPY users FROM STDIN WITH CSV HEADER;
-- Paste CSV data here
\.
-- Repeat for each table
```

## 🔄 Current Setup Analysis

### What You Have:
- ✅ **8 migration files** in `migrations/` folder
- ✅ **Schema defined** in `shared/schema.ts`
- ✅ **Drizzle configured** for migration generation

### What Happens Automatically:
When your development branch is connected to GitHub:
1. ✅ Supabase clones your repo
2. ✅ Detects `migrations/` folder
3. ✅ Applies migrations in order:
   - `001_initial_schema.sql`
   - `002_company_settings.sql`
   - `003_general_ledger.sql`
   - ... (all 8 migrations)
4. ✅ Schema is created automatically

**You don't need to do anything!** Schema migration is automatic.

## 🎯 Recommended Approach

### For Development Branch:

**✅ Schema Only (Recommended):**
- Let Supabase apply migrations automatically
- Start with empty database
- Add test data as needed
- Keeps development clean and isolated

**Why Schema Only:**
- ✅ Faster setup
- ✅ No production data in dev
- ✅ Easier to test fresh scenarios
- ✅ Safer - no accidental production data exposure

### For Staging/Production-like Branch:

**✅ Schema + Sample Data:**
- Use Method A or B above
- Copy a subset of production data
- Or use seed scripts

## 📝 Step-by-Step: Migration Setup

### Step 1: Verify Your Migrations

Check your migrations are complete:

```bash
# List all migrations
ls migrations/

# Should see:
# 001_initial_schema.sql
# 002_company_settings.sql
# 003_general_ledger.sql
# 004_fix_activity_logs_user_id.sql
# 005_accounts_add_fields.sql
# 006_add_tenant_code_to_companies.sql
# 007_tenant_code_to_integer.sql
# 008_fix_decimal_precision.sql
```

### Step 2: Connect Branch to GitHub

1. Go to Supabase Dashboard
2. Select your **development branch**
3. Go to **Settings** → **Integrations**
4. Connect to GitHub (if not already connected)
5. Select your repository and branch

### Step 3: Supabase Applies Migrations

**Automatic!** Supabase will:
- Detect your migrations folder
- Apply migrations in order
- Create all tables, indexes, constraints

**Check status:**
- Go to **Database** → **Migrations**
- Should see all 8 migrations applied

### Step 4: Verify Schema (Optional)

```bash
# Connect to dev branch and check
npm run db:status

# OR in Supabase Dashboard:
# Database → Tables → Should see all your tables
```

### Step 5: Add Test Data (If Needed)

If you want sample data:

```bash
# Create a seed script or use SQL Editor
# Example: scripts/seed-dev-data.ts
```

## 🚨 Important Notes

### Migration Order Matters

Your migrations are numbered correctly:
- `001_initial_schema.sql` - Base tables
- `002_company_settings.sql` - Adds settings table
- `003_general_ledger.sql` - Adds ledger table
- ... etc

**Supabase applies them in this order automatically.**

### Don't Skip Migrations

- ✅ **Keep all migration files** in repo
- ✅ **Don't delete old migrations** (even if already applied)
- ✅ **Supabase tracks** which migrations ran

### Data Migration Considerations

**If migrating data:**

1. **Check Foreign Keys:**
   - Export in correct order (users → companies → etc.)
   - Or disable FK checks temporarily

2. **Sequence IDs:**
   - Reset sequences after importing:
   ```sql
   SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
   SELECT setval('companies_id_seq', (SELECT MAX(id) FROM companies));
   -- ... etc
   ```

3. **Avoid Conflicts:**
   - Use `INSERT ... ON CONFLICT DO NOTHING` if re-running
   - Or truncate tables before import

## 🔍 Troubleshooting

### Migrations Not Applying?

1. **Check migration file names:**
   - Must match pattern: `XXX_description.sql`
   - Supabase reads from `migrations/` folder

2. **Check Supabase logs:**
   - Go to **Logs** → **Database** in Supabase Dashboard
   - Look for migration errors

3. **Manual trigger (if needed):**
   - Supabase Dashboard → Database → Migrations
   - Click "Apply pending migrations"

### Missing Tables?

1. **Check migration order:**
   - Ensure `001_initial_schema.sql` ran first

2. **Check for errors:**
   - Review Supabase logs
   - Check SQL syntax in migrations

### Want to Reset Branch?

1. **Delete and recreate branch:**
   - Supabase Dashboard → Branches
   - Delete development branch
   - Create new one
   - Migrations apply automatically

## ✅ Summary

**For Schema Migration:**
- ✅ **Automatic** - Supabase applies your migrations
- ✅ **No action needed** - Just connect branch to GitHub
- ✅ **Already set up** - Your 8 migrations will run

**For Data Migration:**
- Use Supabase Dashboard → SQL Editor (easiest)
- Or pg_dump/pg_restore (command line)
- Or manual SQL scripts

**Recommended:**
- Start with **schema only** for development
- Add test data manually as needed
- Keep production data separate

