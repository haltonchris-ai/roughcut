-- Storage bucket for generated label art and fallback PDFs. Private; the
-- app signs/streams downloads server-side rather than exposing public URLs.
insert into storage.buckets (id, name, public)
values ('print-assets', 'print-assets', false)
on conflict (id) do nothing;

-- Path convention mirrors box-photos: first path segment is the company_id.
create policy print_assets_storage_select on storage.objects
  for select using (
    bucket_id = 'print-assets'
    and (
      public.is_platform_owner()
      or (storage.foldername(name))[1] = public.current_company_id()::text
    )
  );

-- No insert/update policy for authenticated roles: only the server (service
-- role, used by the print pipeline) writes these files.
