-- Drop duplicate event_id foreign key (keep the original)
ALTER TABLE public.calendar_event_participants
DROP CONSTRAINT IF EXISTS fk_calendar_event_participants_event_id;

-- Drop old auth.users foreign keys (keep the ones pointing to profiles)
ALTER TABLE public.calendar_events
DROP CONSTRAINT IF EXISTS calendar_events_created_by_fkey;

ALTER TABLE public.calendar_event_participants
DROP CONSTRAINT IF EXISTS calendar_event_participants_user_id_fkey;