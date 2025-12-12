-- Notifications System Tables & Functions

-- Notifications table (linked to feed_profiles)
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id integer NOT NULL REFERENCES public.feed_profiles(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view their own notifications') THEN
        CREATE POLICY "Users can view their own notifications" ON public.notifications
        FOR SELECT USING (auth.uid()::text = user_id::text OR true); -- Permissive for prototype
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'System can create notifications') THEN
        CREATE POLICY "System can create notifications" ON public.notifications
        FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update their own notifications') THEN
        CREATE POLICY "Users can update their own notifications" ON public.notifications
        FOR UPDATE USING (true); -- Permissive for prototype
    END IF;
END $$;

-- Realtime
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- Function to create a notification (RPC)
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id integer, -- Changed from UUID to integer to match feed_profiles
  _type text,
  _title text,
  _message text,
  _link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _notification_id uuid;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    is_read,
    created_at
  ) VALUES (
    _user_id,
    _type,
    _title,
    _message,
    _link,
    false,
    now()
  )
  RETURNING id INTO _notification_id;
  
  RETURN _notification_id;
END;
$$;

-- Function to get notification recipients (Optional - adapted for integer IDs)
CREATE OR REPLACE FUNCTION public.get_notification_recipients(
  _entity_type text,
  _entity_id uuid,
  _action text
)
RETURNS TABLE(user_id integer, notification_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Placeholder: Add logic here to map entity actions to user IDs
  -- For example, if a task is assigned, return the assignee's ID.
  -- Since main app tables (tasks, etc.) might use integer IDs, we need to be careful with types.
  
  -- Example dummy return to prevent errors if called empty
  RETURN QUERY SELECT 0, 'none'::text WHERE 1=0;
END;
$$;

-- Trigger Function: Audit to Notifications
-- This assumes audit_logs table exists. If not, it will fail, so we wrap in DO block or handle gracefully.
CREATE OR REPLACE FUNCTION public.create_notifications_from_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recipient RECORD;
  _notification_title text;
  _notification_message text;
  _notification_link text;
BEGIN
  -- Simple example trigger logic
  -- In a real app, you'd map NEW.entity_type/action to specific users
  
  -- Example: If a new task is created, notify admins (just a placeholder logic)
  IF NEW.action = 'CREATE' AND NEW.entity_type = 'tasks' THEN
      _notification_title := 'New Task Created';
      _notification_message := 'Task created by user ' || NEW.user_id;
      _notification_link := '/tasks';
      
      -- Here we would need to know WHO to notify. 
      -- For now, we'll skip actual insertion to avoid spamming or guessing IDs.
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger if audit_logs exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        DROP TRIGGER IF EXISTS audit_to_notifications_trigger ON public.audit_logs;
        CREATE TRIGGER audit_to_notifications_trigger
          AFTER INSERT ON public.audit_logs
          FOR EACH ROW
          EXECUTE FUNCTION create_notifications_from_audit();
    END IF;
END $$;
