-- Add missing type and meta columns to feed_posts table
-- This migration adds the required columns that were missing from the initial feed_posts schema

ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS type text DEFAULT 'message' NOT NULL;
ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feed_posts_type ON public.feed_posts(type);
CREATE INDEX IF NOT EXISTS idx_feed_posts_meta ON public.feed_posts USING gin(meta);

-- Add check constraint for valid type values
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

-- Verify columns exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feed_posts' AND column_name = 'type'
    ) THEN
        RAISE EXCEPTION 'Failed to add type column to feed_posts';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feed_posts' AND column_name = 'meta'
    ) THEN
        RAISE EXCEPTION 'Failed to add meta column to feed_posts';
    END IF;
    
    RAISE NOTICE 'Successfully added type and meta columns to feed_posts';
END $$;
