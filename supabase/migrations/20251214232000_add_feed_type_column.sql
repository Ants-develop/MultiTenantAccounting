-- =====================================================
-- ADD MISSING COLUMNS TO FEED_POSTS
-- =====================================================

-- Add type column if it doesn't exist
ALTER TABLE public.feed_posts 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'message';

-- Add visibility column if it doesn't exist (it was used in the insert code)
ALTER TABLE public.feed_posts 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';

-- Add attachments column if it doesn't exist (it was used in the insert code)
ALTER TABLE public.feed_posts 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add likes_count and comments_count if they don't exist (common in feed schemas)
ALTER TABLE public.feed_posts 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

ALTER TABLE public.feed_posts 
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Ensure grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_posts TO authenticated;
