-- Create workflow_template_type enum
create type public.workflow_template_type as enum ('tax_return', 'monthly_close', 'payroll', 'audit', 'bookkeeping', 'custom');

-- Create task_priority enum
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

-- Create task_status enum
create type public.task_status as enum ('todo', 'in_progress', 'review', 'completed', 'blocked');

-- Create workflow_templates table
create table public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type public.workflow_template_type not null,
  is_active boolean not null default true,
  estimated_duration_days integer,
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.workflow_templates enable row level security;

-- Create workflow_stages table
create table public.workflow_stages (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workflow_templates(id) on delete cascade,
  name text not null,
  description text,
  order_position integer not null,
  color text default '#6366f1',
  automation_rules jsonb default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.workflow_stages enable row level security;

-- Create workflows table (instances of templates)
create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workflow_templates(id),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  current_stage_id uuid references public.workflow_stages(id),
  started_at timestamp with time zone not null default now(),
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.workflows enable row level security;

-- Create tasks table
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.workflows(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.profiles(id),
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'todo',
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  is_recurring boolean not null default false,
  recurrence_pattern jsonb,
  dependencies uuid[],
  tags text[],
  created_by uuid not null references auth.users(id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint either_workflow_or_client check (workflow_id is not null or client_id is not null)
);

alter table public.tasks enable row level security;

-- Create task_templates table
create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workflow_templates(id) on delete cascade,
  stage_id uuid references public.workflow_stages(id) on delete cascade,
  title text not null,
  description text,
  priority public.task_priority not null default 'medium',
  estimated_hours integer,
  order_position integer not null,
  created_at timestamp with time zone not null default now()
);

alter table public.task_templates enable row level security;

-- Create checklists table
create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  is_completed boolean not null default false,
  order_position integer not null,
  completed_at timestamp with time zone,
  completed_by uuid references auth.users(id),
  created_at timestamp with time zone not null default now()
);

alter table public.checklists enable row level security;

-- Create task_comments table
create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  comment text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.task_comments enable row level security;

-- RLS Policies for workflow_templates
create policy "Staff can view all templates"
  on public.workflow_templates for select using (true);

create policy "Staff can create templates"
  on public.workflow_templates for insert
  with check (not public.has_role(auth.uid(), 'client'));

create policy "Staff can update templates"
  on public.workflow_templates for update
  using (not public.has_role(auth.uid(), 'client'));

-- RLS Policies for workflow_stages
create policy "Staff can view all stages"
  on public.workflow_stages for select using (true);

create policy "Staff can manage stages"
  on public.workflow_stages for all
  using (not public.has_role(auth.uid(), 'client'));

-- RLS Policies for workflows
create policy "Staff can view workflows for their clients"
  on public.workflows for select
  using (
    exists (
      select 1 from public.clients
      where id = client_id
      and (
        public.has_role(auth.uid(), 'admin')
        or public.has_role(auth.uid(), 'manager')
        or auth.uid() = assigned_owner_id
        or auth.uid() = assigned_accountant_id
        or auth.uid() = assigned_reviewer_id
      )
    )
  );

create policy "Staff can create workflows"
  on public.workflows for insert
  with check (not public.has_role(auth.uid(), 'client'));

create policy "Staff can update workflows for their clients"
  on public.workflows for update
  using (
    exists (
      select 1 from public.clients
      where id = client_id
      and (
        public.has_role(auth.uid(), 'admin')
        or public.has_role(auth.uid(), 'manager')
        or auth.uid() = assigned_owner_id
        or auth.uid() = assigned_accountant_id
      )
    )
  );

-- RLS Policies for tasks
create policy "Staff can view tasks for their clients"
  on public.tasks for select
  using (
    auth.uid() = assigned_to
    or public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'manager')
    or exists (
      select 1 from public.clients
      where id = client_id
      and (
        auth.uid() = assigned_owner_id
        or auth.uid() = assigned_accountant_id
        or auth.uid() = assigned_reviewer_id
      )
    )
  );

create policy "Staff can create tasks"
  on public.tasks for insert
  with check (not public.has_role(auth.uid(), 'client'));

create policy "Staff can update their assigned tasks"
  on public.tasks for update
  using (
    auth.uid() = assigned_to
    or public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'manager')
  );

-- RLS Policies for task_templates
create policy "Staff can view task templates"
  on public.task_templates for select using (true);

create policy "Staff can manage task templates"
  on public.task_templates for all
  using (not public.has_role(auth.uid(), 'client'));

-- RLS Policies for checklists
create policy "Staff can view checklists for accessible tasks"
  on public.checklists for select
  using (
    exists (
      select 1 from public.tasks
      where id = task_id
      and (
        auth.uid() = assigned_to
        or public.has_role(auth.uid(), 'admin')
        or public.has_role(auth.uid(), 'manager')
      )
    )
  );

create policy "Staff can manage checklists"
  on public.checklists for all
  using (
    exists (
      select 1 from public.tasks
      where id = task_id
      and (
        auth.uid() = assigned_to
        or public.has_role(auth.uid(), 'admin')
        or public.has_role(auth.uid(), 'manager')
      )
    )
  );

-- RLS Policies for task_comments
create policy "Staff can view comments on accessible tasks"
  on public.task_comments for select
  using (
    exists (
      select 1 from public.tasks
      where id = task_id
      and (
        auth.uid() = assigned_to
        or public.has_role(auth.uid(), 'admin')
        or public.has_role(auth.uid(), 'manager')
      )
    )
  );

create policy "Staff can add comments to accessible tasks"
  on public.task_comments for insert
  with check (
    exists (
      select 1 from public.tasks
      where id = task_id
      and (
        auth.uid() = assigned_to
        or public.has_role(auth.uid(), 'admin')
        or public.has_role(auth.uid(), 'manager')
      )
    )
  );

-- Add triggers for updated_at
create trigger update_workflow_templates_updated_at
  before update on public.workflow_templates
  for each row execute function public.update_updated_at_column();

create trigger update_workflow_stages_updated_at
  before update on public.workflow_stages
  for each row execute function public.update_updated_at_column();

create trigger update_workflows_updated_at
  before update on public.workflows
  for each row execute function public.update_updated_at_column();

create trigger update_tasks_updated_at
  before update on public.tasks
  for each row execute function public.update_updated_at_column();

create trigger update_task_comments_updated_at
  before update on public.task_comments
  for each row execute function public.update_updated_at_column();

-- Create indexes
create index idx_workflows_client on public.workflows(client_id);
create index idx_workflows_template on public.workflows(template_id);
create index idx_workflows_status on public.workflows(status);
create index idx_tasks_workflow on public.tasks(workflow_id);
create index idx_tasks_client on public.tasks(client_id);
create index idx_tasks_assigned_to on public.tasks(assigned_to);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_due_date on public.tasks(due_date);
create index idx_checklists_task on public.checklists(task_id);
create index idx_task_comments_task on public.task_comments(task_id);

-- Insert default workflow templates
insert into public.workflow_templates (name, description, type, created_by) values
  ('Monthly Bookkeeping', 'Standard monthly bookkeeping workflow', 'monthly_close', (select id from auth.users limit 1)),
  ('Tax Return - Individual', 'Individual tax return preparation', 'tax_return', (select id from auth.users limit 1)),
  ('Payroll Processing', 'Monthly payroll processing workflow', 'payroll', (select id from auth.users limit 1)),
  ('Year-End Close', 'Annual financial close process', 'monthly_close', (select id from auth.users limit 1));