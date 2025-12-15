-- Drop recursive policies on profiles table
DROP POLICY IF EXISTS "global_admins_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "global_admins_manage_profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_users_read_active_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;

-- Drop recursive policies on clients table
DROP POLICY IF EXISTS "global_admins_read_all_clients" ON public.clients;
DROP POLICY IF EXISTS "global_admins_manage_clients" ON public.clients;
DROP POLICY IF EXISTS "users_read_assigned_clients" ON public.clients;

-- Ensure we have the simple non-recursive policies from the previous migration
-- (Re-applying them just in case, using IF NOT EXISTS logic via DO block or just relying on the previous migration having created them if they didn't conflict)

-- We can just ensure the simple "viewable by everyone" policy exists and is the only one for SELECT
-- But first, let's make sure we don't have duplicates.
-- The previous migration created "Profiles are viewable by everyone".
-- We will keep that one as it is safe (USING true).

-- To be safe, let's recreate the simple policies to ensure a clean state
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- Fix Clients RLS as well to be safe
DROP POLICY IF EXISTS "Clients are viewable by authenticated users" ON public.clients;
CREATE POLICY "Clients are viewable by authenticated users" 
ON public.clients FOR SELECT 
TO authenticated 
USING (true);
