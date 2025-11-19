-- Function to create a notification for a user
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _type TEXT,
  _title TEXT,
  _message TEXT,
  _link TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    is_read,
    created_at
  ) VALUES (
    _user_id,
    _type,
    _title,
    _message,
    _link,
    false,
    now()
  )
  RETURNING id INTO _notification_id;
  
  RETURN _notification_id;
END;
$$;

-- Function to get users who should be notified about an entity
CREATE OR REPLACE FUNCTION public.get_notification_recipients(
  _entity_type TEXT,
  _entity_id UUID,
  _action TEXT
)
RETURNS TABLE(user_id UUID, notification_type TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For tasks: notify assigned user and client users
  IF _entity_type = 'tasks' THEN
    RETURN QUERY
    SELECT t.assigned_to, 'task_assigned'::TEXT
    FROM tasks t
    WHERE t.id = _entity_id AND t.assigned_to IS NOT NULL
    UNION
    SELECT p.id, 'task_update'::TEXT
    FROM tasks t
    JOIN profiles p ON p.client_id = t.client_id
    WHERE t.id = _entity_id AND t.client_id IS NOT NULL;
    
  -- For documents: notify client users and assigned staff
  ELSIF _entity_type = 'documents' THEN
    RETURN QUERY
    SELECT p.id, 'document_uploaded'::TEXT
    FROM documents d
    JOIN profiles p ON p.client_id = d.client_id
    WHERE d.id = _entity_id
    UNION
    SELECT c.assigned_owner_id, 'document_uploaded'::TEXT
    FROM documents d
    JOIN clients c ON c.id = d.client_id
    WHERE d.id = _entity_id AND c.assigned_owner_id IS NOT NULL
    UNION
    SELECT c.assigned_accountant_id, 'document_uploaded'::TEXT
    FROM documents d
    JOIN clients c ON c.id = d.client_id
    WHERE d.id = _entity_id AND c.assigned_accountant_id IS NOT NULL;
    
  -- For messages: notify conversation participants except sender
  ELSIF _entity_type = 'messages' THEN
    RETURN QUERY
    SELECT cp.user_id, 'message_received'::TEXT
    FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = _entity_id AND cp.user_id != m.sender_id;
    
  -- For clients: notify assigned staff
  ELSIF _entity_type = 'clients' THEN
    RETURN QUERY
    SELECT c.assigned_owner_id, 'client_assigned'::TEXT
    FROM clients c
    WHERE c.id = _entity_id AND c.assigned_owner_id IS NOT NULL
    UNION
    SELECT c.assigned_accountant_id, 'client_assigned'::TEXT
    FROM clients c
    WHERE c.id = _entity_id AND c.assigned_accountant_id IS NOT NULL
    UNION
    SELECT c.assigned_reviewer_id, 'client_assigned'::TEXT
    FROM clients c
    WHERE c.id = _entity_id AND c.assigned_reviewer_id IS NOT NULL;
  END IF;
END;
$$;

-- Trigger function to create notifications from audit logs
CREATE OR REPLACE FUNCTION public.create_notifications_from_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recipient RECORD;
  _notification_title TEXT;
  _notification_message TEXT;
  _notification_link TEXT;
BEGIN
  -- Determine if this audit action should create notifications
  -- Only create notifications for specific actions
  IF NEW.action IN ('CREATE', 'UPDATE', 'ASSIGN', 'UPLOAD', 'INVITE', 'COMPLETE') THEN
    
    -- Build notification title and message based on action and entity type
    IF NEW.action = 'CREATE' AND NEW.entity_type = 'tasks' THEN
      _notification_title := 'New Task Created';
      _notification_message := 'A new task "' || COALESCE(NEW.entity_name, 'Untitled') || '" has been created';
      _notification_link := '/tasks';
      
    ELSIF NEW.action = 'ASSIGN' AND NEW.entity_type = 'tasks' THEN
      _notification_title := 'Task Assigned';
      _notification_message := 'You have been assigned to task "' || COALESCE(NEW.entity_name, 'Untitled') || '"';
      _notification_link := '/tasks';
      
    ELSIF NEW.action = 'UPLOAD' AND NEW.entity_type = 'documents' THEN
      _notification_title := 'New Document Uploaded';
      _notification_message := 'A new document "' || COALESCE(NEW.entity_name, 'Untitled') || '" has been uploaded';
      _notification_link := '/documents';
      
    ELSIF NEW.action = 'CREATE' AND NEW.entity_type = 'messages' THEN
      _notification_title := 'New Message';
      _notification_message := NEW.user_name || ' sent you a message';
      _notification_link := '/messages';
      
    ELSIF NEW.action = 'INVITE' AND NEW.entity_type = 'client' THEN
      _notification_title := 'Portal Invitation Sent';
      _notification_message := 'Portal invitation sent to ' || COALESCE(NEW.entity_name, 'client');
      _notification_link := '/clients';
      
    ELSIF NEW.action = 'COMPLETE' AND NEW.entity_type = 'tasks' THEN
      _notification_title := 'Task Completed';
      _notification_message := 'Task "' || COALESCE(NEW.entity_name, 'Untitled') || '" has been completed';
      _notification_link := '/tasks';
      
    ELSE
      -- For other actions, skip notification creation
      RETURN NEW;
    END IF;
    
    -- Get recipients and create notifications
    FOR _recipient IN 
      SELECT * FROM get_notification_recipients(NEW.entity_type, NEW.entity_id::UUID, NEW.action)
    LOOP
      -- Don't notify the user who performed the action
      IF _recipient.user_id != NEW.user_id THEN
        PERFORM create_notification(
          _recipient.user_id,
          _recipient.notification_type,
          _notification_title,
          _notification_message,
          _notification_link
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on audit_logs table
DROP TRIGGER IF EXISTS audit_to_notifications_trigger ON public.audit_logs;
CREATE TRIGGER audit_to_notifications_trigger
  AFTER INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION create_notifications_from_audit();