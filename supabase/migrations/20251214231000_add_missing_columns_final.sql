-- =====================================================
-- ADD MISSING COLUMNS FOR CALENDAR AND FEED
-- =====================================================

-- 1. Fix Calendar Event Participants Schema
-- Add missing columns requested by the client
ALTER TABLE public.calendar_event_participants 
ADD COLUMN IF NOT EXISTS is_organizer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS response_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER;

-- 2. Fix Feed Posts Schema
-- Add missing meta column
ALTER TABLE public.feed_posts
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- 3. Ensure Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_event_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_posts TO authenticated;
