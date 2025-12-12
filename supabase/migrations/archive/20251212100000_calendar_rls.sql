-- Enable RLS
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calendar_event_participants" ENABLE ROW LEVEL SECURITY;

-- Policies for calendar_events

-- View: Users can view events they created or are invited to
CREATE POLICY "Users can view events they are part of" ON "calendar_events"
  FOR SELECT
  USING (
    created_by = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email') OR
    EXISTS (
      SELECT 1 FROM "calendar_event_participants"
      WHERE event_id = id AND user_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
    )
  );

-- Insert: Authenticated users can create events
CREATE POLICY "Users can create events" ON "calendar_events"
  FOR INSERT
  WITH CHECK (
    created_by = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
  );

-- Update: Only creator can update
CREATE POLICY "Creators can update their events" ON "calendar_events"
  FOR UPDATE
  USING (
    created_by = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
  );

-- Delete: Only creator can delete
CREATE POLICY "Creators can delete their events" ON "calendar_events"
  FOR DELETE
  USING (
    created_by = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
  );

-- Policies for calendar_event_participants

-- View: Users can view participants of events they belong to
CREATE POLICY "Users can view participants of events they belong to" ON "calendar_event_participants"
  FOR SELECT
  USING (
    user_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email') OR -- I am this participant
    EXISTS ( -- I am the creator of the event
      SELECT 1 FROM "calendar_events"
      WHERE id = event_id AND created_by = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
    ) OR
    EXISTS ( -- I am another participant in the same event
      SELECT 1 FROM "calendar_event_participants" as other
      WHERE other.event_id = event_id AND other.user_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
    )
  );

-- Insert: Creator of the event can add participants.
CREATE POLICY "Event creators can add participants" ON "calendar_event_participants"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "calendar_events"
      WHERE id = event_id AND created_by = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
    )
  );

-- Update: 
-- 1. Creator can update any participant (e.g. permissions).
-- 2. Participant can update their own status.
CREATE POLICY "Creators can update participants" ON "calendar_event_participants"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "calendar_events"
      WHERE id = event_id AND created_by = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Participants can update their own status" ON "calendar_event_participants"
  FOR UPDATE
  USING (
    user_id = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
  );

-- Delete: Creator can remove participants.
CREATE POLICY "Creators can remove participants" ON "calendar_event_participants"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "calendar_events"
      WHERE id = event_id AND created_by = (SELECT id FROM users WHERE email = auth.jwt() ->> 'email')
    )
  );
