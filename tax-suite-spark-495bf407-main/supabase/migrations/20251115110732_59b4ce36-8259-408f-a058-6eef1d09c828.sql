-- Create security definer functions to check permissions without RLS recursion
CREATE OR REPLACE FUNCTION public.is_event_creator(_event_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.calendar_events
    WHERE id = _event_id
      AND created_by = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_event_organizer(_event_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.calendar_event_participants
    WHERE event_id = _event_id
      AND user_id = _user_id
      AND is_organizer = true
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_event_participants(_event_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.is_event_creator(_event_id, _user_id) OR
    public.is_event_organizer(_event_id, _user_id)
  )
$$;

-- Drop problematic recursive policies
DROP POLICY IF EXISTS "Users can view participants of their events" ON public.calendar_event_participants;
DROP POLICY IF EXISTS "Event creators and organizers can add participants" ON public.calendar_event_participants;
DROP POLICY IF EXISTS "Event creators and organizers can remove participants" ON public.calendar_event_participants;

-- Recreate policies using security definer functions to avoid recursion
CREATE POLICY "Users can view participants of their events"
  ON public.calendar_event_participants FOR SELECT
  USING (
    public.is_event_creator(event_id, auth.uid()) OR
    user_id = auth.uid()
  );

CREATE POLICY "Event creators and organizers can add participants"
  ON public.calendar_event_participants FOR INSERT
  WITH CHECK (
    public.can_manage_event_participants(event_id, auth.uid())
  );

CREATE POLICY "Event creators and organizers can remove participants"
  ON public.calendar_event_participants FOR DELETE
  USING (
    user_id = auth.uid() OR
    public.can_manage_event_participants(event_id, auth.uid())
  );