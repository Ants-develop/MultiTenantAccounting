-- Fix audit_trigger_func to safely handle different table schemas
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action TEXT;
  _entity_name TEXT;
  _old_jsonb JSONB;
  _new_jsonb JSONB;
BEGIN
  -- Convert to JSONB first
  IF (TG_OP = 'DELETE') THEN
    _old_jsonb := to_jsonb(OLD);
  ELSE
    _new_jsonb := to_jsonb(NEW);
  END IF;
  
  -- Determine action
  IF (TG_OP = 'INSERT') THEN
    _action := 'CREATE';
    -- Try to extract entity name from common fields
    _entity_name := COALESCE(
      _new_jsonb->>'name',
      _new_jsonb->>'title',
      _new_jsonb->>'full_name',
      'New ' || TG_TABLE_NAME
    );
    
    PERFORM create_audit_log(
      _action,
      TG_TABLE_NAME,
      NEW.id,
      _entity_name,
      NULL,
      _new_jsonb,
      'Created new ' || TG_TABLE_NAME
    );
    RETURN NEW;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    _action := 'UPDATE';
    _old_jsonb := to_jsonb(OLD);
    _entity_name := COALESCE(
      _new_jsonb->>'name',
      _new_jsonb->>'title',
      _new_jsonb->>'full_name',
      _old_jsonb->>'name',
      _old_jsonb->>'title',
      'Updated ' || TG_TABLE_NAME
    );
    
    PERFORM create_audit_log(
      _action,
      TG_TABLE_NAME,
      NEW.id,
      _entity_name,
      _old_jsonb,
      _new_jsonb,
      'Updated ' || TG_TABLE_NAME
    );
    RETURN NEW;
    
  ELSIF (TG_OP = 'DELETE') THEN
    _action := 'DELETE';
    _entity_name := COALESCE(
      _old_jsonb->>'name',
      _old_jsonb->>'title',
      _old_jsonb->>'full_name',
      'Deleted ' || TG_TABLE_NAME
    );
    
    PERFORM create_audit_log(
      _action,
      TG_TABLE_NAME,
      OLD.id,
      _entity_name,
      _old_jsonb,
      NULL,
      'Deleted ' || TG_TABLE_NAME
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;