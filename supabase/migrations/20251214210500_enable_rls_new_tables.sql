-- =====================================================
-- ENABLE RLS AND CREATE POLICIES FOR NEW TABLES
-- CRM, Tasks, Workflows, Calendar, Messaging
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_contacts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_pipeline_stages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_participants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DEALS POLICIES
-- =====================================================

CREATE POLICY "users_read_client_deals"
ON deals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.client_id = deals.client_id
    AND uc.is_active = true
  ) OR owner_id = auth.uid()
);

CREATE POLICY "users_create_client_deals"
ON deals FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.client_id = deals.client_id
    AND uc.is_active = true
  ) AND created_by = auth.uid()
);

CREATE POLICY "users_update_own_deals"
ON deals FOR UPDATE
TO authenticated
USING (owner_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "global_admins_manage_deals"
ON deals FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.global_role = 'global_administrator'
  )
);

-- Deal Stages
CREATE POLICY "authenticated_read_deal_stages"
ON deal_stages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "global_admins_manage_deal_stages"
ON deal_stages FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.global_role = 'global_administrator'
  )
);

-- Deal Activities
CREATE POLICY "users_read_deal_activities"
ON deal_activities FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = deal_activities.deal_id
    AND (d.owner_id = auth.uid() OR d.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = auth.uid()
        AND uc.client_id = d.client_id
        AND uc.is_active = true
      )
    )
  )
);

CREATE POLICY "users_create_deal_activities"
ON deal_activities FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Deal Contacts
CREATE POLICY "users_read_deal_contacts"
ON deal_contacts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM deals d
    WHERE d.id = deal_contacts.deal_id
    AND (d.owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.client_id = d.client_id
      AND uc.is_active = true
    ))
  )
);

-- =====================================================
-- TASKS POLICIES
-- =====================================================

CREATE POLICY "users_read_tasks"
ON tasks FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid() 
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.client_id = tasks.client_id
    AND uc.is_active = true
  )
);

CREATE POLICY "users_create_tasks"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "users_update_tasks"
ON tasks FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "global_admins_manage_tasks"
ON tasks FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.global_role = 'global_administrator'
  )
);

-- Task Templates
CREATE POLICY "authenticated_read_task_templates"
ON task_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "global_admins_manage_task_templates"
ON task_templates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.global_role = 'global_administrator'
  )
);

-- Task Comments
CREATE POLICY "users_read_task_comments"
ON task_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_comments.task_id
    AND (t.assigned_to = auth.uid() OR t.created_by = auth.uid())
  )
);

CREATE POLICY "users_create_task_comments"
ON task_comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- WORKFLOWS POLICIES
-- =====================================================

CREATE POLICY "users_read_workflows"
ON workflows FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.client_id = workflows.client_id
    AND uc.is_active = true
  )
);

CREATE POLICY "users_create_workflows"
ON workflows FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.client_id = workflows.client_id
    AND uc.is_active = true
  )
);

CREATE POLICY "users_update_workflows"
ON workflows FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "global_admins_manage_workflows"
ON workflows FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.global_role = 'global_administrator'
  )
);

-- Workflow Templates
CREATE POLICY "authenticated_read_active_templates"
ON workflow_templates FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "global_admins_manage_templates"
ON workflow_templates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.global_role = 'global_administrator'
  )
);

-- Workflow Stages
CREATE POLICY "authenticated_read_workflow_stages"
ON workflow_stages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "global_admins_manage_workflow_stages"
ON workflow_stages FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.global_role = 'global_administrator'
  )
);

-- Client Pipelines
CREATE POLICY "users_read_client_pipelines"
ON client_pipelines FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.client_id = client_pipelines.client_id
    AND uc.is_active = true
  )
);

-- =====================================================
-- CALENDAR POLICIES
-- =====================================================

CREATE POLICY "users_read_calendar_events"
ON calendar_events FOR SELECT
TO authenticated
USING (
  organizer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM calendar_event_participants cep
    WHERE cep.event_id = calendar_events.id
    AND cep.user_id = auth.uid()
  )
);

CREATE POLICY "users_create_events"
ON calendar_events FOR INSERT
TO authenticated
WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "organizers_manage_events"
ON calendar_events FOR ALL
TO authenticated
USING (organizer_id = auth.uid());

CREATE POLICY "global_admins_manage_events"
ON calendar_events FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.global_role = 'global_administrator'
  )
);

-- Calendar Event Participants
CREATE POLICY "users_read_event_participants"
ON calendar_event_participants FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM calendar_event_participants cep
    WHERE cep.event_id = calendar_event_participants.event_id
    AND cep.user_id = auth.uid()
  )
);

CREATE POLICY "organizers_manage_participants"
ON calendar_event_participants FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM calendar_events ce
    WHERE ce.id = calendar_event_participants.event_id
    AND ce.organizer_id = auth.uid()
  )
);

CREATE POLICY "users_update_own_participation"
ON calendar_event_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- MESSAGING POLICIES
-- =====================================================

CREATE POLICY "users_read_conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "users_create_conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "participants_update_conversations"
ON conversations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);

-- Conversation Participants
CREATE POLICY "participants_read_participants"
ON conversation_participants FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "creators_add_participants"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_participants.conversation_id
    AND c.created_by = auth.uid()
  )
);

CREATE POLICY "users_update_own_participation"
ON conversation_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Messages
CREATE POLICY "participants_read_messages"
ON messages FOR SELECT
TO authenticated
USING (
  NOT is_deleted
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "users_create_messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "users_update_own_messages"
ON messages FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.deals TO authenticated;
GRANT ALL ON public.deal_stages TO authenticated;
GRANT ALL ON public.deal_activities TO authenticated;
GRANT ALL ON public.deal_contacts TO authenticated;
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.task_templates TO authenticated;
GRANT ALL ON public.task_comments TO authenticated;
GRANT ALL ON public.workflows TO authenticated;
GRANT ALL ON public.workflow_templates TO authenticated;
GRANT ALL ON public.workflow_stages TO authenticated;
GRANT ALL ON public.workflow_stage_history TO authenticated;
GRANT ALL ON public.client_pipelines TO authenticated;
GRANT ALL ON public.client_pipeline_stages TO authenticated;
GRANT ALL ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_event_participants TO authenticated;
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversation_participants TO authenticated;
GRANT ALL ON public.messages TO authenticated;

-- =====================================================
-- DONE!
-- All new tables have RLS enabled with multi-tenant policies
-- =====================================================
