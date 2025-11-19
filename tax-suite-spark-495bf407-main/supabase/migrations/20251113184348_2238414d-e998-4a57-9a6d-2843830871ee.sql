-- Create document_categories table
create table public.document_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  color text default '#6366f1',
  icon text,
  created_at timestamp with time zone not null default now()
);

-- Enable RLS on document_categories
alter table public.document_categories enable row level security;

-- Create documents table
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  description text,
  category_id uuid references public.document_categories(id),
  file_path text not null,
  file_size bigint,
  mime_type text,
  version integer not null default 1,
  parent_document_id uuid references public.documents(id),
  uploaded_by uuid not null references auth.users(id),
  uploaded_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone,
  status text not null default 'active' check (status in ('active', 'archived', 'expired')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable RLS on documents
alter table public.documents enable row level security;

-- Create document_access_log table
create table public.document_access_log (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  action text not null check (action in ('view', 'download', 'upload', 'delete', 'share')),
  ip_address text,
  user_agent text,
  accessed_at timestamp with time zone not null default now()
);

-- Enable RLS on document_access_log
alter table public.document_access_log enable row level security;

-- RLS Policies for document_categories
create policy "Everyone can view categories"
  on public.document_categories
  for select
  using (true);

create policy "Admins can manage categories"
  on public.document_categories
  for all
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for documents
create policy "Staff can view documents for their clients"
  on public.documents
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

create policy "Staff can upload documents for their clients"
  on public.documents
  for insert
  with check (
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

create policy "Staff can update documents for their clients"
  on public.documents
  for update
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

create policy "Staff can delete documents for their clients"
  on public.documents
  for delete
  using (
    exists (
      select 1 from public.clients
      where id = client_id
      and (
        auth.uid() = assigned_owner_id 
        or public.has_role(auth.uid(), 'admin')
      )
    )
  );

-- RLS Policies for document_access_log
create policy "Users can view their own access logs"
  on public.document_access_log
  for select
  using (auth.uid() = user_id);

create policy "Admins can view all access logs"
  on public.document_access_log
  for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "System can insert access logs"
  on public.document_access_log
  for insert
  with check (true);

-- Add trigger for updated_at on documents
create trigger update_documents_updated_at
  before update on public.documents
  for each row
  execute function public.update_updated_at_column();

-- Function to check for expired documents
create or replace function public.check_expired_documents()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.documents
  set status = 'expired'
  where expires_at < now()
  and status = 'active';
end;
$$;

-- Create indexes for better query performance
create index idx_documents_client on public.documents(client_id);
create index idx_documents_category on public.documents(category_id);
create index idx_documents_status on public.documents(status);
create index idx_documents_expires_at on public.documents(expires_at);
create index idx_documents_parent on public.documents(parent_document_id);
create index idx_document_access_log_document on public.document_access_log(document_id);
create index idx_document_access_log_user on public.document_access_log(user_id);

-- Insert default document categories
insert into public.document_categories (name, description, color, icon) values
  ('Tax Documents', 'Tax returns, forms, and related documents', '#ef4444', 'FileText'),
  ('Financial Statements', 'Balance sheets, income statements, cash flow', '#3b82f6', 'TrendingUp'),
  ('Payroll', 'Payroll records, timesheets, and reports', '#10b981', 'Users'),
  ('Legal', 'Contracts, agreements, and legal documents', '#8b5cf6', 'Scale'),
  ('Accounting', 'General ledger, journals, and accounting records', '#f59e0b', 'Calculator'),
  ('Bank Statements', 'Bank statements and reconciliations', '#06b6d4', 'Building2'),
  ('Receipts', 'Expense receipts and invoices', '#ec4899', 'Receipt'),
  ('Other', 'Miscellaneous documents', '#6b7280', 'File');