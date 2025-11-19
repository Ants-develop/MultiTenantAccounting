-- Add foreign key from calendar_events to profiles (creator)
ALTER TABLE public.calendar_events
ADD CONSTRAINT fk_calendar_events_created_by
FOREIGN KEY (created_by)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Add foreign key from calendar_event_participants to calendar_events
ALTER TABLE public.calendar_event_participants
ADD CONSTRAINT fk_calendar_event_participants_event_id
FOREIGN KEY (event_id)
REFERENCES public.calendar_events(id)
ON DELETE CASCADE;

-- Add foreign key from calendar_event_participants to profiles (participant)
ALTER TABLE public.calendar_event_participants
ADD CONSTRAINT fk_calendar_event_participants_user_id
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by 
ON public.calendar_events(created_by);

CREATE INDEX IF NOT EXISTS idx_calendar_event_participants_event_id 
ON public.calendar_event_participants(event_id);

CREATE INDEX IF NOT EXISTS idx_calendar_event_participants_user_id 
ON public.calendar_event_participants(user_id);