-- Drop the old check constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the updated check constraint with the correct notification types
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'task_assigned',
  'task_update', 
  'task_completed',
  'document_uploaded',
  'document_shared',
  'message_received',
  'client_assigned',
  'portal_invitation',
  'workflow_update',
  'system_alert'
));