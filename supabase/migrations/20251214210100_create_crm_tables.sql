-- =====================================================
-- CREATE CRM MODULE TABLES
-- Deals, Deal Stages, Deal Activities, Deal Contacts
-- =====================================================

-- Deal Stages (pipeline stages)
CREATE TABLE IF NOT EXISTS public.deal_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  probability INTEGER DEFAULT 0, -- 0-100
  color TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Deals (sales opportunities)
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.deal_stages(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  value DECIMAL(12, 2),
  currency TEXT DEFAULT 'GEL',
  expected_close_date TIMESTAMP,
  actual_close_date TIMESTAMP,
  status TEXT DEFAULT 'open', -- 'open', 'won', 'lost'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  description TEXT,
  metadata JSONB,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Deal Activities (calls, meetings, notes)
CREATE TABLE IF NOT EXISTS public.deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'note', 'call', 'email', 'meeting'
  subject TEXT,
  description TEXT,
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Deal Contacts (link contacts to deals)
CREATE TABLE IF NOT EXISTS public.deal_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.client_contacts(id) ON DELETE CASCADE,
  role TEXT, -- 'decision_maker', 'influencer', 'user'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deals_client_id ON public.deals(client_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON public.deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner_id ON public.deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON public.deals(status);
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal_id ON public.deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_contacts_deal_id ON public.deal_contacts(deal_id);

-- Insert default deal stages
INSERT INTO public.deal_stages (name, "order", probability, color) VALUES
  ('Lead', 1, 10, '#94a3b8'),
  ('Qualified', 2, 25, '#3b82f6'),
  ('Proposal', 3, 50, '#8b5cf6'),
  ('Negotiation', 4, 75, '#f59e0b'),
  ('Closed Won', 5, 100, '#10b981'),
  ('Closed Lost', 6, 0, '#ef4444')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.deal_stages IS 'CRM pipeline stages for deals';
COMMENT ON TABLE public.deals IS 'Sales opportunities and deals';
COMMENT ON TABLE public.deal_activities IS 'Activities related to deals';
COMMENT ON TABLE public.deal_contacts IS 'Contact persons associated with deals';
