-- Fix documents foreign key to reference profiles instead of auth.users
DO $$ 
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_uploaded_by_fkey') THEN
    ALTER TABLE public.documents DROP CONSTRAINT documents_uploaded_by_fkey;
  END IF;
  
  -- Add the new constraint referencing public.profiles
  ALTER TABLE public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey
    FOREIGN KEY (uploaded_by)
    REFERENCES public.profiles(id);
END $$;