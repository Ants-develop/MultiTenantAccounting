-- =====================================================
-- FIX CALENDAR FK TARGET
-- The existing FK likely points to auth.users, preventing join with profiles
-- We need to repoint it to public.profiles
-- =====================================================

DO $$ 
BEGIN
    -- Drop the existing constraint if it exists (regardless of where it points)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_event_participants_user_id_fkey') THEN
        ALTER TABLE public.calendar_event_participants DROP CONSTRAINT calendar_event_participants_user_id_fkey;
    END IF;

    -- Add the constraint pointing to public.profiles
    -- This is required for PostgREST to allow embedding profiles in the response
    ALTER TABLE public.calendar_event_participants 
    ADD CONSTRAINT calendar_event_participants_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    
END $$;
