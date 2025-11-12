# Database Configuration for Development and Production

## Overview

The application supports separate databases for development and production environments. This allows you to:
- Test changes safely without affecting production data
- Use different database instances for different environments
- Maintain data isolation between environments

## Configuration Options

### Option 1: Single Database (Default)

Use one database for all environments:

```env
# .env
DATABASE_URL=postgresql://user:password@host:5432/multitenant_accounting
NODE_ENV=development
```

### Option 2: Separate Development and Production Databases (Recommended)

Use different databases for development and production:

```env
# .env (development)
DATABASE_URL=postgresql://user:password@host:5432/multitenant_accounting_dev
DATABASE_URL_DEV=postgresql://user:password@host:5432/multitenant_accounting_dev
NODE_ENV=development
```

```env
# .env.production (production)
DATABASE_URL=postgresql://user:password@host:5432/multitenant_accounting_prod
DATABASE_URL_PROD=postgresql://user:password@host:5432/multitenant_accounting_prod
NODE_ENV=production
```

## Environment Variable Priority

The system uses the following priority order:

1. **`DATABASE_URL_DEV`** (if `NODE_ENV=development`)
2. **`DATABASE_URL_PROD`** (if `NODE_ENV=production`)
3. **`DATABASE_URL`** (fallback for all environments)

## Setup Instructions

### Development Setup

1. **Create Development Database** (on Neon/Supabase/etc.):
   ```bash
   # Create a new database for development
   # Name it: multitenant_accounting_dev
   ```

2. **Update `.env` file**:
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/multitenant_accounting_dev
   DATABASE_URL_DEV=postgresql://user:password@host:5432/multitenant_accounting_dev
   NODE_ENV=development
   ```

3. **Initialize Development Database**:
   ```bash
   npm run db:reset
   ```

### Production Setup

1. **Create Production Database** (on Neon/Supabase/etc.):
   ```bash
   # Create a new database for production
   # Name it: multitenant_accounting_prod
   ```

2. **Update Production Environment**:
   ```env
   # .env.production or production environment variables
   DATABASE_URL=postgresql://user:password@host:5432/multitenant_accounting_prod
   DATABASE_URL_PROD=postgresql://user:password@host:5432/multitenant_accounting_prod
   NODE_ENV=production
   ```

3. **Initialize Production Database**:
   ```bash
   NODE_ENV=production npm run db:reset
   ```

## Running Commands

### Development

```bash
# Development uses DATABASE_URL_DEV or DATABASE_URL
npm run dev                    # Start development server
npm run db:reset               # Reset development database
npm run db:migrate             # Run migrations on development database
```

### Production

```bash
# Production uses DATABASE_URL_PROD or DATABASE_URL
NODE_ENV=production npm start  # Start production server
NODE_ENV=production npm run db:reset    # Reset production database (USE WITH CAUTION!)
NODE_ENV=production npm run db:migrate # Run migrations on production database
```

## Best Practices

### 1. **Never Mix Environments**

⚠️ **Never run `db:reset` on production database!**

```bash
# ✅ Good: Development reset
npm run db:reset

# ❌ Bad: Production reset (accidental)
NODE_ENV=production npm run db:reset  # This will wipe production data!
```

### 2. **Use Environment-Specific Files**

Create separate `.env` files:

```bash
# .env.development
DATABASE_URL_DEV=postgresql://...

# .env.production
DATABASE_URL_PROD=postgresql://...
```

### 3. **Verify Database Before Running Commands**

Check which database you're connected to:

```bash
# Check current database connection
npm run db:test

# Check database status
npm run db:status
```

### 4. **Backup Production Before Migrations**

```bash
# Backup production database
pg_dump "$DATABASE_URL_PROD" > backup_$(date +%Y%m%d).sql

# Then run migrations
NODE_ENV=production npm run db:migrate
```

## Database Schema Sync

Both databases should use the same schema:

```bash
# Development database
npm run db:reset

# Production database (after testing in dev)
NODE_ENV=production npm run db:reset
```

## Troubleshooting

### "DATABASE_URL must be set" Error

**Solution:** Make sure your `.env` file has `DATABASE_URL` set:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Wrong Database Being Used

**Solution:** Check `NODE_ENV` and verify the correct environment variable is set:

```bash
echo $NODE_ENV           # Should be 'development' or 'production'
echo $DATABASE_URL       # Should show your database URL
echo $DATABASE_URL_DEV   # Should show dev database (if using separate DBs)
echo $DATABASE_URL_PROD  # Should show prod database (if using separate DBs)
```

### Accidental Production Reset

**Solution:** If you accidentally reset production:
1. Restore from backup (if available)
2. Check if you have database snapshots
3. Review migration history

## Security Notes

- ✅ `.env` files are in `.gitignore` (never commit credentials)
- ✅ Use strong passwords for production databases
- ✅ Enable SSL for production connections (`?sslmode=require`)
- ✅ Use connection pooling for production
- ✅ Regularly backup production databases

## Example Workflow

```bash
# 1. Development: Make changes
npm run dev

# 2. Development: Test changes
npm run db:reset

# 3. Development: Run migrations
npm run db:migrate

# 4. Production: Deploy (after testing)
NODE_ENV=production npm run build
NODE_ENV=production npm run db:migrate  # Apply migrations
NODE_ENV=production npm start            # Start production server
```

