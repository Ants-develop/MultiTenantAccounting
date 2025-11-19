-- Add portal fields to clients table
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS portal_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_access_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS portal_invitation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_invitation_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_portal_login timestamptz;

-- Add client_id to profiles table to link users to clients
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_client_id ON public.profiles(client_id);

-- Add 'client' role to app_role enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'accountant', 'reviewer', 'client');
  ELSE
    -- Add client role if it doesn't exist
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Client-specific RLS policies for clients table
CREATE POLICY "Clients can view their own client record"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_id = clients.id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  );

CREATE POLICY "Clients can update their own communication preferences"
  ON public.clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_id = clients.id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_id = clients.id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  );

-- Client-specific RLS policies for documents
CREATE POLICY "Clients can view their own documents"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_id = documents.client_id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  );

CREATE POLICY "Clients can upload documents to their own account"
  ON public.documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_id = documents.client_id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  );

-- Client-specific RLS policies for tasks
CREATE POLICY "Clients can view their own tasks"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_id = tasks.client_id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  );

CREATE POLICY "Clients can update checklist items on their tasks"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_id = tasks.client_id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  );

-- Client-specific RLS policies for checklists
CREATE POLICY "Clients can view checklists for their tasks"
  ON public.checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      JOIN public.profiles ON profiles.id = auth.uid()
      WHERE tasks.id = checklists.task_id
      AND profiles.client_id = tasks.client_id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  );

CREATE POLICY "Clients can update checklists for their tasks"
  ON public.checklists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      JOIN public.profiles ON profiles.id = auth.uid()
      WHERE tasks.id = checklists.task_id
      AND profiles.client_id = tasks.client_id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  );

-- Client-specific RLS policies for conversations
CREATE POLICY "Clients can view their own conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_id = conversations.client_id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  );

-- Client-specific RLS policies for conversation_participants
CREATE POLICY "Clients can view participants in their conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      JOIN public.profiles ON profiles.id = auth.uid()
      WHERE conversations.id = conversation_participants.conversation_id
      AND profiles.client_id = conversations.client_id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  );

-- Client-specific RLS policies for messages
CREATE POLICY "Clients can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      JOIN public.profiles ON profiles.id = auth.uid()
      WHERE conversations.id = messages.conversation_id
      AND profiles.client_id = conversations.client_id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  );

CREATE POLICY "Clients can send messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      JOIN public.profiles ON profiles.id = auth.uid()
      WHERE conversations.id = messages.conversation_id
      AND profiles.client_id = conversations.client_id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  );

-- Client-specific RLS policies for client_contacts
CREATE POLICY "Clients can view their own contacts"
  ON public.client_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_id = client_contacts.client_id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  );

CREATE POLICY "Clients can update their own contacts"
  ON public.client_contacts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_id = client_contacts.client_id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  );

-- Function to validate invitation token
CREATE OR REPLACE FUNCTION public.validate_portal_invitation(token uuid)
RETURNS TABLE(client_id uuid, client_name text, is_valid boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id as client_id,
    name as client_name,
    (
      portal_access_token = token 
      AND portal_enabled = true
      AND portal_invitation_accepted_at IS NULL
      AND portal_invitation_sent_at > now() - interval '7 days'
    ) as is_valid
  FROM public.clients
  WHERE portal_access_token = token;
$$;