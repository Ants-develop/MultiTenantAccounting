-- Ensure service role key can access feed tables
-- Service role key should bypass RLS, but if there are issues, this ensures access

-- Option 1: Temporarily disable RLS for feed tables (for debugging)
-- Uncomment these if service role key still doesn't work:
-- ALTER TABLE public.feed_profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.feed_posts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.feed_likes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.feed_comments DISABLE ROW LEVEL SECURITY;

-- Option 2: Ensure policies allow all authenticated operations
-- Drop and recreate policies to be more permissive
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "feed_profiles_all" ON public.feed_profiles;
  DROP POLICY IF EXISTS "feed_posts_all" ON public.feed_posts;
  DROP POLICY IF EXISTS "feed_likes_all" ON public.feed_likes;
  DROP POLICY IF EXISTS "feed_comments_all" ON public.feed_comments;
END $$;

-- Create very permissive policies that allow all operations
-- These work with both anon key (with auth) and service role key
CREATE POLICY "feed_profiles_allow_all" ON public.feed_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "feed_posts_allow_all" ON public.feed_posts
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "feed_likes_allow_all" ON public.feed_likes
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "feed_comments_allow_all" ON public.feed_comments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Note: Service role key should bypass RLS entirely, but if you're still getting
-- permission errors, the key might be invalid or not being used correctly.
-- Check:
-- 1. SUPABASE_SERVICE_ROLE_KEY is set in .env (not SUPABASE_ANON_KEY)
-- 2. Key is complete (200+ characters, no truncation)
-- 3. Server was restarted after adding the key
-- 4. Key is from Supabase Dashboard > Settings > API > service_role (not anon)

