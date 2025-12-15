-- Fix RLS permissions for server-side database access
-- The postgres role (used by DATABASE_URL) needs to bypass RLS or have explicit permissions

-- Add policy for postgres role to access profiles
CREATE POLICY "Postgres role can access all profiles"
  ON "profiles" FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);

-- Alternative: Disable RLS for specific operations (more permissive)
-- This is safe because server-side code validates JWT tokens before querying
-- GRANT ALL ON profiles TO postgres;

-- Or: Use this to bypass RLS for authenticated backend connections
ALTER TABLE "profiles" FORCE ROW LEVEL SECURITY;
