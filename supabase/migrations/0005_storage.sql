-- Storage bucket for box photos, stored at {company_id}/{box_id}.jpg
insert into storage.buckets (id, name, public)
values ('box-photos', 'box-photos', false)
on conflict (id) do nothing;

-- Path convention: the first path segment is the company_id, so RLS can
-- scope access the same way it scopes every other table.
create policy box_photos_select on storage.objects
  for select using (
    bucket_id = 'box-photos'
    and (
      public.is_platform_owner()
      or (storage.foldername(name))[1] = public.current_company_id()::text
    )
  );

create policy box_photos_insert on storage.objects
  for insert with check (
    bucket_id = 'box-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_role() in ('company_admin', 'foreman', 'installer')
  );

create policy box_photos_update on storage.objects
  for update using (
    bucket_id = 'box-photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );
