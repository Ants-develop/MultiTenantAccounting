-- Add missing columns to feed_posts table
ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS type text DEFAULT 'message' NOT NULL;
ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_feed_posts_type ON public.feed_posts(type);
CREATE INDEX IF NOT EXISTS idx_feed_posts_meta ON public.feed_posts USING gin(meta);

-- Add check constraint for type values
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'feed_posts_type_check'
    ) THEN
        ALTER TABLE public.feed_posts 
        ADD CONSTRAINT feed_posts_type_check 
        CHECK (type IN ('message', 'task', 'event', 'poll'));
    END IF;
END $$;
