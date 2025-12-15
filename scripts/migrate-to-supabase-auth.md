# Supabase Auth Migration - Code Changes Checklist

## Files Already Updated ✅
- ✅ server/auth.ts - Removed bcrypt, updated getUserWithCompanies
- ✅ server/middleware/auth.ts - Already using Supabase
- ✅ server/routes.ts - Already using requireAuth middleware
- ✅ shared/schema.ts - Fixed type exports
- ✅ migrations/0001_mysterious_fallen_one.sql - Added DOWN section
- ✅ migrations/0002_migrate_to_supabase_auth.sql - Created
- ✅ server/api/company.ts (partial) - Lines 58 and 79 updated

## Remaining Files to Update

### Pattern to Replace:
```typescript
// OLD:
const userId = req.session.userId!;
// or
req.session.userId!

// NEW:
const userId = req.user?.id;
if (!userId) return res.status(401).json({ message: 'Not authenticated' });
```

### Files with req.session.userId (50+ instances):

1. **server/api/company.ts** (14 remaining instances)
   - Lines: 114, 223, 257, 282, 305, 333, 356, 381, 404, 437, 462, 478, 501, 591, 631, 688

2. **server/api/clients.ts** (8 instances)
   - Lines: 206, 259, 299, 341, 450, 498, 543, 667

3. **server/api/bank.ts** (8 instances)
   - Lines: 63, 119, 186, 309, 381, 483, 539, 580

4. **server/api/storage.ts** (7 instances)
   - Lines: 31, 172, 233, 388, 490, 562, 616

5. **server/api/rs-admin.ts** (5 instances)
   - Lines: 410, 521, 627, 672, 738

6. **server/api/messages.ts** (2 instances)
   - Lines: 11, 23

7. **server/api/backup-restore.ts** (3 instances)
   - Lines: 273, 280, 481

8. **server/routes/notifications.ts** (6 instances)
   - Lines: 11, 32, 56, 91, 111, 145

9. **server/routes/feed.ts** (5 instances)
   - Lines: 112, 190, 228, 280, 342

10. **server/middleware/permissions.ts** (1 instance)
    - Line: 8

## Type Changes Required

### Change from number to string (UUID):
```typescript
// OLD:
userId: number
userId?: number
user_id: number

// NEW:
userId: string  
userId?: string
user_id: string
```

### Files Needing Type Updates:
- server/services/notification.ts - Line 5
- server/services/notification-service.ts - Line 37
- server/services/matrix-bridge.ts - Line 102
- server/services/feed.ts - Line 16
- server/services/backup-download.ts - Line 80
- server/storage.ts - Line 495

## Session Removal

### Remove from server/index.ts:
```typescript
// DELETE these lines:
import session from 'express-session';
import pgConnect from 'connect-pg-simple';

app.use(session({
  // ... session config
}));
```

## After Migration:

1. Run migration:
   ```bash
   npm run db:migrate
   ```

2. Test authentication:
   - Register new user via Supabase
   - Login should work with email/password
   - All API calls should use Authorization: Bearer <token>

3. Verify:
   ```bash
   npm run db:status
   ```
