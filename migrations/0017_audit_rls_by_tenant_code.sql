-- =====================================================
-- Audit Module RLS Update
-- Purpose: Make audit rows visible using tenant_code-based access
--
-- Background:
-- - Current audit RLS policies rely on audit.<table>.company_code (UUID FK to clients.id)
-- - One-to-one MSSQL imports do not populate company_code, so rows become invisible.
-- - This migration replaces the per-table SELECT policy to allow access by matching
--   audit.<table>.tenant_code to the tenant_code of a client the user can access.
-- =====================================================

-- UP
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'audit'
  ) LOOP
    EXECUTE format('ALTER TABLE audit.%I ENABLE ROW LEVEL SECURITY;', r.tablename);

    -- Replace the existing policy (same name used across all audit tables)
    EXECUTE format('DROP POLICY IF EXISTS "Users can view their own company audit data" ON audit.%I;', r.tablename);

    EXECUTE format($policy$
      CREATE POLICY "Users can view their own company audit data" ON audit.%I
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.user_companies uc
          JOIN public.clients c ON c.id = uc.client_id
          WHERE uc.user_id = auth.uid()
            AND uc.is_active = true
            AND c.tenant_code = audit.%I.tenant_code
        )
        OR
        EXISTS (
          SELECT 1
          FROM public.profiles p
          JOIN public.clients c ON c.id = p.client_id
          WHERE p.id = auth.uid()
            AND c.tenant_code = audit.%I.tenant_code
        )
        OR
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.global_role = 'admin'
        )
      );
    $policy$, r.tablename, r.tablename, r.tablename);
  END LOOP;
END $$;

-- DOWN
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'audit'
  ) LOOP
    EXECUTE format('ALTER TABLE audit.%I ENABLE ROW LEVEL SECURITY;', r.tablename);

    EXECUTE format('DROP POLICY IF EXISTS "Users can view their own company audit data" ON audit.%I;', r.tablename);

    -- Restore the original company_code-based policy.
    EXECUTE format($policy$
      CREATE POLICY "Users can view their own company audit data" ON audit.%I
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_companies
          WHERE user_companies.user_id = auth.uid()
            AND user_companies.client_id = audit.%I.company_code
            AND user_companies.is_active = true
        )
        OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.global_role = 'admin'
        )
      );
    $policy$, r.tablename, r.tablename);
  END LOOP;
END $$;
