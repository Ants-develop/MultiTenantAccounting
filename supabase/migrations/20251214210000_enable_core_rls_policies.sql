-- =====================================================
-- SIMPLIFIED RLS POLICIES
-- Only for tables that exist in current Supabase schema
-- =====================================================

-- Enable RLS on core tables only
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_companies ENABLE ROW LEVEL SECURITY;

-- Feed/Social Module (these exist in Supabase)
ALTER TABLE IF EXISTS public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feed_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "authenticated_users_read_active_profiles" ON profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "global_admins_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "global_admins_manage_profiles" ON profiles;

-- All authenticated users can view active profiles
CREATE POLICY "authenticated_users_read_active_profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_active = true);

-- Users can view their own profile even if inactive
CREATE POLICY "users_read_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Global admins can view all profiles
CREATE POLICY "global_admins_read_all_profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.global_role = 'global_administrator'
  )
);

-- Global admins can manage all profiles
CREATE POLICY "global_admins_manage_profiles"
ON profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.global_role = 'global_administrator'
  )
);

-- =====================================================
-- CLIENTS TABLE POLICIES
-- =====================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "users_read_assigned_clients" ON clients;
DROP POLICY IF EXISTS "global_admins_read_all_clients" ON clients;
DROP POLICY IF EXISTS "global_admins_manage_clients" ON clients;

-- Users can view clients they're assigned to
CREATE POLICY "users_read_assigned_clients"
ON clients FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.client_id = clients.id
    AND uc.is_active = true
  )
);

-- Global admins can view all clients
CREATE POLICY "global_admins_read_all_clients"
ON clients FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.global_role = 'global_administrator'
  )
);

-- Global admins can manage clients
CREATE POLICY "global_admins_manage_clients"
ON clients FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.global_role = 'global_administrator'
  )
);

-- =====================================================
-- USER_COMPANIES TABLE POLICIES
-- =====================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "users_read_own_assignments" ON user_companies;
DROP POLICY IF EXISTS "global_admins_read_all_assignments" ON user_companies;
DROP POLICY IF EXISTS "global_admins_manage_assignments" ON user_companies;

-- Users can view their own assignments
CREATE POLICY "users_read_own_assignments"
ON user_companies FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Global admins can view all assignments
CREATE POLICY "global_admins_read_all_assignments"
ON user_companies FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.global_role = 'global_administrator'
  )
);

-- Global admins can manage assignments
CREATE POLICY "global_admins_manage_assignments"
ON user_companies FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.global_role = 'global_administrator'
  )
);

-- =====================================================
-- FEED MODULE POLICIES
-- =====================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "authenticated_read_public_posts" ON feed_posts;
DROP POLICY IF EXISTS "users_create_posts" ON feed_posts;
DROP POLICY IF EXISTS "users_manage_own_posts" ON feed_posts;
DROP POLICY IF EXISTS "authenticated_read_comments" ON feed_comments;
DROP POLICY IF EXISTS "users_create_comments" ON feed_comments;
DROP POLICY IF EXISTS "users_manage_own_comments" ON feed_comments;
DROP POLICY IF EXISTS "authenticated_read_likes" ON feed_likes;
DROP POLICY IF EXISTS "users_manage_own_likes" ON feed_likes;
DROP POLICY IF EXISTS "authenticated_read_feed_profiles" ON feed_profiles;

-- Feed posts
CREATE POLICY "authenticated_read_public_posts"
ON feed_posts FOR SELECT
TO authenticated
USING (visibility = 'public' OR author_id = auth.uid());

CREATE POLICY "users_create_posts"
ON feed_posts FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

CREATE POLICY "users_manage_own_posts"
ON feed_posts FOR ALL
TO authenticated
USING (author_id = auth.uid());

-- Feed comments
CREATE POLICY "authenticated_read_comments"
ON feed_comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "users_create_comments"
ON feed_comments FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

CREATE POLICY "users_manage_own_comments"
ON feed_comments FOR ALL
TO authenticated
USING (author_id = auth.uid());

-- Feed likes
CREATE POLICY "authenticated_read_likes"
ON feed_likes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "users_manage_own_likes"
ON feed_likes FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Feed profiles
CREATE POLICY "authenticated_read_feed_profiles"
ON feed_profiles FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- DONE! 
-- Core tables have RLS enabled
-- NOTE: Additional policies needed when CRM/Task/Calendar tables are created
-- =====================================================
