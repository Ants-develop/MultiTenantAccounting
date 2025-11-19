-- Drop existing problematic policies
drop policy if exists "Staff can view clients they're assigned to" on public.clients;
drop policy if exists "Admins and managers can view all clients" on public.clients;
drop policy if exists "Staff can create clients" on public.clients;
drop policy if exists "Staff can update clients they're assigned to" on public.clients;

-- Create simplified policies without circular dependencies
create policy "Users can view clients they own or are assigned to"
  on public.clients
  for select
  using (
    public.has_role(auth.uid(), 'admin') 
    or public.has_role(auth.uid(), 'manager')
    or auth.uid() = assigned_owner_id 
    or auth.uid() = assigned_accountant_id 
    or auth.uid() = assigned_reviewer_id
  );

create policy "Staff can create clients"
  on public.clients
  for insert
  with check (
    not public.has_role(auth.uid(), 'client')
  );

create policy "Staff can update assigned clients"
  on public.clients
  for update
  using (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'manager')
    or auth.uid() = assigned_owner_id 
    or auth.uid() = assigned_accountant_id 
    or auth.uid() = assigned_reviewer_id
  );

create policy "Admins can delete clients"
  on public.clients
  for delete
  using (
    public.has_role(auth.uid(), 'admin')
  );