-- Drop the old foreign key to auth.users
ALTER TABLE public.user_roles 
DROP CONSTRAINT user_roles_user_id_fkey;

-- Add new foreign key to profiles table
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;