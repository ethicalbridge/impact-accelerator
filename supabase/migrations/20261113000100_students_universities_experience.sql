-- 13 Nov 2026: students and partner universities, and a public experience level organisations can filter by.
--
-- 1. profiles.experience_level: public, chosen by every professional and student; the Talent directory filters by it.
--    profiles.study_label: "programme · university", public only when the student chooses to show it.
-- 2. universities: Handova's register of universities. Once an agreement is signed, the admin records the student places
--    agreed and the period. Students pick a partner university at sign-up and are linked to it, using one place.
-- 3. user_private gains the student's study details (private to the student and Handova).
-- 4. Career stage (research, private) is now set from the experience level, so nobody answers the same question twice.

-- ---------- 1. Public experience level ----------
alter table public.profiles add column if not exists experience_level text not null default '';
alter table public.profiles drop constraint if exists profiles_experience_level_check;
alter table public.profiles add constraint profiles_experience_level_check
  check (experience_level in ('', 'student_early', 'student_final', 'graduate', 'y1_3', 'y4_7', 'y8_12', 'y13'));
alter table public.profiles add column if not exists study_label text not null default '';
alter table public.profiles drop constraint if exists profiles_study_label_check;
alter table public.profiles add constraint profiles_study_label_check check (char_length(study_label) <= 240);
grant select (experience_level, study_label) on public.profiles to anon, authenticated;
grant insert (experience_level), update (experience_level) on public.profiles to authenticated;

-- ---------- 2. Universities ----------
create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 200),
  country text not null default '' check (char_length(country) <= 80),
  -- The code in a university's sign-up link: handova.org/#join?role=student&uni=<code>
  code text not null unique check (code ~ '^[a-z0-9-]{3,60}$'),
  status text not null default 'prospect' check (status in ('prospect', 'partner', 'ended')),
  seats integer check (seats is null or seats between 1 and 100000),
  starts_on date,
  ends_on date,
  agreement_signed_on date,
  contact_name text not null default '' check (char_length(contact_name) <= 160),
  contact_email text not null default '' check (char_length(contact_email) <= 254),
  notes text not null default '' check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint universities_period check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create unique index if not exists universities_name_key on public.universities (lower(btrim(name)));
alter table public.universities enable row level security;
-- Contacts and notes are Handova's: only admins read the table. Students see partner names through partner_universities().
drop policy if exists universities_admin on public.universities;
create policy universities_admin on public.universities for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.universities from anon, authenticated;
grant select, insert, update, delete on public.universities to authenticated;
drop trigger if exists universities_touch on public.universities;
create trigger universities_touch before update on public.universities for each row execute function public.touch();

-- A partner university accepts students while its agreement runs (or before it starts).
create or replace function public.university_open(u public.universities) returns boolean
language sql stable set search_path = '' as $$
  select u.status = 'partner' and (u.ends_on is null or u.ends_on >= current_date)
$$;

-- What the sign-up page needs: partner names, and the code from a university's link.
create or replace function public.partner_universities()
returns table (id uuid, name text, country text, code text)
language sql stable security definer set search_path = '' as $$
  select u.id, u.name, u.country, u.code from public.universities u where public.university_open(u) order by u.name
$$;
revoke all on function public.partner_universities() from public;
grant execute on function public.partner_universities() to anon, authenticated;

-- ---------- 3. Study details (private) ----------
alter table public.user_private
  add column if not exists university_id uuid references public.universities (id) on delete set null,
  add column if not exists university_name text not null default '',
  add column if not exists study_programme text not null default '',
  add column if not exists study_level text not null default '',
  add column if not exists study_end date,
  add column if not exists share_with_university boolean not null default false,
  add column if not exists share_consented_at timestamptz,
  add column if not exists university_linked_at timestamptz;
alter table public.user_private drop constraint if exists user_private_study_check;
alter table public.user_private add constraint user_private_study_check check (
  char_length(university_name) <= 200 and char_length(study_programme) <= 160 and study_level in ('', 'bachelor', 'master', 'phd', 'other'));
create index if not exists user_private_university_idx on public.user_private (university_id);

-- The partner a student named: by id (from the list or a link), else by exact name. Only universities open to students.
create or replace function public.match_university(p_id text, p_name text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid;
begin
  if coalesce(p_id, '') ~ '^[0-9a-f-]{36}$' then
    select u.id into uid from public.universities u where u.id = p_id::uuid and public.university_open(u);
  end if;
  if uid is null and btrim(coalesce(p_name, '')) <> '' then
    select u.id into uid from public.universities u where lower(btrim(u.name)) = lower(btrim(p_name)) and public.university_open(u) limit 1;
  end if;
  return uid;
end $$;
revoke all on function public.match_university(text, text) from public, anon, authenticated;

-- "2027-06" (month input) or "2027-06-30" → a date; anything else → null.
create or replace function public.study_end_date(p text) returns date
language sql immutable set search_path = '' as $$
  select case when coalesce(p, '') ~ '^\d{4}-(0[1-9]|1[0-2])$' then to_date(p || '-01', 'YYYY-MM-DD')
              when coalesce(p, '') ~ '^\d{4}-\d{2}-\d{2}$' then p::date end
$$;

-- Career stage (research) from the experience level. Retired and career break are kept for non-students.
create or replace function public.career_from_level(p_level text, p_current text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_level like 'student%' then 'student'
    when p_current in ('retired', 'break') then p_current
    when p_level in ('graduate', 'y1_3') then 'early'
    when p_level = 'y4_7' then 'mid'
    when p_level = 'y8_12' then 'experienced'
    when p_level = 'y13' then 'senior'
    else p_current end
$$;

-- Sign-up: a student is linked to their university straight away, so the place is counted when they register.
create or replace function public.link_student_on_signup() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s jsonb := coalesce(new.raw_user_meta_data -> 'student', 'null'::jsonb); uni uuid; share boolean;
begin
  if jsonb_typeof(s) <> 'object' then return new; end if;
  uni := public.match_university(s ->> 'university_id', s ->> 'university');
  share := uni is not null and coalesce(s ->> 'share', '') = 'true';
  insert into public.user_private (user_id, career_stage, university_id, university_name, study_programme, study_level, study_end,
    share_with_university, share_consented_at, university_linked_at, updated_at)
  values (new.id, 'student', uni, coalesce((select u.name from public.universities u where u.id = uni), left(btrim(coalesce(s ->> 'university', '')), 200)), left(btrim(coalesce(s ->> 'programme', '')), 160),
    case when s ->> 'level' in ('bachelor', 'master', 'phd', 'other') then s ->> 'level' else '' end, public.study_end_date(s ->> 'end'),
    share, case when share then now() end, case when uni is not null then now() end, now())
  on conflict (user_id) do nothing;
  return new;
exception when others then
  return new;
end $$;
revoke all on function public.link_student_on_signup() from public, anon, authenticated;
drop trigger if exists on_auth_user_student on auth.users;
create trigger on_auth_user_student after insert on auth.users for each row execute function public.link_student_on_signup();

-- Profile set-up and edits: the experience level, and for students their studies. One call keeps all three in step.
create or replace function public.save_experience(p_level text, p_student jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  s jsonb := coalesce(p_student, '{}'::jsonb);
  studying boolean := p_level in ('student_early', 'student_final', 'graduate');
  uni_name text := left(btrim(coalesce(s ->> 'university', '')), 200);
  prog text := left(btrim(coalesce(s ->> 'programme', '')), 160);
  lvl text := case when s ->> 'level' in ('bachelor', 'master', 'phd', 'other') then s ->> 'level' else '' end;
  show boolean := coalesce(s ->> 'show', '') = 'true';
  share boolean;
  uni uuid;
  old public.user_private;
begin
  if me is null then raise exception 'Please sign in first.'; end if;
  if p_level not in ('student_early', 'student_final', 'graduate', 'y1_3', 'y4_7', 'y8_12', 'y13') then raise exception 'Choose your experience level.'; end if;
  if p_level like 'student%' and uni_name = '' then raise exception 'Add your university.'; end if;
  select * into old from public.user_private where user_id = me;
  if studying then
    uni := public.match_university(s ->> 'university_id', uni_name);
    -- Keep an existing link to the same university even after its agreement has ended.
    if uni is null and old.university_id is not null and exists (select 1 from public.universities u where u.id = old.university_id and lower(btrim(u.name)) = lower(uni_name)) then uni := old.university_id; end if;
    -- A linked student shows the university's own spelling.
    if uni is not null then select u.name into uni_name from public.universities u where u.id = uni; end if;
  end if;
  share := uni is not null and coalesce(s ->> 'share', '') = 'true';
  update public.profiles set experience_level = p_level,
    study_label = case when studying and show and uni_name <> '' then left(concat_ws(' · ', nullif(prog, ''), uni_name), 240) else '' end
  where user_id = me;
  insert into public.user_private as x (user_id, career_stage, university_id, university_name, study_programme, study_level, study_end,
    share_with_university, share_consented_at, university_linked_at, updated_at)
  values (me, public.career_from_level(p_level, old.career_stage), uni,
    case when studying then uni_name else '' end, case when studying then prog else '' end, case when studying then lvl else '' end,
    case when studying then public.study_end_date(s ->> 'end') end,
    share, case when share then now() end, case when uni is not null then now() end, now())
  on conflict (user_id) do update set
    career_stage = excluded.career_stage, university_id = excluded.university_id, university_name = excluded.university_name,
    study_programme = excluded.study_programme, study_level = excluded.study_level, study_end = excluded.study_end,
    share_with_university = excluded.share_with_university,
    share_consented_at = case when excluded.share_with_university then coalesce(case when x.share_with_university and x.university_id = excluded.university_id then x.share_consented_at end, now()) end,
    university_linked_at = case when excluded.university_id is null then null when x.university_id = excluded.university_id then coalesce(x.university_linked_at, now()) else now() end,
    updated_at = now();
end $$;
revoke all on function public.save_experience(text, jsonb) from public, anon;
grant execute on function public.save_experience(text, jsonb) to authenticated;

-- An approved profile whose study line changes is flagged to admins, like a changed title.
create or replace function public.profile_change_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.name is distinct from old.name and old.id_status = 'approved' then
    new.id_status := 'name_mismatch'; new.id_verified_at := null;
    perform public.notify_admins('id_check', 'Name changed after identity check', new.name, '#admin');
  elsif old.review_status = 'approved' and (new.headline, new.photo_url, new.website, new.linkedin, new.study_label) is distinct from (old.headline, old.photo_url, old.website, old.linkedin, old.study_label) then
    perform public.notify_admins('profile_changed', 'Approved profile updated', new.name, '#profile/' || new.user_id);
  end if;
  return new;
end $$;

-- ---------- 4. Admin lists ----------
-- Registered universities, with places used: confirmed students linked to each one, and those still confirming their email.
create or replace function public.admin_universities()
returns table (id uuid, name text, country text, code text, status text, seats integer, starts_on date, ends_on date, agreement_signed_on date,
  contact_name text, contact_email text, notes text, created_at timestamptz, students integer, awaiting integer, typed integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  return query
  select u.id, u.name, u.country, u.code, u.status, u.seats, u.starts_on, u.ends_on, u.agreement_signed_on, u.contact_name, u.contact_email, u.notes, u.created_at,
    (select count(*)::integer from public.user_private x join auth.users a on a.id = x.user_id where x.university_id = u.id and a.email_confirmed_at is not null),
    (select count(*)::integer from public.user_private x join auth.users a on a.id = x.user_id where x.university_id = u.id and a.email_confirmed_at is null),
    -- Students who typed this name but are not linked (for example, they registered before the agreement).
    (select count(*)::integer from public.user_private x where x.university_id is null and lower(btrim(x.university_name)) = lower(btrim(u.name)))
  from public.universities u
  order by (u.status = 'partner') desc, u.name;
end $$;
revoke all on function public.admin_universities() from public, anon;
grant execute on function public.admin_universities() to authenticated;

-- Registered students: everyone who is studying (or signed up as a student), with their studies and where they are.
create or replace function public.admin_students()
returns table (user_id uuid, name text, email text, signed_up_at timestamptz, email_confirmed boolean, university_id uuid, university_name text,
  study_programme text, study_level text, study_end date, share_with_university boolean, experience_level text, profile_status text,
  hours_approved numeric, contributions integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  return query
  select a.id, coalesce(nullif(p.name, ''), a.raw_user_meta_data ->> 'full_name', ''), a.email::text, a.created_at, a.email_confirmed_at is not null,
    x.university_id, coalesce(un.name, x.university_name, ''), coalesce(x.study_programme, ''), coalesce(x.study_level, ''), x.study_end,
    coalesce(x.share_with_university, false), coalesce(p.experience_level, ''),
    case when p.user_id is null then 'no_profile' when p.closed_at is not null then 'closed' when not p.published then 'draft'
         when p.review_status = 'approved' then 'public' else p.review_status::text end,
    coalesce((select sum(h.hours) from public.hours h where h.user_id = a.id and h.status = 'approved'), 0),
    (select count(*)::integer from public.engagements e where e.user_id = a.id and e.status in ('active', 'completed'))
  from auth.users a
  left join public.user_private x on x.user_id = a.id
  left join public.universities un on un.id = x.university_id
  left join public.profiles p on p.user_id = a.id
  where x.career_stage = 'student' or x.university_id is not null or x.university_name <> '' or p.experience_level in ('student_early', 'student_final')
  order by a.created_at desc;
end $$;
revoke all on function public.admin_students() from public, anon;
grant execute on function public.admin_students() to authenticated;
