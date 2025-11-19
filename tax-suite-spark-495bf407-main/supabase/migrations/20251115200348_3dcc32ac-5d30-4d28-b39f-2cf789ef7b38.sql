-- Create security definer function to check conversation ownership
CREATE OR REPLACE FUNCTION public.is_conversation_creator(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = _conversation_id AND created_by = _user_id
  )
$$;

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can add participants to their conversations" 
ON public.conversation_participants;

-- Create new policy using the security definer function
CREATE POLICY "Users can add participants to their conversations"
ON public.conversation_participants
FOR INSERT
WITH CHECK (
  public.is_conversation_creator(conversation_id, auth.uid()) 
  OR public.has_role(auth.uid(), 'admin'::app_role) 
  OR public.has_role(auth.uid(), 'manager'::app_role)
);