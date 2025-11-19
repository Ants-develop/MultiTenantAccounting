-- Fix add_user_role function to pass UUID correctly
CREATE OR REPLACE FUNCTION public.add_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can manage user roles';
  END IF;

  -- Insert role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create audit log (FIXED: removed ::TEXT cast)
  PERFORM create_audit_log(
    'ASSIGN_ROLE',
    'user',
    _user_id,
    (SELECT full_name FROM profiles WHERE id = _user_id),
    NULL,
    jsonb_build_object('role', _role::TEXT),
    'Assigned role ' || _role::TEXT || ' to user',
    jsonb_build_object('role', _role::TEXT)
  );
END;
$function$;

-- Fix remove_user_role function to pass UUID correctly
CREATE OR REPLACE FUNCTION public.remove_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Create audit log (FIXED: removed ::TEXT cast)
  PERFORM create_audit_log(
    'REMOVE_ROLE',
    'user',
    _user_id,
    (SELECT full_name FROM profiles WHERE id = _user_id),
    jsonb_build_object('role', _role::TEXT),
    NULL,
    'Removed role ' || _role::TEXT || ' from user',
    jsonb_build_object('role', _role::TEXT)
  );
END;
$function$;