-- Create password_folders table
CREATE TABLE IF NOT EXISTS public.password_folders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id integer REFERENCES public.clients(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    parent_folder_id uuid REFERENCES public.password_folders(id) ON DELETE CASCADE,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_archived boolean DEFAULT false
);

-- Create passwords table
CREATE TABLE IF NOT EXISTS public.passwords (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id uuid REFERENCES public.password_folders(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    username text,
    password_encrypted text NOT NULL,
    url text,
    notes text,
    tags text[],
    expires_at timestamp with time zone,
    last_rotated_at timestamp with time zone,
    created_by uuid REFERENCES auth.users(id),
    updated_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_archived boolean DEFAULT false,
    strength_score integer
);

-- Enable RLS
ALTER TABLE public.password_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passwords ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow authenticated users to view folders (refine this later based on client_id)
CREATE POLICY "Enable read access for authenticated users" ON public.password_folders
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.password_folders
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.password_folders
    FOR UPDATE TO authenticated USING (true);

-- Allow authenticated users to view passwords
CREATE POLICY "Enable read access for authenticated users" ON public.passwords
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON public.passwords
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON public.passwords
    FOR UPDATE TO authenticated USING (true);
