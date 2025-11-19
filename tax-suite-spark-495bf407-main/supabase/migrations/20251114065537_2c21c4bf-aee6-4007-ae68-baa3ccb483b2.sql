-- Phase 3.1: Create user_invitations table
CREATE TABLE public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  job_title TEXT,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  initial_roles app_role[] NOT NULL,
  client_id UUID REFERENCES public.clients(id),
  invitation_token UUID UNIQUE DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',
  custom_message TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage invitations
CREATE POLICY "Admins can manage invitations"
ON public.user_invitations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create indexes for faster lookups
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_user_invitations_token ON public.user_invitations(invitation_token);
CREATE INDEX idx_user_invitations_status ON public.user_invitations(status);

-- Add trigger for updated_at
CREATE TRIGGER update_user_invitations_updated_at
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 3.2: Add user status fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES auth.users(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Phase 3.3: Function to get user with roles
CREATE OR REPLACE FUNCTION public.get_user_with_roles(user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  job_title TEXT,
  client_id UUID,
  is_active BOOLEAN,
  last_login_at TIMESTAMPTZ,
  roles TEXT[]
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    u.email,
    p.full_name,
    p.avatar_url,
    p.job_title,
    p.client_id,
    p.is_active,
    p.last_login_at,
    ARRAY_AGG(ur.role::TEXT) as roles
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = get_user_with_roles.user_id
  GROUP BY p.id, u.email, p.full_name, p.avatar_url, p.job_title, p.client_id, p.is_active, p.last_login_at;
$$;

-- Phase 3.4: Function to add role to user
CREATE OR REPLACE FUNCTION public.add_user_role(
  _user_id UUID,
  _role app_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can manage user roles';
  END IF;

  -- Insert role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create audit log
  PERFORM create_audit_log(
    'ASSIGN_ROLE',
    'user',
    _user_id::TEXT,
    (SELECT full_name FROM profiles WHERE id = _user_id),
    NULL,
    jsonb_build_object('role', _role::TEXT),
    'Assigned role ' || _role::TEXT || ' to user',
    jsonb_build_object('role', _role::TEXT)
  );
END;
$$;

-- Phase 3.5: Function to remove role from user
CREATE OR REPLACE FUNCTION public.remove_user_role(
  _user_id UUID,
  _role app_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_roles_count INT;
  admin_count INT;
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can manage user roles';
  END IF;

  -- Check if this is the last admin
  IF _role = 'admin' THEN
    SELECT COUNT(*) INTO admin_count
    FROM public.user_roles
    WHERE role = 'admin';
    
    IF admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last admin role';
    END IF;
  END IF;

  -- Delete the role
  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = _role;
  
  -- Check if user still has at least one role
  SELECT COUNT(*) INTO remaining_roles_count
  FROM public.user_roles
  WHERE user_id = _user_id;
  
  IF remaining_roles_count = 0 THEN
    RAISE EXCEPTION 'User must have at least one role';
  END IF;
  
  -- Create audit log
  PERFORM create_audit_log(
    'REMOVE_ROLE',
    'user',
    _user_id::TEXT,
    (SELECT full_name FROM profiles WHERE id = _user_id),
    jsonb_build_object('role', _role::TEXT),
    NULL,
    'Removed role ' || _role::TEXT || ' from user',
    jsonb_build_object('role', _role::TEXT)
  );
END;
$$;