-- 11 Nov 2026: a professional can add extra hours for the current month only, on top of the hours they commit each month.
-- extra_hours counts only while extra_hours_month is the current month; it lapses by itself on the 1st.
alter table public.profiles
  add column if not exists extra_hours integer not null default 0 check (extra_hours between 0 and 40),
  add column if not exists extra_hours_month date;
grant select (extra_hours, extra_hours_month) on public.profiles to anon, authenticated;
grant update (extra_hours, extra_hours_month) on public.profiles to authenticated;
