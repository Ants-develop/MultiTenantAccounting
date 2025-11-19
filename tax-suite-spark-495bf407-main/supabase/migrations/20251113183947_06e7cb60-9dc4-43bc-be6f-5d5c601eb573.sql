-- Create business_type enum
create type public.business_type as enum ('individual', 'sole_proprietor', 'partnership', 'llc', 's_corp', 'c_corp', 'nonprofit');

-- Create client_status enum
create type public.client_status as enum ('active', 'inactive', 'archived');

-- Create clients table
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type public.business_type not null default 'individual',
  tax_id text,
  industry text,
  email text,
  phone text,
  address jsonb default '{}'::jsonb,
  status public.client_status not null default 'active',
  communication_preferences jsonb default '{}'::jsonb,
  assigned_owner_id uuid references public.profiles(id),
  assigned_accountant_id uuid references public.profiles(id),
  assigned_reviewer_id uuid references public.profiles(id),
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid references auth.users(id)
);

-- Enable RLS on clients
alter table public.clients enable row level security;

-- Create client_contacts table
create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role text,
  is_primary boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable RLS on client_contacts
alter table public.client_contacts enable row level security;

-- Create client_team_assignments table (many-to-many)
create table public.client_team_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_type text not null,
  assigned_at timestamp with time zone not null default now(),
  unique(client_id, user_id, role_type)
);

-- Enable RLS on client_team_assignments
alter table public.client_team_assignments enable row level security;

-- RLS Policies for clients table
create policy "Staff can view clients they're assigned to"
  on public.clients
  for select
  using (
    auth.uid() = assigned_owner_id 
    or auth.uid() = assigned_accountant_id 
    or auth.uid() = assigned_reviewer_id
    or exists (
      select 1 from public.client_team_assignments
      where client_id = id and user_id = auth.uid()
    )
  );

create policy "Admins and managers can view all clients"
  on public.clients
  for select
  using (
    public.has_role(auth.uid(), 'admin') 
    or public.has_role(auth.uid(), 'manager')
  );

create policy "Staff can create clients"
  on public.clients
  for insert
  with check (
    not public.has_role(auth.uid(), 'client')
  );

create policy "Staff can update clients they're assigned to"
  on public.clients
  for update
  using (
    auth.uid() = assigned_owner_id 
    or auth.uid() = assigned_accountant_id 
    or auth.uid() = assigned_reviewer_id
    or public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'manager')
  );

-- RLS Policies for client_contacts table
create policy "Staff can view contacts for their clients"
  on public.client_contacts
  for select
  using (
    exists (
      select 1 from public.clients
      where id = client_id
      and (
        auth.uid() = assigned_owner_id 
        or auth.uid() = assigned_accountant_id 
        or auth.uid() = assigned_reviewer_id
        or public.has_role(auth.uid(), 'admin')
        or public.has_role(auth.uid(), 'manager')
      )
    )
  );

create policy "Staff can manage contacts for their clients"
  on public.client_contacts
  for all
  using (
    exists (
      select 1 from public.clients
      where id = client_id
      and (
        auth.uid() = assigned_owner_id 
        or auth.uid() = assigned_accountant_id 
        or public.has_role(auth.uid(), 'admin')
        or public.has_role(auth.uid(), 'manager')
      )
    )
  );

-- RLS Policies for client_team_assignments
create policy "Staff can view team assignments for their clients"
  on public.client_team_assignments
  for select
  using (
    exists (
      select 1 from public.clients
      where id = client_id
      and (
        auth.uid() = assigned_owner_id 
        or auth.uid() = assigned_accountant_id 
        or auth.uid() = assigned_reviewer_id
        or public.has_role(auth.uid(), 'admin')
        or public.has_role(auth.uid(), 'manager')
      )
    )
  );

create policy "Admins can manage team assignments"
  on public.client_team_assignments
  for all
  using (
    public.has_role(auth.uid(), 'admin') 
    or public.has_role(auth.uid(), 'manager')
  );

-- Add trigger for updated_at on clients
create trigger update_clients_updated_at
  before update on public.clients
  for each row
  execute function public.update_updated_at_column();

-- Add trigger for updated_at on client_contacts
create trigger update_client_contacts_updated_at
  before update on public.client_contacts
  for each row
  execute function public.update_updated_at_column();

-- Create indexes for better query performance
create index idx_clients_owner on public.clients(assigned_owner_id);
create index idx_clients_accountant on public.clients(assigned_accountant_id);
create index idx_clients_status on public.clients(status);
create index idx_client_contacts_client on public.client_contacts(client_id);
create index idx_client_team_assignments_client on public.client_team_assignments(client_id);
create index idx_client_team_assignments_user on public.client_team_assignments(user_id);