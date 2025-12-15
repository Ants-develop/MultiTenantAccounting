-- =====================================================
-- FIX CALENDAR AND ADD MISSING CONSTRAINT NAMES
-- =====================================================

-- Calendar event participants foreign key
DO $$ 
BEGIN
    -- Add named constraint for user_id
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_event_participants_user_id_fkey') THEN
        ALTER TABLE public.calendar_event_participants 
        ADD CONSTRAINT calendar_event_participants_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Grant access to password tables (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_folders') THEN
        ALTER TABLE public.password_folders ENABLE ROW LEVEL SECURITY;
        
        -- Allow users to read password folders they have access to
        DROP POLICY IF EXISTS "users_read_password_folders" ON public.password_folders;
        CREATE POLICY "users_read_password_folders"
        ON public.password_folders FOR SELECT
        TO authenticated
        USING (
          created_by = auth.uid() OR
          EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.global_role = 'global_administrator'
          )
        );
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.password_folders TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'passwords') THEN
        ALTER TABLE public.passwords ENABLE ROW LEVEL SECURITY;
        
        -- Allow users to read passwords they have access to
        DROP POLICY IF EXISTS "users_read_passwords" ON public.passwords;
        CREATE POLICY "users_read_passwords"
        ON public.passwords FOR SELECT
        TO authenticated
        USING (
          created_by = auth.uid() OR
          EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.global_role = 'global_administrator'
          )
        );
        
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.passwords TO authenticated;
    END IF;
END $$;

COMMENT ON CONSTRAINT calendar_event_participants_user_id_fkey ON public.calendar_event_participants IS 'FK to profiles table';
