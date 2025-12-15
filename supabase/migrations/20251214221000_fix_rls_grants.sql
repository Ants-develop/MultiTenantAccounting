-- =====================================================
-- FIX RLS POLICIES AND GRANTS FOR DIRECT CLIENT QUERIES
-- Add missing grants for tables accessed via Supabase client
-- =====================================================

-- Grant SELECT on deal_stages to authenticated users (already has policy, needs grant)
GRANT SELECT ON public.deal_stages TO authenticated;
GRANT SELECT ON public.deal_stages TO anon;

-- Ensure profiles table has proper grants for first_name, last_name columns
-- (These columns exist in schema but might not have proper grants)
GRANT SELECT ON public.profiles TO authenticated;

-- Grant on deals (already granted in previous migration but ensure it's there)
GRANT SELECT ON public.deals TO authenticated;

-- Ensure service_role can bypass RLS
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.deals TO service_role;
GRANT ALL ON public.deal_stages TO service_role;

COMMENT ON TABLE public.deal_stages IS 'Pipeline stages for deals - read-only for all authenticated users';
