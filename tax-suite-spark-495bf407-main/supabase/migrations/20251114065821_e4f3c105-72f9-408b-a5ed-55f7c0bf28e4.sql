-- Add email column to profiles for easier querying
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index on email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Create function to sync email from auth.users to profiles
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update profile with email from auth.users
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created_sync_email ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_email
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_email();

-- Backfill existing emails (one-time operation)
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id, email FROM auth.users
  LOOP
    UPDATE public.profiles 
    SET email = user_record.email 
    WHERE id = user_record.id;
  END LOOP;
END $$;