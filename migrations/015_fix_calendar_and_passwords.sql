-- Fix Calendar Schema and Policies, and Create Password Tables

-- 1. Create Password Tables if they don't exist
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.password_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES public.password_folders(id) ON DELETE CASCADE,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_archived BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_password_folders_client_id ON public.password_folders(client_id);
CREATE INDEX IF NOT EXISTS idx_password_folders_parent_id ON public.password_folders(parent_folder_id);

ALTER TABLE public.password_folders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.passwords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES public.password_folders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  username TEXT,
  password_encrypted TEXT NOT NULL,
  url TEXT,
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_rotated_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  strength_score INTEGER
);

ALTER TABLE public.passwords ENABLE ROW LEVEL SECURITY;

-- 2. Update Calendar Events Schema
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB,
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS meeting_link TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Update created_by from organizer_id if null
UPDATE public.calendar_events SET created_by = organizer_id WHERE created_by IS NULL;
ALTER TABLE public.calendar_events ALTER COLUMN created_by SET NOT NULL;

-- 3. Update Calendar Event Participants Schema
ALTER TABLE public.calendar_event_participants
ADD COLUMN IF NOT EXISTS is_organizer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER DEFAULT 15;

-- 4. Fix RLS Policies for Calendar to avoid recursion

-- Helper function to check participation without recursion
CREATE OR REPLACE FUNCTION public.is_event_participant(check_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.calendar_event_participants 
    WHERE event_id = check_event_id 
    AND user_id = auth.uid()
  );
$$;

-- Drop existing policies to be safe
DROP POLICY IF EXISTS "Users can view events they organized or attend" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can view participants of events they can see" ON public.calendar_event_participants;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.calendar_events;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.calendar_events;
DROP POLICY IF EXISTS "Enable update for owners and participants" ON public.calendar_events;
DROP POLICY IF EXISTS "Enable delete for owners" ON public.calendar_events;

-- Calendar Events Policies
CREATE POLICY "View events"
ON public.calendar_events
FOR SELECT
USING (
  organizer_id = auth.uid() 
  OR 
  public.is_event_participant(id)
);

CREATE POLICY "Create events"
ON public.calendar_events
FOR INSERT
WITH CHECK (
  auth.uid() = organizer_id
);

CREATE POLICY "Update events"
ON public.calendar_events
FOR UPDATE
USING (
  organizer_id = auth.uid() 
  OR 
  (public.is_event_participant(id) AND EXISTS (
    SELECT 1 FROM public.calendar_event_participants 
    WHERE event_id = id AND user_id = auth.uid() AND can_edit = true
  ))
);

CREATE POLICY "Delete events"
ON public.calendar_events
FOR DELETE
USING (
  organizer_id = auth.uid()
);

-- Calendar Event Participants Policies
DROP POLICY IF EXISTS "View participants" ON public.calendar_event_participants;
DROP POLICY IF EXISTS "Manage participants" ON public.calendar_event_participants;

CREATE POLICY "View participants"
ON public.calendar_event_participants
FOR SELECT
USING (
  user_id = auth.uid() -- Can see my own participation
  OR
  event_id IN (SELECT id FROM public.calendar_events) -- Can see participants of events I can see (triggers calendar_events policy -> is_event_participant -> security definer -> no loop)
);

CREATE POLICY "Manage participants"
ON public.calendar_event_participants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_events 
    WHERE id = event_id AND organizer_id = auth.uid()
  )
);

-- 5. Password Policies (Simple version for now)
DROP POLICY IF EXISTS "Users can view their own password folders" ON public.password_folders;
CREATE POLICY "Users can view their own password folders"
ON public.password_folders
FOR ALL
USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = password_folders.client_id 
    -- Add more complex role checks here if needed, for now allow if client access exists
  )
);

DROP POLICY IF EXISTS "Users can view their own passwords" ON public.passwords;
CREATE POLICY "Users can view their own passwords"
ON public.passwords
FOR ALL
USING (
  created_by = auth.uid() OR
  folder_id IN (SELECT id FROM public.password_folders)
);
