# Supabase Auth Migration - Implementation Status

## ✅ COMPLETED

### 1. Database Migrations Created
- **migrations/0002_migrate_to_supabase_auth.sql**
  - Drops legacy `users` table
  - Creates `profiles` table with UUID primary key
  - Updates all 14+ foreign key references to use profiles(id)
  - Converts all user_id columns from integer to UUID

- **migrations/0001_mysterious_fallen_one.sql**
  - Added DOWN section for rollback support

### 2. Backend Code Updated
- **server/auth.ts**
  - ✅ Removed bcrypt password hashing
  - ✅ Removed `hashPassword`, `verifyPassword`, `authenticateUser`
  - ✅ Updated `getUserWithCompanies` to use profiles table with UUID

- **server/middleware/auth.ts**
  - ✅ Already using Supabase Auth (no changes needed)
  - ✅ Sets `req.user` and `req.profile` from Supabase token

- **server/routes.ts**
  - ✅ Already using `requireAuth` middleware on all routes
  - ✅ Updated `/api/auth/me` endpoint to use Supabase user

- **shared/schema.ts**
  - ✅ Fixed type exports: `User` is now alias for `Profile`
  - ✅ Fixed `InsertProfile` schema export
  - ✅ Added backwards compatibility aliases

### 3. Client Code
- **client/src/lib/auth.ts**
  - ✅ Already using Supabase Auth (updated in previous steps)
  - ✅ Login, register, logout all use Supabase

## ⚠️ REMAINING TASKS

### Critical: Replace req.session.userId → req.user.id

**50+ instances need manual replacement across these files:**

1. server/api/company.ts (14 instances) - **1 done, 13 remaining**
2. server/api/clients.ts (8 instances)
3. server/api/bank.ts (8 instances)
4. server/api/storage.ts (7 instances)
5. server/api/rs-admin.ts (5 instances)
6. server/api/messages.ts (2 instances)
7. server/api/backup-restore.ts (3 instances)
8. server/routes/notifications.ts (6 instances)
9. server/routes/feed.ts (5 instances)

**Quick Fix: Run the PowerShell script:**
```powershell
cd C:\Users\User\Desktop\MultiTenantAccounting
.\scripts\replace-session-auth.ps1
```

This will automatically replace all `req.session.userId` with `req.user?.id`.

**Then manually add auth checks** where `const userId = req.user?.id;` is used:
```typescript
const userId = req.user?.id;
if (!userId) return res.status(401).json({ message: 'Not authenticated' });
```

### Additional Type Updates Needed

Files that reference `userId: number` should be changed to `userId: string`:

- server/services/notification.ts
- server/services/notification-service.ts  
- server/services/matrix-bridge.ts
- server/services/feed.ts
- server/services/backup-download.ts

## 📋 NEXT STEPS

### Step 1: Run the Migration
```bash
npm run db:migrate
```

This will:
- Drop the old `users` table
- Create the new `profiles` table
- Update all foreign keys to use UUID

### Step 2: Run the PowerShell Script
```powershell
.\scripts\replace-session-auth.ps1
```

This will replace all session references with Supabase auth.

### Step 3: Test
```bash
# Start the server
npm run dev

# In browser:
# 1. Register a new user (uses Supabase Auth)
# 2. Login (should work with email/password)
# 3. Test API calls (should use Bearer token)
```

### Step 4: Verify
```bash
npm run db:status
```

Should show:
- ✅ profiles table exists
- ✅ All foreign keys reference profiles
- ✅ No users table (renamed to users_legacy)

## 🔒 Security Notes

**Authentication Flow:**
1. Frontend calls Supabase Auth API directly
2. Supabase returns JWT token
3. Frontend sends token in `Authorization: Bearer <token>` header
4. Backend `requireAuth` middleware validates token
5. Backend gets user ID from token (UUID)

**No more:**
- ❌ Password hashing in backend
- ❌ Session cookies
- ❌ express-session middleware
- ❌ Integer user IDs

**Now:**
- ✅ Supabase manages passwords
- ✅ JWT tokens in Authorization header
- ✅ UUID user IDs
- ✅ Stateless authentication

## 🎯 Benefits

1. **Security**: Supabase handles password security, MFA, email verification
2. **Scalability**: Stateless auth, no session storage needed
3. **Standards**: OAuth 2.0 / JWT industry standards
4. **Features**: Get email verification, password reset, social login for free

## 🐛 Troubleshooting

**If migration fails:**
```sql
-- Check current state
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('users', 'profiles');

-- Rollback if needed
npm run db:migrate -- --rollback
```

**If auth doesn't work:**
1. Check Supabase environment variables in .env
2. Verify SUPABASE_URL and SUPABASE_ANON_KEY are set
3. Check browser console for auth errors
4. Verify backend sees Authorization header

**If types don't match:**
- Remember: user IDs are now strings (UUID), not numbers
- Update all `userId: number` to `userId: string`
- Update all `parseInt(userId)` calls

## 📝 Final Checklist

- [ ] Run `npm run db:migrate`
- [ ] Run `.\scripts\replace-session-auth.ps1`
- [ ] Manually add auth checks after userId assignments
- [ ] Update type declarations (number → string)
- [ ] Test user registration
- [ ] Test user login
- [ ] Test API calls with Bearer token
- [ ] Verify `npm run db:status` shows correct tables
- [ ] Remove express-session from package.json (optional)
- [ ] Update documentation

