-- Enable real-time for CRM tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_stages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_contacts;