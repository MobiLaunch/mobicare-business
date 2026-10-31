-- Public bucket for website images and videos uploaded from the POS Design studio.
-- Anyone can view the files (the storefront shows them); only the shop owner (a user with a profile) can add or change them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 52428800,
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','image/avif','video/mp4','video/webm'])
on conflict (id) do nothing;

create policy site_media_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media' and exists (select 1 from public.profiles p where p.id = auth.uid()));
create policy site_media_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'site-media' and exists (select 1 from public.profiles p where p.id = auth.uid()))
  with check (bucket_id = 'site-media' and exists (select 1 from public.profiles p where p.id = auth.uid()));
