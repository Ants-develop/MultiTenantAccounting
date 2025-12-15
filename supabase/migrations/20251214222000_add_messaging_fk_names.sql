-- =====================================================
-- ADD EXPLICIT FOREIGN KEY CONSTRAINT NAMES FOR MESSAGING TABLES
-- Ensure predictable constraint names for Supabase queries
-- =====================================================

-- Drop existing unnamed constraints and recreate with explicit names
-- (Safe to run even if constraints don't exist)

-- Conversation participants constraints
DO $$ 
BEGIN
    -- Drop old constraint if it exists (might have auto-generated name)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%conversation_participants%user_id%') THEN
        ALTER TABLE public.conversation_participants DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey CASCADE;
    END IF;
    
    -- Add named constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversation_participants_user_id_fkey') THEN
        ALTER TABLE public.conversation_participants 
        ADD CONSTRAINT conversation_participants_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Messages sender constraint
DO $$ 
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname LIKE '%messages%sender_id%') THEN
        ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey CASCADE;
    END IF;
    
    -- Add named constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_sender_id_fkey') THEN
        ALTER TABLE public.messages 
        ADD CONSTRAINT messages_sender_id_fkey 
        FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

COMMENT ON CONSTRAINT conversation_participants_user_id_fkey ON public.conversation_participants IS 'FK to profiles table';
COMMENT ON CONSTRAINT messages_sender_id_fkey ON public.messages IS 'FK to profiles table';
