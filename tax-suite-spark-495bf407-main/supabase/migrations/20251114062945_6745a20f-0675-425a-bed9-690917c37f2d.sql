-- PHASE 1: Comprehensive Audit Logging System

-- Create audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  
  -- Action details
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  
  -- Change details
  old_values JSONB,
  new_values JSONB,
  changes_summary TEXT,
  
  -- Request metadata
  ip_address TEXT,
  user_agent TEXT,
  request_path TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_composite ON public.audit_logs(entity_type, entity_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Helper function for creating audit logs
CREATE OR REPLACE FUNCTION public.create_audit_log(
  _action TEXT,
  _entity_type TEXT,
  _entity_id UUID,
  _entity_name TEXT DEFAULT NULL,
  _old_values JSONB DEFAULT NULL,
  _new_values JSONB DEFAULT NULL,
  _changes_summary TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id UUID;
  _user_email TEXT;
  _user_name TEXT;
BEGIN
  -- Get user details
  SELECT u.email, p.full_name 
  INTO _user_email, _user_name
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = auth.uid();
  
  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    user_email,
    user_name,
    action,
    entity_type,
    entity_id,
    entity_name,
    old_values,
    new_values,
    changes_summary,
    metadata
  ) VALUES (
    auth.uid(),
    _user_email,
    _user_name,
    _action,
    _entity_type,
    _entity_id,
    _entity_name,
    _old_values,
    _new_values,
    _changes_summary,
    _metadata
  )
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action TEXT;
  _entity_name TEXT;
BEGIN
  -- Determine action
  IF (TG_OP = 'INSERT') THEN
    _action := 'CREATE';
    PERFORM create_audit_log(
      _action,
      TG_TABLE_NAME,
      NEW.id,
      COALESCE(NEW.name, NEW.title, 'New ' || TG_TABLE_NAME),
      NULL,
      to_jsonb(NEW),
      'Created new ' || TG_TABLE_NAME
    );
    RETURN NEW;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    _action := 'UPDATE';
    PERFORM create_audit_log(
      _action,
      TG_TABLE_NAME,
      NEW.id,
      COALESCE(NEW.name, NEW.title, OLD.name, OLD.title),
      to_jsonb(OLD),
      to_jsonb(NEW),
      'Updated ' || TG_TABLE_NAME
    );
    RETURN NEW;
    
  ELSIF (TG_OP = 'DELETE') THEN
    _action := 'DELETE';
    PERFORM create_audit_log(
      _action,
      TG_TABLE_NAME,
      OLD.id,
      COALESCE(OLD.name, OLD.title),
      to_jsonb(OLD),
      NULL,
      'Deleted ' || TG_TABLE_NAME
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Apply triggers to key tables
CREATE TRIGGER audit_clients_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_tasks_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_documents_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.documents
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_workflows_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.workflows
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_messages_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.messages
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Assign admin role to dima@ants.ge
INSERT INTO public.user_roles (user_id, role)
VALUES ('58c0955a-72e1-4f6d-b1f6-3dc42c2ab82d', 'admin')
ON CONFLICT DO NOTHING;