-- Ensure permissive RLS policies are in place for feed tables
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all access to profiles" ON public.feed_profiles;
DROP POLICY IF EXISTS "Allow all access to posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Allow all access to likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Allow all access to comments" ON public.feed_comments;
DROP POLICY IF EXISTS "Allow all operations on profiles" ON public.feed_profiles;
DROP POLICY IF EXISTS "Allow all operations on posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Allow all operations on likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Allow all operations on comments" ON public.feed_comments;

-- Create new permissive policies that allow all operations for anonymous users
-- These policies work with anon key when service role key is not available
DO $$
BEGIN
  -- Profiles: Allow all operations
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feed_profiles' AND policyname = 'Allow all operations on profiles') THEN
    CREATE POLICY "Allow all operations on profiles" 
      ON public.feed_profiles 
      FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;

  -- Posts: Allow all operations
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feed_posts' AND policyname = 'Allow all operations on posts') THEN
    CREATE POLICY "Allow all operations on posts" 
      ON public.feed_posts 
      FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;

  -- Likes: Allow all operations
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feed_likes' AND policyname = 'Allow all operations on likes') THEN
    CREATE POLICY "Allow all operations on likes" 
      ON public.feed_likes 
      FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;

  -- Comments: Allow all operations
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feed_comments' AND policyname = 'Allow all operations on comments') THEN
    CREATE POLICY "Allow all operations on comments" 
      ON public.feed_comments 
      FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;

