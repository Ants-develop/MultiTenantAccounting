-- =====================================================
-- CRM MODULE: Database Schema
-- =====================================================

-- 1. DEAL STAGES TABLE
-- =====================================================
CREATE TABLE public.deal_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  order_position INTEGER NOT NULL UNIQUE,
  is_closed BOOLEAN DEFAULT false,
  is_won BOOLEAN DEFAULT false,
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default stages
INSERT INTO public.deal_stages (name, description, color, order_position, is_closed, is_won, probability) VALUES
  ('Lead', 'Initial contact made', '#94a3b8', 1, false, false, 10),
  ('Qualified', 'Opportunity qualified', '#3b82f6', 2, false, false, 25),
  ('Proposal', 'Proposal sent', '#f59e0b', 3, false, false, 50),
  ('Negotiation', 'In negotiation', '#8b5cf6', 4, false, false, 75),
  ('Closed Won', 'Deal won', '#22c55e', 5, true, true, 100),
  ('Closed Lost', 'Deal lost', '#ef4444', 6, true, false, 0);

-- 2. DEALS TABLE
-- =====================================================
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  stage_id UUID NOT NULL REFERENCES deal_stages(id),
  deal_value DECIMAL(12, 2),
  currency TEXT DEFAULT 'USD',
  expected_close_date DATE,
  actual_close_date DATE,
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  
  -- Client relationship (NULL until deal is won)
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Contact information for deal (before client creation)
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  company_name TEXT,
  
  -- Deal ownership
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  
  -- Source tracking
  lead_source TEXT,
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'abandoned')),
  lost_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Indexes for performance
CREATE INDEX idx_deals_stage_id ON deals(stage_id);
CREATE INDEX idx_deals_owner_id ON deals(owner_id);
CREATE INDEX idx_deals_client_id ON deals(client_id);
CREATE INDEX idx_deals_status ON deals(status);

-- 3. DEAL ACTIVITIES TABLE
-- =====================================================
CREATE TABLE public.deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'call', 'email', 'meeting', 'stage_change', 'task')),
  subject TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- For stage changes
  old_stage_id UUID REFERENCES deal_stages(id),
  new_stage_id UUID REFERENCES deal_stages(id),
  
  -- User tracking
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deal_activities_deal_id ON deal_activities(deal_id);
CREATE INDEX idx_deal_activities_created_by ON deal_activities(created_by);

-- 4. DEAL CONTACTS TABLE
-- =====================================================
CREATE TABLE public.deal_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deal_contacts_deal_id ON deal_contacts(deal_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Deal Stages RLS
ALTER TABLE deal_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all deal stages"
ON deal_stages FOR SELECT
USING (NOT has_role(auth.uid(), 'client'::app_role));

CREATE POLICY "Admins can manage deal stages"
ON deal_stages FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Deals RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all deals"
ON deals FOR SELECT
USING (NOT has_role(auth.uid(), 'client'::app_role));

CREATE POLICY "Staff can create deals"
ON deals FOR INSERT
WITH CHECK (
  NOT has_role(auth.uid(), 'client'::app_role)
  AND auth.uid() = created_by
);

CREATE POLICY "Deal owners and admins can update deals"
ON deals FOR UPDATE
USING (
  auth.uid() = owner_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Admins can delete deals"
ON deals FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Deal Activities RLS
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view activities for their deals"
ON deal_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM deals
    WHERE deals.id = deal_activities.deal_id
    AND (deals.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
);

CREATE POLICY "Staff can create activities"
ON deal_activities FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM deals
    WHERE deals.id = deal_activities.deal_id
    AND (deals.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
);

-- Deal Contacts RLS
ALTER TABLE deal_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage contacts for their deals"
ON deal_contacts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM deals
    WHERE deals.id = deal_contacts.deal_id
    AND (deals.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
);

-- =====================================================
-- DATABASE FUNCTIONS & TRIGGERS
-- =====================================================

-- Function: Automatic Client Creation from Won Deal
CREATE OR REPLACE FUNCTION public.create_client_from_deal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_client_id UUID;
  primary_contact_id UUID;
BEGIN
  -- Only trigger when deal moves to "won" status
  IF NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status != 'won') AND NEW.client_id IS NULL THEN
    
    -- Create the client
    INSERT INTO clients (
      name,
      business_type,
      email,
      phone,
      status,
      assigned_owner_id,
      created_by,
      notes
    ) VALUES (
      COALESCE(NEW.company_name, NEW.contact_name),
      'individual',
      NEW.contact_email,
      NEW.contact_phone,
      'active',
      NEW.owner_id,
      NEW.owner_id,
      'Created automatically from deal: ' || NEW.name
    )
    RETURNING id INTO new_client_id;
    
    -- Create primary contact
    INSERT INTO client_contacts (
      client_id,
      name,
      email,
      phone,
      is_primary,
      role
    ) VALUES (
      new_client_id,
      NEW.contact_name,
      NEW.contact_email,
      NEW.contact_phone,
      true,
      'Primary Contact'
    )
    RETURNING id INTO primary_contact_id;
    
    -- Link deal to client
    NEW.client_id := new_client_id;
    NEW.actual_close_date := CURRENT_DATE;
    
    -- Create activity log
    INSERT INTO deal_activities (
      deal_id,
      activity_type,
      subject,
      description,
      created_by
    ) VALUES (
      NEW.id,
      'note',
      'Client Created',
      'Client "' || COALESCE(NEW.company_name, NEW.contact_name) || '" created automatically from won deal',
      NEW.owner_id
    );
    
    -- Send notification to deal owner
    PERFORM create_notification(
      NEW.owner_id,
      'deal_won',
      'Deal Won - Client Created',
      'Congratulations! Deal "' || NEW.name || '" has been won and client "' || COALESCE(NEW.company_name, NEW.contact_name) || '" has been created.',
      '/clients/' || new_client_id::text
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function: Log Stage Changes
CREATE OR REPLACE FUNCTION public.log_deal_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_stage_name TEXT;
  new_stage_name TEXT;
BEGIN
  -- Only log if stage actually changed
  IF NEW.stage_id != OLD.stage_id THEN
    
    -- Get stage names
    SELECT name INTO old_stage_name FROM deal_stages WHERE id = OLD.stage_id;
    SELECT name INTO new_stage_name FROM deal_stages WHERE id = NEW.stage_id;
    
    -- Create activity log
    INSERT INTO deal_activities (
      deal_id,
      activity_type,
      subject,
      description,
      old_stage_id,
      new_stage_id,
      created_by
    ) VALUES (
      NEW.id,
      'stage_change',
      'Stage Changed',
      'Deal moved from "' || old_stage_name || '" to "' || new_stage_name || '"',
      OLD.stage_id,
      NEW.stage_id,
      auth.uid()
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Triggers: Automatic Client Creation
CREATE TRIGGER trigger_create_client_from_deal
BEFORE UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION create_client_from_deal();

-- Triggers: Log Stage Changes
CREATE TRIGGER trigger_log_deal_stage_change
AFTER UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION log_deal_stage_change();

-- Triggers: Update Timestamps
CREATE TRIGGER update_deal_stages_updated_at
BEFORE UPDATE ON deal_stages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
BEFORE UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deal_activities_updated_at
BEFORE UPDATE ON deal_activities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();