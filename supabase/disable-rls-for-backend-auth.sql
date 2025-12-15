-- Disable Row Level Security on tables that should be accessed via backend API
-- The backend uses authentication middleware (requireAuth) instead of Supabase RLS

-- CRM Module Tables
ALTER TABLE IF EXISTS public.deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deal_stages DISABLE ROW LEVEL SECURITY;

-- Task Management Tables  
ALTER TABLE IF EXISTS public.tasks DISABLE ROW LEVEL SECURITY;

-- Workflow Tables
ALTER TABLE IF EXISTS public.workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflow_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflow_stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflow_tasks DISABLE ROW LEVEL SECURITY;

-- Client/Company Tables (if RLS is enabled)
ALTER TABLE IF EXISTS public.clients DISABLE ROW LEVEL SECURITY;

-- User Profile Tables
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

-- Calendar Tables
ALTER TABLE IF EXISTS public.calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.calendar_event_participants DISABLE ROW LEVEL SECURITY;

-- Messaging Tables
ALTER TABLE IF EXISTS public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies on these tables
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN (
            'deals', 'deal_stages', 'tasks', 'workflows', 
            'workflow_templates', 'workflow_stages', 'workflow_tasks',
            'clients', 'profiles', 'calendar_events', 'calendar_event_participants',
            'conversations', 'conversation_participants', 'messages'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Dropped policy % on %.%', pol.policyname, pol.schemaname, pol.tablename;
    END LOOP;
END $$;

-- Note: Run this in Supabase SQL Editor
-- After running, all access control will be handled by the backend API authentication middleware
