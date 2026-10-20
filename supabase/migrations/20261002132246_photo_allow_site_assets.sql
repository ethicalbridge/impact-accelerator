-- A profile photo may also be one of Handova's own published images (used when an admin moves a profile in).
alter table public.profiles drop constraint profiles_photo_url_own;
alter table public.profiles add constraint profiles_photo_url_own check (
  photo_url = ''
  or photo_url like 'https://jcfezemkbseaqbwuojhs.supabase.co/storage/v1/object/public/avatars/' || user_id::text || '/%'
  or photo_url like 'https://handova.org/assets/%'
);
