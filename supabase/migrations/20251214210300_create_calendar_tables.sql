-- =====================================================
-- CREATE CALENDAR MODULE TABLES
-- Calendar Events, Event Participants
-- =====================================================

-- Calendar Events
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location TEXT,
  event_type TEXT, -- 'meeting', 'deadline', 'reminder', 'task'
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_all_day BOOLEAN DEFAULT false,
  recurrence JSONB, -- Recurrence rules
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Calendar Event Participants
CREATE TABLE IF NOT EXISTS public.calendar_event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  response_status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'tentative'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer_id ON public.calendar_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_client_id ON public.calendar_events(client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_task_id ON public.calendar_events(task_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON public.calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_event_participants_event_id ON public.calendar_event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_participants_user_id ON public.calendar_event_participants(user_id);

COMMENT ON TABLE public.calendar_events IS 'Calendar events for scheduling and planning';
COMMENT ON TABLE public.calendar_event_participants IS 'Participants in calendar events';
