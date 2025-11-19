-- Create junction table for many-to-many relationship between templates and clients
CREATE TABLE public.workflow_template_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.workflow_templates(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES public.profiles(id),
  UNIQUE(template_id, client_id)
);

-- Create indexes for performance
CREATE INDEX idx_workflow_template_clients_template ON workflow_template_clients(template_id);
CREATE INDEX idx_workflow_template_clients_client ON workflow_template_clients(client_id);

-- Enable RLS
ALTER TABLE workflow_template_clients ENABLE ROW LEVEL SECURITY;

-- Staff can view all template-client assignments
CREATE POLICY "Staff can view template client assignments"
  ON workflow_template_clients FOR SELECT
  USING (NOT has_role(auth.uid(), 'client'::app_role));

-- Admins and managers can manage template client assignments
CREATE POLICY "Admins can manage template client assignments"
  ON workflow_template_clients FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- Clients can view which templates are assigned to them
CREATE POLICY "Clients can view their assigned templates"
  ON workflow_template_clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.client_id = workflow_template_clients.client_id
      AND has_role(auth.uid(), 'client'::app_role)
    )
  );