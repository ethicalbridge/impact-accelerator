-- Structured profile: experience and education as entries (title, organisation, country, years),
-- and a profile photo stored in Supabase Storage.
alter table public.profiles
  add column photo_url text not null default '',
  add column experience_items jsonb not null default '[]'::jsonb,
  add column education_items jsonb not null default '[]'::jsonb;

-- Arrays only, at most 30 entries each, and each entry small.
alter table public.profiles
  add constraint profiles_experience_items_shape check (jsonb_typeof(experience_items) = 'array' and jsonb_array_length(experience_items) <= 30 and length(experience_items::text) <= 20000),
  add constraint profiles_education_items_shape check (jsonb_typeof(education_items) = 'array' and jsonb_array_length(education_items) <= 30 and length(education_items::text) <= 20000),
  -- The photo must be the person's own upload in the avatars bucket: no outside image links (no tracking pixels).
  add constraint profiles_photo_url_own check (
    photo_url = '' or photo_url like 'https://jcfezemkbseaqbwuojhs.supabase.co/storage/v1/object/public/avatars/' || user_id::text || '/%'
  );

grant insert (photo_url, experience_items, education_items) on public.profiles to authenticated;
grant update (photo_url, experience_items, education_items) on public.profiles to authenticated;

-- Avatars bucket: public to read (photos appear on public profiles), 2 MB, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Each signed-in person can write only inside their own folder: avatars/<their user id>/...
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
