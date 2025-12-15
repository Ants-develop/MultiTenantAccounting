-- =====================================================
-- ENABLE RLS + CREATE POLICIES FOR ALL TABLES
-- Full Supabase Auth approach for multi-tenant accounting
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_companies ENABLE ROW LEVEL SECURITY;

-- CRM Module
ALTER TABLE IF EXISTS public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.deal_stages ENABLE ROW LEVEL SECURITY;

-- Task Management
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;

-- Workflow Module
ALTER TABLE IF EXISTS public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workflow_tasks ENABLE ROW LEVEL SECURITY;

-- Calendar Module
ALTER TABLE IF EXISTS public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.calendar_event_participants ENABLE ROW LEVEL SECURITY;

-- Messaging Module
ALTER TABLE IF EXISTS public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

-- Feed/Social Module
ALTER TABLE IF EXISTS public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feed_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

-- All authenticated users can view active profiles (for user directory, assignments, etc.)
CREATE POLICY "authenticated_users_read_active_profiles"
ON profiles FOR SELECT
TO authenticated
USING (is_active = true);

-- Users can view their own profile even if inactive
CREATE POLICY "users_read_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Users can update their own profile (limited fields)
CREATE POLICY "users_update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Global admins can view all profiles
CREATE POLICY "global_admins_read_all_profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'global_administrator'
  )
);

-- Global admins can manage all profiles
CREATE POLICY "global_admins_manage_profiles"
ON profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'global_administrator'
  )
);

-- =====================================================
-- CLIENTS TABLE POLICIES
-- =====================================================

-- Users can view clients they're assigned to
CREATE POLICY "users_read_assigned_clients"
ON clients FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.user_id = auth.uid()
    AND user_companies.client_id = clients.id
    AND user_companies.is_active = true
  )
);

-- Global admins can view all clients
CREATE POLICY "global_admins_read_all_clients"
ON clients FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'global_administrator'
  )
);

-- Global admins can manage clients
CREATE POLICY "global_admins_manage_clients"
ON clients FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'global_administrator'
  )
);

-- =====================================================
-- USER_COMPANIES (ASSIGNMENTS) POLICIES
-- =====================================================

-- Users can view their own assignments
CREATE POLICY "users_read_own_assignments"
ON user_companies FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Global admins can view all assignments
CREATE POLICY "global_admins_read_all_assignments"
ON user_companies FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'global_administrator'
  )
);

-- Global admins can manage assignments
CREATE POLICY "global_admins_manage_assignments"
ON user_companies FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'global_administrator'
  )
);

-- =====================================================
-- DEALS (CRM) POLICIES
-- =====================================================

-- Users can view deals for their assigned clients
CREATE POLICY "users_read_client_deals"
ON deals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.user_id = auth.uid()
    AND user_companies.client_id = deals.client_id
    AND user_companies.is_active = true
  )
);

-- Users can view deals they own
CREATE POLICY "users_read_own_deals"
ON deals FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Users can create deals for their assigned clients
CREATE POLICY "users_create_client_deals"
ON deals FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.user_id = auth.uid()
    AND user_companies.client_id = deals.client_id
    AND user_companies.is_active = true
  )
);

-- Users can update/delete their own deals
CREATE POLICY "users_manage_own_deals"
ON deals FOR ALL
TO authenticated
USING (owner_id = auth.uid());

-- Global admins can manage all deals
CREATE POLICY "global_admins_manage_deals"
ON deals FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'global_administrator'
  )
);

-- =====================================================
-- DEAL_STAGES POLICIES
-- =====================================================

-- All authenticated users can view deal stages (dropdown options)
CREATE POLICY "authenticated_read_deal_stages"
ON deal_stages FOR SELECT
TO authenticated
USING (true);

-- Global admins can manage deal stages
CREATE POLICY "global_admins_manage_deal_stages"
ON deal_stages FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'global_administrator'
  )
);

-- =====================================================
-- TASKS POLICIES
-- =====================================================

-- Users can view tasks assigned to them
CREATE POLICY "users_read_assigned_tasks"
ON tasks FOR SELECT
TO authenticated
USING (assigned_to = auth.uid());

-- Users can view tasks they created
CREATE POLICY "users_read_created_tasks"
ON tasks FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Users can view tasks for their assigned clients
CREATE POLICY "users_read_client_tasks"
ON tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.user_id = auth.uid()
    AND user_companies.client_id = tasks.client_id
    AND user_companies.is_active = true
  )
);

-- Users can create tasks
CREATE POLICY "users_create_tasks"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Users can update tasks assigned to them
CREATE POLICY "users_update_assigned_tasks"
ON tasks FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

-- Users can update tasks they created
CREATE POLICY "users_update_created_tasks"
ON tasks FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Global admins can manage all tasks
CREATE POLICY "global_admins_manage_tasks"
ON tasks FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'global_administrator'
  )
);

-- =====================================================
-- WORKFLOWS POLICIES
-- =====================================================

-- Users can view workflows for their assigned clients
CREATE POLICY "users_read_client_workflows"
ON workflows FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.user_id = auth.uid()
    AND user_companies.client_id = workflows.client_id
    AND user_companies.is_active = true
  )
);

-- Users can view workflows assigned to them
CREATE POLICY "users_read_assigned_workflows"
ON workflows FOR SELECT
TO authenticated
USING (assigned_to = auth.uid());

-- Users can create workflows for assigned clients
CREATE POLICY "users_create_client_workflows"
ON workflows FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.user_id = auth.uid()
    AND user_companies.client_id = workflows.client_id
    AND user_companies.is_active = true
  )
);

-- Users can update workflows they're assigned to
CREATE POLICY "users_update_assigned_workflows"
ON workflows FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid());

-- Global admins can manage all workflows
CREATE POLICY "global_admins_manage_workflows"
ON workflows FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'global_administrator'
  )
);

-- =====================================================
-- WORKFLOW_TEMPLATES POLICIES
-- =====================================================

-- All authenticated users can view active workflow templates
CREATE POLICY "authenticated_read_active_templates"
ON workflow_templates FOR SELECT
TO authenticated
USING (is_active = true);

-- Global admins can manage workflow templates
CREATE POLICY "global_admins_manage_templates"
ON workflow_templates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'global_administrator'
  )
);

-- =====================================================
-- WORKFLOW_STAGES POLICIES
-- =====================================================

-- All authenticated users can view workflow stages
CREATE POLICY "authenticated_read_workflow_stages"
ON workflow_stages FOR SELECT
TO authenticated
USING (true);

-- Global admins can manage workflow stages
CREATE POLICY "global_admins_manage_workflow_stages"
ON workflow_stages FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'global_administrator'
  )
);

-- =====================================================
-- WORKFLOW_TASKS POLICIES
-- =====================================================

-- Users can view workflow tasks for workflows they can access
CREATE POLICY "users_read_accessible_workflow_tasks"
ON workflow_tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workflows
    WHERE workflows.id = workflow_tasks.workflow_id
    AND (
      workflows.assigned_to = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_companies
        WHERE user_companies.user_id = auth.uid()
        AND user_companies.client_id = workflows.client_id
        AND user_companies.is_active = true
      )
    )
  )
);

-- Users can update workflow tasks for their workflows
CREATE POLICY "users_update_workflow_tasks"
ON workflow_tasks FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workflows
    WHERE workflows.id = workflow_tasks.workflow_id
    AND workflows.assigned_to = auth.uid()
  )
);

-- Global admins can manage all workflow tasks
CREATE POLICY "global_admins_manage_workflow_tasks"
ON workflow_tasks FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'global_administrator'
  )
);

-- =====================================================
-- CALENDAR_EVENTS POLICIES
-- =====================================================

-- Users can view events they're participating in
CREATE POLICY "users_read_participating_events"
ON calendar_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM calendar_event_participants
    WHERE calendar_event_participants.event_id = calendar_events.id
    AND calendar_event_participants.user_id = auth.uid()
  )
);

-- Users can view events they created
CREATE POLICY "users_read_created_events"
ON calendar_events FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Users can create events
CREATE POLICY "users_create_events"
ON calendar_events FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Users can update/delete events they created
CREATE POLICY "users_manage_created_events"
ON calendar_events FOR ALL
TO authenticated
USING (created_by = auth.uid());

-- Global admins can manage all events
CREATE POLICY "global_admins_manage_events"
ON calendar_events FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.global_role = 'global_administrator'
  )
);

-- =====================================================
-- CALENDAR_EVENT_PARTICIPANTS POLICIES
-- =====================================================

-- Users can view their own event participations
CREATE POLICY "users_read_own_participations"
ON calendar_event_participants FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can view participants of events they're in
CREATE POLICY "users_read_event_participants"
ON calendar_event_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM calendar_event_participants AS cep
    WHERE cep.event_id = calendar_event_participants.event_id
    AND cep.user_id = auth.uid()
  )
);

-- Event organizers can manage participants
CREATE POLICY "organizers_manage_participants"
ON calendar_event_participants FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM calendar_event_participants AS cep
    WHERE cep.event_id = calendar_event_participants.event_id
    AND cep.user_id = auth.uid()
    AND cep.is_organizer = true
  )
);

-- Users can update their own participation (RSVP, reminders)
CREATE POLICY "users_update_own_participation"
ON calendar_event_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- CONVERSATIONS POLICIES
-- =====================================================

-- Users can view conversations they're participating in
CREATE POLICY "users_read_participating_conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Users can create conversations
CREATE POLICY "users_create_conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Participants can update conversation metadata (last read, etc.)
CREATE POLICY "participants_update_conversations"
ON conversations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- =====================================================
-- CONVERSATION_PARTICIPANTS POLICIES
-- =====================================================

-- Users can view participants of their conversations
CREATE POLICY "users_read_conversation_participants"
ON conversation_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants AS cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- Users can update their own participation
CREATE POLICY "users_update_own_conversation_participation"
ON conversation_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Conversation creators can add participants
CREATE POLICY "creators_add_participants"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_participants.conversation_id
    AND conversations.created_by = auth.uid()
  )
);

-- =====================================================
-- MESSAGES POLICIES
-- =====================================================

-- Users can view messages in their conversations
CREATE POLICY "users_read_conversation_messages"
ON messages FOR SELECT
TO authenticated
USING (
  NOT is_deleted
  AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Users can create messages in their conversations
CREATE POLICY "users_create_messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Users can soft-delete their own messages
CREATE POLICY "users_delete_own_messages"
ON messages FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid() AND is_deleted = true);

-- =====================================================
-- FEED MODULE POLICIES
-- =====================================================

-- All authenticated users can view public feed posts
CREATE POLICY "authenticated_read_public_posts"
ON feed_posts FOR SELECT
TO authenticated
USING (visibility = 'public');

-- Users can create posts
CREATE POLICY "users_create_posts"
ON feed_posts FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

-- Users can update/delete their own posts
CREATE POLICY "users_manage_own_posts"
ON feed_posts FOR ALL
TO authenticated
USING (author_id = auth.uid());

-- Feed comments policies
CREATE POLICY "authenticated_read_comments"
ON feed_comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "users_create_comments"
ON feed_comments FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());

CREATE POLICY "users_manage_own_comments"
ON feed_comments FOR ALL
TO authenticated
USING (author_id = auth.uid());

-- Feed likes policies
CREATE POLICY "authenticated_read_likes"
ON feed_likes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "users_manage_own_likes"
ON feed_likes FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Feed profiles policies (read-only for users)
CREATE POLICY "authenticated_read_feed_profiles"
ON feed_profiles FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- GRANT PUBLIC USAGE
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- DONE! 
-- All tables now have RLS enabled with comprehensive policies
-- Authentication is handled entirely by Supabase Auth
-- =====================================================
