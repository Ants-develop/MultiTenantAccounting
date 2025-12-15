-- Fix schema mismatches to align with shared/schema.ts (Drizzle) and fix missing tables

-- 1. Fix clients table (Switch from UUID to SERIAL to match Drizzle schema)
DROP TABLE IF EXISTS public.clients CASCADE;

CREATE TABLE public.clients (
    id serial PRIMARY KEY,
    name text NOT NULL,
    code text NOT NULL UNIQUE,
    tenant_code text UNIQUE,
    address text,
    phone text,
    email text,
    tax_id text,
    fiscal_year_start integer DEFAULT 1,
    currency text DEFAULT 'GEL',
    is_active boolean DEFAULT true,
    manager text,
    accounting_software text,
    id_code text,
    verification_status text DEFAULT 'not_registered',
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- 2. Create users table (Required by Backend Auth, missing in unified schema)
CREATE TABLE IF NOT EXISTS public.users (
    id serial PRIMARY KEY,
    username text NOT NULL UNIQUE,
    email text NOT NULL UNIQUE,
    password text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    global_role text DEFAULT 'user',
    is_active boolean DEFAULT true,
    matrix_id text,
    created_at timestamp DEFAULT now()
);

-- 3. Create bank_accounts (Missing in unified schema)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id serial PRIMARY KEY,
    client_id integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    account_name text NOT NULL,
    account_number text,
    iban text,
    bank_name text,
    currency text DEFAULT 'USD' NOT NULL,
    opening_balance numeric(15, 2) DEFAULT 0,
    current_balance numeric(15, 2) DEFAULT 0,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- 4. Create email_templates (Missing in unified schema)
CREATE TABLE IF NOT EXISTS public.email_templates (
    id serial PRIMARY KEY,
    name text NOT NULL,
    subject text NOT NULL,
    body_html text,
    body_text text,
    variables jsonb,
    category text,
    is_active boolean DEFAULT true,
    created_by integer REFERENCES public.users(id),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- 5. Fix profiles.client_id type - REMOVED (Handled in later migration)
-- profiles table uses UUID for ID (linked to auth.users), but client_id should be integer to link to clients
-- ALTER TABLE public.profiles 
--    DROP COLUMN IF EXISTS client_id;

-- ALTER TABLE public.profiles 
--    ADD COLUMN client_id integer REFERENCES public.clients(id);

-- 6. Ensure Feed tables exist (reported as Error)
CREATE TABLE IF NOT EXISTS public.feed_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES public.feed_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_urls text[],
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feed_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.feed_profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.feed_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 7. Ensure Calendar Participants exists
CREATE TABLE IF NOT EXISTS public.calendar_event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- 8. Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

-- 9. Add basic policies
DO $$ BEGIN
    CREATE POLICY "Enable read access for authenticated users" ON public.clients FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Enable insert access for authenticated users" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "Enable update access for authenticated users" ON public.clients FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Enable read access for authenticated users" ON public.users FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Enable insert access for authenticated users" ON public.users FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "Enable update access for authenticated users" ON public.users FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Enable read access for authenticated users" ON public.bank_accounts FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Enable insert access for authenticated users" ON public.bank_accounts FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "Enable update access for authenticated users" ON public.bank_accounts FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Enable read access for authenticated users" ON public.email_templates FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Enable insert access for authenticated users" ON public.email_templates FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "Enable update access for authenticated users" ON public.email_templates FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 7. Create RS schema and users table
CREATE SCHEMA IF NOT EXISTS rs;

CREATE TABLE IF NOT EXISTS rs.users (
    id serial PRIMARY KEY,
    company_name text NOT NULL,
    s_user text NOT NULL,
    s_password text NOT NULL,
    s_password_hash text NOT NULL,
    main_user text,
    main_password text,
    main_password_hash text,
    user_id text,
    un_id text,
    client_id integer REFERENCES public.clients(id),
    company_tin text,
    created_by_user_id integer,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- 9. Create customers and vendors tables
CREATE TABLE IF NOT EXISTS public.customers (
    id serial PRIMARY KEY,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    tax_id text,
    client_id integer NOT NULL REFERENCES public.clients(id),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vendors (
    id serial PRIMARY KEY,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    tax_id text,
    client_id integer NOT NULL REFERENCES public.clients(id),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- 10. Create invoices and bills tables
CREATE TABLE IF NOT EXISTS public.invoices (
    id serial PRIMARY KEY,
    invoice_number text NOT NULL,
    customer_id integer NOT NULL REFERENCES public.customers(id),
    date date NOT NULL,
    due_date date NOT NULL,
    status text DEFAULT 'draft',
    total_amount numeric(15, 2) NOT NULL,
    currency text DEFAULT 'USD',
    notes text,
    user_id integer,
    client_id integer NOT NULL REFERENCES public.clients(id),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bills (
    id serial PRIMARY KEY,
    bill_number text NOT NULL,
    vendor_id integer NOT NULL REFERENCES public.vendors(id),
    date date NOT NULL,
    due_date date NOT NULL,
    status text DEFAULT 'draft',
    total_amount numeric(15, 2) NOT NULL,
    currency text DEFAULT 'USD',
    notes text,
    user_id integer,
    client_id integer NOT NULL REFERENCES public.clients(id),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);

-- 8. Create journal_entries table
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id serial PRIMARY KEY,
    date date NOT NULL,
    description text NOT NULL,
    reference text,
    status text DEFAULT 'draft',
    user_id integer,
    client_id integer NOT NULL REFERENCES public.clients(id),
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);
