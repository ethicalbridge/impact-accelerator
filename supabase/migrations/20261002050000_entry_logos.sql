-- Logos on experience and education entries must be the person's own uploads in the avatars bucket.
create or replace function public.entry_logos_ok(items jsonb, uid uuid) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(
    coalesce(x->>'logo', '') = ''
    or (x->>'logo') like 'https://jcfezemkbseaqbwuojhs.supabase.co/storage/v1/object/public/avatars/' || uid::text || '/%'
  ), true)
  from jsonb_array_elements(case when jsonb_typeof(items) = 'array' then items else '[]'::jsonb end) as x
$$;
alter table public.profiles
  add constraint profiles_experience_logos_own check (public.entry_logos_ok(experience_items, user_id)),
  add constraint profiles_education_logos_own check (public.entry_logos_ok(education_items, user_id));
