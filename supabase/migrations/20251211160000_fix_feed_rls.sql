-- Ensure permissive RLS policies are in place for feed tables
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all access to profiles" ON public.feed_profiles;
DROP POLICY IF EXISTS "Allow all access to posts" ON public.feed_posts;
DROP POLICY IF EXISTS "Allow all access to likes" ON public.feed_likes;
DROP POLICY IF EXISTS "Allow all access to comments" ON public.feed_comments;

-- Create new permissive policies that allow all operations
CREATE POLICY "Allow all operations on profiles" 
  ON public.feed_profiles 
  FOR ALL 
  TO public
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all operations on posts" 
  ON public.feed_posts 
  FOR ALL 
  TO public
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all operations on likes" 
  ON public.feed_likes 
  FOR ALL 
  TO public
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all operations on comments" 
  ON public.feed_comments 
  FOR ALL 
  TO public
  USING (true) 
  WITH CHECK (true);

