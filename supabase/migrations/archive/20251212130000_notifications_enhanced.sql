

-- Notifications System Tables

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id serial PRIMARY KEY,
    user_id integer NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

-- RLS Policies for notifications
-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT
    USING (
        user_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
    );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE
    USING (
        user_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
    );

-- System can insert notifications for any user
CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT
    WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE
    USING (
        user_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
    );

-- Realtime
-- Add table to publication if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication, ignore
END $$;
