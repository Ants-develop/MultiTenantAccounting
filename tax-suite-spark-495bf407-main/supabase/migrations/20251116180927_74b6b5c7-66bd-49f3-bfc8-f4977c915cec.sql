-- Create security definer function for client participant access
CREATE OR REPLACE FUNCTION public.can_client_view_conversation_participants(
  _conversation_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.profiles p ON p.id = _user_id
    WHERE c.id = _conversation_id
      AND p.client_id = c.client_id
      AND public.has_role(_user_id, 'client'::app_role)
  )
$$;

-- Drop the problematic client policy
DROP POLICY IF EXISTS "Clients can view participants in their conversations" ON public.conversation_participants;

-- Create new policy using the security definer function
CREATE POLICY "Clients can view participants in their conversations"
ON public.conversation_participants
FOR SELECT
USING (
  public.can_client_view_conversation_participants(conversation_id, auth.uid())
);