-- Create storage bucket for client documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-documents',
  'client-documents',
  false,
  52428800, -- 50MB limit
  array['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']
);

-- Storage policies for client-documents bucket
create policy "Staff can view documents for their clients"
  on storage.objects
  for select
  using (
    bucket_id = 'client-documents'
    and exists (
      select 1 from public.documents d
      join public.clients c on d.client_id = c.id
      where d.file_path = storage.objects.name
      and (
        auth.uid() = c.assigned_owner_id 
        or auth.uid() = c.assigned_accountant_id 
        or auth.uid() = c.assigned_reviewer_id
        or public.has_role(auth.uid(), 'admin')
        or public.has_role(auth.uid(), 'manager')
      )
    )
  );

create policy "Staff can upload documents for their clients"
  on storage.objects
  for insert
  with check (
    bucket_id = 'client-documents'
    and not public.has_role(auth.uid(), 'client')
  );

create policy "Staff can update documents for their clients"
  on storage.objects
  for update
  using (
    bucket_id = 'client-documents'
    and exists (
      select 1 from public.documents d
      join public.clients c on d.client_id = c.id
      where d.file_path = storage.objects.name
      and (
        auth.uid() = c.assigned_owner_id 
        or auth.uid() = c.assigned_accountant_id 
        or public.has_role(auth.uid(), 'admin')
        or public.has_role(auth.uid(), 'manager')
      )
    )
  );

create policy "Staff can delete documents for their clients"
  on storage.objects
  for delete
  using (
    bucket_id = 'client-documents'
    and exists (
      select 1 from public.documents d
      join public.clients c on d.client_id = c.id
      where d.file_path = storage.objects.name
      and (
        auth.uid() = c.assigned_owner_id 
        or public.has_role(auth.uid(), 'admin')
      )
    )
  );