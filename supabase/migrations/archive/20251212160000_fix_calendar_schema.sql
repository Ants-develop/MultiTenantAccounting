-- Fix Calendar Schema to use UUIDs

-- Drop existing tables if they exist (to replace Drizzle integer-based tables)
DROP TABLE IF EXISTS public.calendar_event_participants CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;

-- Create calendar_events table
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_type TEXT NOT NULL DEFAULT 'meeting',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  
  -- Recurrence support
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB,
  
  -- Metadata
  color TEXT DEFAULT '#6366f1',
  meeting_link TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add validation trigger for time range
CREATE OR REPLACE FUNCTION validate_event_time_range()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'Event end time must be after start time';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_event_time_range
  BEFORE INSERT OR UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION validate_event_time_range();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON public.calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON public.calendar_events(event_type);

-- Create calendar_event_participants table
CREATE TABLE public.calendar_event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'tentative')),
  is_organizer BOOLEAN DEFAULT false,
  
  -- Permissions
  can_edit BOOLEAN DEFAULT false,
  
  -- Response metadata
  response_at TIMESTAMP WITH TIME ZONE,
  reminder_minutes INTEGER DEFAULT 15,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_participants_event ON public.calendar_event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_participants_user ON public.calendar_event_participants(user_id);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_participants ENABLE ROW LEVEL SECURITY;

-- Policies for calendar_events

-- View: Users can view events they created or are invited to
CREATE POLICY "Users can view events they are part of" ON public.calendar_events
  FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.calendar_event_participants
      WHERE event_id = id AND user_id = auth.uid()
    )
  );

-- Insert: Authenticated users can create events
CREATE POLICY "Users can create events" ON public.calendar_events
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
  );

-- Update: Only creator can update
CREATE POLICY "Creators can update their events" ON public.calendar_events
  FOR UPDATE
  USING (
    created_by = auth.uid()
  );

-- Delete: Only creator can delete
CREATE POLICY "Creators can delete their events" ON public.calendar_events
  FOR DELETE
  USING (
    created_by = auth.uid()
  );

-- Policies for calendar_event_participants

-- View: Users can view participants of events they belong to
CREATE POLICY "Users can view participants of events they belong to" ON public.calendar_event_participants
  FOR SELECT
  USING (
    user_id = auth.uid() OR -- I am this participant
    EXISTS ( -- I am the creator of the event
      SELECT 1 FROM public.calendar_events
      WHERE id = event_id AND created_by = auth.uid()
    ) OR
    EXISTS ( -- I am another participant in the same event
      SELECT 1 FROM public.calendar_event_participants p2
      WHERE p2.event_id = event_id AND p2.user_id = auth.uid()
    )
  );

-- Insert: Creators can add participants
CREATE POLICY "Creators can add participants" ON public.calendar_event_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Update: Participants can update their own status
CREATE POLICY "Participants can update their status" ON public.calendar_event_participants
  FOR UPDATE
  USING (
    user_id = auth.uid()
  );

-- Delete: Creators can remove participants
CREATE POLICY "Creators can remove participants" ON public.calendar_event_participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE id = event_id AND created_by = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_participants_updated_at
  BEFORE UPDATE ON public.calendar_event_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
