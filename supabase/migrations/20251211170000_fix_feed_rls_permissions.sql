-- Fix RLS permissions for feed tables
-- This ensures all operations work with anon key when service role key is not available

-- First, ensure RLS is enabled
ALTER TABLE IF EXISTS public.feed_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feed_comments ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DO $$
BEGIN
  -- Drop policies on feed_profiles
  DROP POLICY IF EXISTS "Allow all access to profiles" ON public.feed_profiles;
  DROP POLICY IF EXISTS "Allow all operations on profiles" ON public.feed_profiles;
  
  -- Drop policies on feed_posts
  DROP POLICY IF EXISTS "Allow all access to posts" ON public.feed_posts;
  DROP POLICY IF EXISTS "Allow all operations on posts" ON public.feed_posts;
  
  -- Drop policies on feed_likes
  DROP POLICY IF EXISTS "Allow all access to likes" ON public.feed_likes;
  DROP POLICY IF EXISTS "Allow all operations on likes" ON public.feed_likes;
  
  -- Drop policies on feed_comments
  DROP POLICY IF EXISTS "Allow all access to comments" ON public.feed_comments;
  DROP POLICY IF EXISTS "Allow all operations on comments" ON public.feed_comments;
END $$;

-- Create permissive policies for all operations
-- These work with anon key when service role key is not available
CREATE POLICY "feed_profiles_all" ON public.feed_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "feed_posts_all" ON public.feed_posts
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "feed_likes_all" ON public.feed_likes
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "feed_comments_all" ON public.feed_comments
  FOR ALL
  USING (true)
  WITH CHECK (true);

