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

-- Add validation trigger for time range (avoiding CHECK constraint issues)
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
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_created_by ON public.calendar_events(created_by);
CREATE INDEX idx_calendar_events_type ON public.calendar_events(event_type);

-- Create calendar_event_participants table
CREATE TABLE public.calendar_event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Participation status
  status TEXT DEFAULT 'pending',
  response_at TIMESTAMP WITH TIME ZONE,
  
  -- Permissions
  is_organizer BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  
  -- Notifications
  reminder_minutes INTEGER DEFAULT 15,
  last_reminded_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Each user can only be invited once per event
  UNIQUE(event_id, user_id)
);

-- Create indexes for participants table
CREATE INDEX idx_participants_event ON public.calendar_event_participants(event_id);
CREATE INDEX idx_participants_user ON public.calendar_event_participants(user_id);
CREATE INDEX idx_participants_status ON public.calendar_event_participants(status);

-- Enable Row-Level Security
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_events
CREATE POLICY "Users can view events they're invited to"
  ON public.calendar_events FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.calendar_event_participants
      WHERE event_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Event creators and organizers can update events"
  ON public.calendar_events FOR UPDATE
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.calendar_event_participants
      WHERE event_id = id AND user_id = auth.uid() AND (is_organizer = true OR can_edit = true)
    )
  );

CREATE POLICY "Event creators can delete events"
  ON public.calendar_events FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for calendar_event_participants
CREATE POLICY "Users can view participants of their events"
  ON public.calendar_event_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE id = event_id AND (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.calendar_event_participants p
          WHERE p.event_id = event_id AND p.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Event creators and organizers can add participants"
  ON public.calendar_event_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE id = event_id AND (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.calendar_event_participants p
          WHERE p.event_id = event_id AND p.user_id = auth.uid() AND is_organizer = true
        )
      )
    )
  );

CREATE POLICY "Participants can update their own status"
  ON public.calendar_event_participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Event creators and organizers can remove participants"
  ON public.calendar_event_participants FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.calendar_events
      WHERE id = event_id AND (
        created_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.calendar_event_participants p
          WHERE p.event_id = event_id AND p.user_id = auth.uid() AND is_organizer = true
        )
      )
    )
  );

-- Add trigger for updated_at on calendar_events
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on calendar_event_participants
CREATE TRIGGER update_calendar_event_participants_updated_at
  BEFORE UPDATE ON public.calendar_event_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_event_participants;

-- Update notifications type check to include event notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'info',
  'task',
  'task_assigned',
  'task_update',
  'task_completed',
  'document_uploaded',
  'document_shared',
  'message_received',
  'client_assigned',
  'portal_invitation',
  'workflow_update',
  'system_alert',
  'event_invitation',
  'event_updated',
  'event_cancelled',
  'event_reminder',
  'event_response'
));