-- Add post type and metadata support for Bitrix24-like feed

-- Add type column with check constraint
ALTER TABLE public.feed_posts
ADD COLUMN IF NOT EXISTS type text DEFAULT 'message' NOT NULL;

-- Add check constraint for valid types
ALTER TABLE public.feed_posts
ADD CONSTRAINT feed_posts_type_check CHECK (type IN ('message', 'task', 'event', 'poll'));

-- Add meta column for type-specific data (tasks, events, polls, etc)
ALTER TABLE public.feed_posts
ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_feed_posts_type ON public.feed_posts(type);

-- Create index on created_at and type for efficient feed queries
CREATE INDEX IF NOT EXISTS idx_feed_posts_type_created ON public.feed_posts(type, created_at DESC);

