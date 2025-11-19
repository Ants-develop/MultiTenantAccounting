-- Drop any existing foreign keys first
ALTER TABLE public.calendar_events
DROP CONSTRAINT IF EXISTS calendar_events_created_by_fkey;

ALTER TABLE public.calendar_event_participants
DROP CONSTRAINT IF EXISTS calendar_event_participants_event_id_fkey;

ALTER TABLE public.calendar_event_participants
DROP CONSTRAINT IF EXISTS calendar_event_participants_user_id_fkey;

-- Now add them back with proper references
ALTER TABLE public.calendar_events
ADD CONSTRAINT calendar_events_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id)
ON DELETE CASCADE;

ALTER TABLE public.calendar_event_participants
ADD CONSTRAINT calendar_event_participants_event_id_fkey
FOREIGN KEY (event_id) REFERENCES public.calendar_events(id)
ON DELETE CASCADE;

ALTER TABLE public.calendar_event_participants
ADD CONSTRAINT calendar_event_participants_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by 
ON public.calendar_events(created_by);

CREATE INDEX IF NOT EXISTS idx_calendar_event_participants_event_id 
ON public.calendar_event_participants(event_id);

CREATE INDEX IF NOT EXISTS idx_calendar_event_participants_user_id 
ON public.calendar_event_participants(user_id);