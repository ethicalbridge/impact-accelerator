-- A dedicated LinkedIn link on every professional profile (shown as a "View on LinkedIn" button).
alter table public.profiles add column if not exists linkedin text not null default ''
  check (linkedin = '' or linkedin ~* '^https://([a-z]{2,3}\.)?linkedin\.com/\S+$');
grant insert (linkedin) on public.profiles to authenticated;
grant update (linkedin) on public.profiles to authenticated;
