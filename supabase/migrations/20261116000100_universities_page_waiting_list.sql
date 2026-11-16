-- 16 Nov 2026: the "For universities" page and the student waiting list.
--
-- 1. register_university_interest(): the form on handova.org/universities. Anyone can send it (no account). Each
--    submission is kept in university_interests and adds the university to Registered universities, in the order it
--    arrived, so universities can be invited to the pilot in registration order.
-- 2. profiles.starts_on: students start in phases from January 2027. A student with no date, or a date in the future,
--    is on the waiting list: their reviewed profile is visible, but they can't apply or be invited yet. Admins give
--    dates in phases, in registration order. Students of a partner university start on their university's start date.

-- ---------- 1. University interest ----------
create table if not exists public.university_interests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  role text not null default '' check (char_length(role) <= 120),
  university text not null check (char_length(university) between 2 and 200),
  country text not null default '' check (char_length(country) <= 80),
  email text not null check (char_length(email) <= 254),
  interest text not null check (interest in ('pilot', 'share', 'other')),
  message text not null default '' check (char_length(message) <= 2000),
  university_id uuid references public.universities (id) on delete set null
);
alter table public.university_interests enable row level security;
drop policy if exists university_interests_admin on public.university_interests;
create policy university_interests_admin on public.university_interests for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.university_interests from anon, authenticated;
grant select, update, delete on public.university_interests to authenticated;

create or replace function public.register_university_interest(p_name text, p_role text, p_university text, p_country text, p_email text, p_interest text, p_message text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare
  nm text := left(btrim(coalesce(p_name, '')), 120);
  uni_name text := left(btrim(coalesce(p_university, '')), 200);
  em text := lower(btrim(coalesce(p_email, '')));
  hdrs jsonb; k text; uni uuid; base text; c text; i int := 1;
begin
  if char_length(nm) < 2 then raise exception 'Add your name.' using errcode = '22023'; end if;
  if char_length(uni_name) < 2 then raise exception 'Add your university.' using errcode = '22023'; end if;
  if em !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' or length(em) > 254 then raise exception 'Check the email address.' using errcode = '22023'; end if;
  if coalesce(p_interest, '') not in ('pilot', 'share', 'other') then raise exception 'Choose what you are interested in.' using errcode = '22023'; end if;
  -- The same limits as public reports: a few per hour from one place, and a cap on the whole form.
  begin hdrs := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then hdrs := '{}'::jsonb; end;
  k := encode(sha256(convert_to('handova-uni-interest|' || coalesce(public.request_ip(hdrs), ''), 'UTF8')), 'hex');
  delete from public.public_report_throttle where created_at < now() - interval '1 day';
  if (select count(*) from public.public_report_throttle t where t.key = k and t.created_at > now() - interval '1 hour') >= 3
     or (select count(*) from public.public_report_throttle t where t.key = k) >= 10 then
    raise exception 'Too many messages have been sent from here. Please try again later, or write to hello@handova.org.' using errcode = 'P0001';
  end if;
  insert into public.public_report_throttle (key) values (k);

  -- The university joins the list (or is found on it). A new one starts as "No agreement yet".
  select u.id into uni from public.universities u where lower(btrim(u.name)) = lower(uni_name) limit 1;
  if uni is null then
    base := left(regexp_replace(regexp_replace(lower(uni_name), '[^a-z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'), 52);
    if char_length(base) < 3 then base := 'university'; end if;
    c := base;
    while exists (select 1 from public.universities u where u.code = c) loop i := i + 1; c := base || '-' || i; end loop;
    insert into public.universities (name, country, code, status, contact_name, contact_email, notes)
    values (uni_name, left(btrim(coalesce(p_country, '')), 80), c, 'prospect', nm, em, 'Registered interest on handova.org/universities on ' || to_char(now(), 'DD Mon YYYY') || '.')
    returning id into uni;
  else
    update public.universities u set contact_name = case when u.contact_name = '' then nm else u.contact_name end,
      contact_email = case when u.contact_email = '' then em else u.contact_email end where u.id = uni;
  end if;
  insert into public.university_interests (name, role, university, country, email, interest, message, university_id)
  values (nm, left(btrim(coalesce(p_role, '')), 120), uni_name, left(btrim(coalesce(p_country, '')), 80), em, p_interest, left(btrim(coalesce(p_message, '')), 2000), uni);
  perform public.notify_admins('university_interest', 'A university registered its interest', uni_name || ' · ' || nm, '#admin-list/universities');
end $$;
revoke all on function public.register_university_interest(text, text, text, text, text, text, text) from public;
grant execute on function public.register_university_interest(text, text, text, text, text, text, text) to anon, authenticated;

-- Admin list of universities: the first interest date and how many people registered interest, for invitation order.
drop function if exists public.admin_universities();
create or replace function public.admin_universities()
returns table (id uuid, name text, country text, code text, status text, seats integer, starts_on date, ends_on date, agreement_signed_on date,
  contact_name text, contact_email text, notes text, created_at timestamptz, students integer, awaiting integer, typed integer,
  interest_at timestamptz, interests integer, last_interest text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  return query
  select u.id, u.name, u.country, u.code, u.status, u.seats, u.starts_on, u.ends_on, u.agreement_signed_on, u.contact_name, u.contact_email, u.notes, u.created_at,
    (select count(*)::integer from public.user_private x join auth.users a on a.id = x.user_id where x.university_id = u.id and a.email_confirmed_at is not null),
    (select count(*)::integer from public.user_private x join auth.users a on a.id = x.user_id where x.university_id = u.id and a.email_confirmed_at is null),
    (select count(*)::integer from public.user_private x where x.university_id is null and lower(btrim(x.university_name)) = lower(btrim(u.name))),
    (select min(i.created_at) from public.university_interests i where i.university_id = u.id),
    (select count(*)::integer from public.university_interests i where i.university_id = u.id),
    (select i.name || coalesce(' (' || nullif(i.role, '') || ')', '') || ' · ' || i.email || ' · ' || i.interest || coalesce(' · ' || nullif(i.message, ''), '')
       from public.university_interests i where i.university_id = u.id order by i.created_at desc limit 1)
  from public.universities u
  order by (u.status = 'partner') desc, (select min(i.created_at) from public.university_interests i where i.university_id = u.id) nulls last, u.name;
end $$;
revoke all on function public.admin_universities() from public, anon;
grant execute on function public.admin_universities() to authenticated;

-- ---------- 2. The student waiting list ----------
alter table public.profiles add column if not exists starts_on date;
grant select (starts_on) on public.profiles to anon, authenticated;

-- On the waiting list: a student whose start date is missing or still ahead.
create or replace function public.on_waiting_list(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.user_id = uid and p.experience_level like 'student%' and (p.starts_on is null or p.starts_on > current_date))
$$;
grant execute on function public.on_waiting_list(uuid) to anon, authenticated;

-- A student of a partner university starts on the university's start date, unless an admin has set a date.
create or replace function public.student_start_from_partner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.experience_level like 'student%' and new.starts_on is null then
    select u.starts_on into new.starts_on from public.user_private x join public.universities u on u.id = x.university_id
    where x.user_id = new.user_id and u.status = 'partner' and u.starts_on is not null;
  end if;
  return new;
end $$;
drop trigger if exists profiles_student_start on public.profiles;
create trigger profiles_student_start before insert or update of experience_level on public.profiles for each row execute function public.student_start_from_partner();

-- Students on the waiting list can't apply or be invited yet, with a clear message.
create or replace function public.waiting_list_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare d date;
begin
  if public.on_waiting_list(new.user_id) then
    select p.starts_on into d from public.profiles p where p.user_id = new.user_id;
    if tg_table_name = 'applications' then
      raise exception '%', case when d is null then 'You are on the waiting list. You can apply once your place opens: we open places in phases from January 2027, in the order students registered.'
        else 'Your place on Handova opens on ' || to_char(d, 'FMDD FMMonth YYYY') || '. You can apply from then.' end using errcode = 'P0001';
    else
      raise exception 'This student is on the waiting list and can’t be invited yet.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists applications_waiting_list on public.applications;
create trigger applications_waiting_list before insert on public.applications for each row execute function public.waiting_list_guard();
drop trigger if exists invitations_waiting_list on public.invitations;
create trigger invitations_waiting_list before insert on public.invitations for each row execute function public.waiting_list_guard();

-- Admins open places in phases: a date for one student (null puts them back on the list), with a notification.
create or replace function public.admin_set_student_start(p_user uuid, p_date date)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  update public.profiles set starts_on = p_date where user_id = p_user;
  if not found then raise exception 'This student has no profile yet.'; end if;
  if p_date is not null then
    perform public.notify(p_user, 'student_start',
      case when p_date <= current_date then 'Your place on Handova is open' else 'Your place on Handova opens on ' || to_char(p_date, 'FMDD FMMonth YYYY') end,
      case when p_date <= current_date then 'You can now apply to needs. Start with those that match what you know.' else 'From that day you can apply to needs. Until then, keep your profile up to date.' end,
      '#needs');
  end if;
end $$;
revoke all on function public.admin_set_student_start(uuid, date) from public, anon;
grant execute on function public.admin_set_student_start(uuid, date) to authenticated;

-- Registered students: queue order (sign-up time) and start date, for opening places in phases.
drop function if exists public.admin_students();
create or replace function public.admin_students()
returns table (user_id uuid, name text, email text, signed_up_at timestamptz, email_confirmed boolean, university_id uuid, university_name text,
  study_programme text, study_level text, study_end date, share_with_university boolean, experience_level text, profile_status text,
  hours_approved numeric, contributions integer, starts_on date, queue integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  return query
  with s as (
    select a.id, coalesce(nullif(p.name, ''), a.raw_user_meta_data ->> 'full_name', '') nm, a.email::text em, a.created_at, a.email_confirmed_at is not null conf,
      x.university_id uid_, coalesce(un.name, x.university_name, '') uname, coalesce(x.study_programme, '') prog, coalesce(x.study_level, '') lvl, x.study_end,
      coalesce(x.share_with_university, false) share, coalesce(p.experience_level, '') exp,
      case when p.user_id is null then 'no_profile' when p.closed_at is not null then 'closed' when not p.published then 'draft'
           when p.review_status = 'approved' then 'public' else p.review_status::text end st,
      coalesce((select sum(h.hours) from public.hours h where h.user_id = a.id and h.status = 'approved'), 0) hrs,
      (select count(*)::integer from public.engagements e where e.user_id = a.id and e.status in ('active', 'completed')) contrib,
      p.starts_on
    from auth.users a
    left join public.user_private x on x.user_id = a.id
    left join public.universities un on un.id = x.university_id
    left join public.profiles p on p.user_id = a.id
    where x.career_stage = 'student' or x.university_id is not null or x.university_name <> '' or p.experience_level in ('student_early', 'student_final')
  )
  select s.id, s.nm, s.em, s.created_at, s.conf, s.uid_, s.uname, s.prog, s.lvl, s.study_end, s.share, s.exp, s.st, s.hrs, s.contrib, s.starts_on,
    (row_number() over (order by s.created_at))::integer
  from s order by s.created_at;
end $$;
revoke all on function public.admin_students() from public, anon;
grant execute on function public.admin_students() to authenticated;
