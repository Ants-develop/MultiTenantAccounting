-- Drop the broken policy
DROP POLICY IF EXISTS "Users can view events they're invited to" ON public.calendar_events;

-- Recreate with correct table reference
CREATE POLICY "Users can view events they're invited to"
  ON public.calendar_events FOR SELECT
  USING (
    (auth.uid() = created_by) OR
    (EXISTS (
      SELECT 1
      FROM calendar_event_participants
      WHERE calendar_event_participants.event_id = calendar_events.id
        AND calendar_event_participants.user_id = auth.uid()
    ))
  );