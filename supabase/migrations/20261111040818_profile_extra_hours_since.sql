-- 11 Nov 2026: extra hours are added on top of what is left at the moment they are added, so hours already
-- handed over earlier in the month don't use them up. extra_hours_since records when they were added.
alter table public.profiles add column if not exists extra_hours_since timestamptz;
grant select (extra_hours_since) on public.profiles to anon, authenticated;
grant update (extra_hours_since) on public.profiles to authenticated;
