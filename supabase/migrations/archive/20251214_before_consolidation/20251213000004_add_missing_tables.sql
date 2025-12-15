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
