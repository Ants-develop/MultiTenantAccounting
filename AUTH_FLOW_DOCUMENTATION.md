# 🔐 Supabase Authentication Flow

## Overview

The application uses **Supabase Auth** for user authentication and authorization, providing enterprise-grade security with JWT tokens, password hashing, and row-level security.

---

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Client    │ ───▶ │   Express    │ ───▶ │  Supabase Auth  │
│  (Browser)  │      │   Server     │      │   (auth.users)  │
└─────────────┘      └──────────────┘      └─────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │   PostgreSQL    │
                     │  (profiles tbl) │
                     └─────────────────┘
```

---

## Database Schema

### auth.users (Supabase Managed)
- `id` (UUID) - Primary key
- `email` - User's email address
- `encrypted_password` - Bcrypt hashed password
- `email_confirmed_at` - Email verification timestamp
- `user_metadata` - JSON metadata (username, first_name, last_name)
- Created and managed automatically by Supabase

### public.profiles (Custom Table)
- `id` (UUID) - PK, FK to auth.users(id) ON DELETE CASCADE
- `username` - Unique username
- `email` - Synced from auth.users
- `first_name`, `last_name`, `full_name`
- `global_role` - 'global_administrator', 'user'
- `is_active` - Boolean flag
- `client_id` - FK to clients table
- `created_at`, `updated_at`

### Relationship
```sql
profiles.id → auth.users(id) [CASCADE DELETE]
```

When an auth.users record is deleted, the corresponding profile is automatically removed.

---

## User Creation Flow

### 1. Create User in Supabase Auth

```typescript
const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
  email: 'user@example.com',
  password: 'SecureP@ssw0rd',
  email_confirm: true, // Auto-confirm email
  user_metadata: {
    username: 'john_doe',
    first_name: 'John',
    last_name: 'Doe'
  }
});
```

**What happens:**
- Supabase creates record in `auth.users` table
- Password is automatically hashed with bcrypt
- Returns user object with UUID `id`
- `handle_new_user()` trigger can auto-create profile (if configured)

### 2. Create Profile Record

```typescript
await db.insert(profiles).values({
  id: authData.user.id, // Same UUID as auth.users
  username: 'john_doe',
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  globalRole: 'user',
  isActive: true,
});
```

**Result:**
- User can now authenticate
- Profile contains application-specific metadata
- Both records share same UUID

---

## Login Flow (Password Authentication)

### Step 1: Client Login Request

**Endpoint:** `POST /api/auth/login`

```typescript
// Client sends:
{
  email: "a.avalishvili@ants.ge",
  password: "asQW12ZX12!!"
}
```

### Step 2: Server Validates with Supabase

```typescript
const { data, error } = await supabaseAdmin.auth.signInWithPassword({
  email,
  password
});
```

**Supabase validates:**
- Email exists in `auth.users`
- Password matches stored bcrypt hash
- Account is not locked/disabled

### Step 3: JWT Token Generated

```typescript
// Server response:
{
  access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  refresh_token: "...",
  expires_in: 3600,
  user: {
    id: "1ab364bd-30a7-4a90-a08a-31654bf12496",
    email: "a.avalishvili@ants.ge",
    ...
  }
}
```

### Step 4: Client Stores Token

```typescript
// Store in memory or secure storage
localStorage.setItem('access_token', data.access_token);
```

### Step 5: Authenticated Requests

All subsequent API requests include token:

```typescript
// Request headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Request Authentication Middleware

### requireAuth Middleware

```typescript
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  // Validate JWT with Supabase
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  
  // Attach user to request
  req.user = user;
  
  // Fetch profile from database
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  
  req.profile = profile;
  next();
};
```

**Process:**
1. Extract JWT from Authorization header
2. Validate JWT signature with Supabase
3. If valid, fetch user from `auth.users`
4. Fetch corresponding profile from `profiles` table
5. Attach both to request object
6. Continue to route handler

---

## Authorization Flow

### Global Administrator Check

```typescript
export const requireGlobalAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, req.user.id))
    .limit(1);
  
  if (!profile || profile.globalRole !== 'global_administrator') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
};
```

### Usage in Routes

```typescript
// Requires authentication
router.get('/protected', requireAuth, (req, res) => {
  res.json({ user: req.profile });
});

// Requires admin role
router.post('/admin/users', requireAuth, requireGlobalAdmin, (req, res) => {
  // Only global admins can reach here
});
```

---

## Row Level Security (RLS)

### Profile Access Policy

```sql
-- Users can only view their own profile
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role has full access to profiles" 
ON profiles FOR ALL 
USING (auth.jwt()->>'role' = 'service_role');
```

### Benefits:
- Database-level security
- Cannot be bypassed by SQL injection
- Automatic enforcement on all queries
- Uses `auth.uid()` to get current user's ID from JWT

---

## Password Reset Flow

### 1. User Requests Reset

```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://yourdomain.com/reset-password'
});
```

### 2. Supabase Sends Email

- Magic link sent to user's email
- Link contains secure token
- Token expires in 1 hour

### 3. User Clicks Link

- Redirected to reset page
- Token validated by Supabase
- User enters new password

### 4. Password Updated

```typescript
await supabase.auth.updateUser({
  password: newPassword
});
```

- Supabase hashes new password
- Old password invalidated
- All sessions refreshed

---

## Token Management

### Token Expiration
- **Access Token:** 1 hour (3600 seconds)
- **Refresh Token:** 30 days (can be configured)

### Token Refresh

```typescript
const { data, error } = await supabase.auth.refreshSession({
  refresh_token: storedRefreshToken
});

// Returns new access_token and refresh_token
```

### Automatic Refresh
The Supabase client SDK automatically refreshes tokens before expiration when used on the client side.

---

## Security Best Practices

### ✅ Implemented

1. **Password Hashing** - Bcrypt with salt (handled by Supabase)
2. **JWT Tokens** - Signed with HS256 algorithm
3. **HTTPS Only** - All auth communication over HTTPS in production
4. **Row Level Security** - Database-level access control
5. **Email Verification** - Can be enforced (currently auto-confirmed)
6. **Password Strength** - Minimum 6 characters (configurable)
7. **Session Management** - Automatic token expiration and refresh
8. **Service Role Protection** - Service key only used server-side

### 🔐 Additional Recommendations

- Enable MFA (Multi-Factor Authentication)
- Implement rate limiting on login attempts
- Add account lockout after failed attempts
- Enable email confirmation in production
- Use secure session storage on client
- Implement audit logging for auth events
- Rotate service role keys periodically

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout (invalidate session)
- `POST /api/auth/signup` - Register new user (if enabled)
- `POST /api/auth/reset-password` - Request password reset
- `PUT /api/auth/update-password` - Update password

### User Management (Admin Only)
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

---

## Current Users

### Global Administrator
- **Email:** a.avalishvili@ants.ge
- **Password:** asQW12ZX12!!
- **Role:** global_administrator
- **ID:** 1ab364bd-30a7-4a90-a08a-31654bf12496

### Sample Users
- **Manager:** manager@ants.ge / manager123
- **Accountant:** accountant@ants.ge / accountant123
- **Assistant:** assistant@ants.ge / assistant123

---

## Troubleshooting

### "Invalid credentials" error
- Check email is correct
- Verify password matches
- Ensure user exists in both auth.users and profiles

### "Token expired" error
- Token has expired (1 hour default)
- Client should refresh token automatically
- Re-login if refresh token also expired

### "Email not confirmed" error
- User needs to confirm email (if enforced)
- Admin can manually confirm via Supabase dashboard
- Or set `email_confirm: true` when creating user

### Profile not found
- Check profile was created in database
- Verify profiles.id matches auth.users.id
- Check CASCADE delete didn't remove profile

---

## Scripts

### Create Admin User
```bash
npx tsx --env-file=.env scripts/create-admin-user.ts
```

### Delete Auth User (if stuck)
```bash
npx tsx --env-file=.env scripts/delete-auth-user.ts
```

### Create with Force Mode
```bash
npx tsx --env-file=.env scripts/create-admin-user.ts --force
```

---

## Environment Variables Required

```env
# Supabase Configuration
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database
DATABASE_URL=postgresql://postgres:xxx@xxx.pooler.supabase.com:5432/postgres
```

**⚠️ SECURITY:** Never commit `.env` file to version control!

---

## Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [JWT.io](https://jwt.io/) - Decode and verify JWT tokens
- [Supabase Dashboard](https://app.supabase.com/) - Manage users and auth settings
