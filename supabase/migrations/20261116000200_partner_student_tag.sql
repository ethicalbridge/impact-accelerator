-- 16 Nov 2026: a public "Partner university student" tag for students linked to a partner university.
alter table public.profiles add column if not exists partner_student boolean not null default false;
grant select (partner_student) on public.profiles to anon, authenticated;

create or replace function public.is_partner_student(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_private x join public.universities u on u.id = x.university_id
    join public.profiles p on p.user_id = x.user_id
    where x.user_id = uid and u.status = 'partner' and p.experience_level in ('student_early', 'student_final', 'graduate'))
$$;

-- Profiles: set on create and when the experience level changes (alongside the start date from the partner).
create or replace function public.student_start_from_partner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.experience_level like 'student%' and new.starts_on is null then
    select u.starts_on into new.starts_on from public.user_private x join public.universities u on u.id = x.university_id
    where x.user_id = new.user_id and u.status = 'partner' and u.starts_on is not null;
  end if;
  new.partner_student := new.experience_level in ('student_early', 'student_final', 'graduate') and exists (
    select 1 from public.user_private x join public.universities u on u.id = x.university_id where x.user_id = new.user_id and u.status = 'partner');
  return new;
end $$;

-- When a student's university link changes, or a university's status changes, the tag follows.
create or replace function public.refresh_partner_student_private() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles p set partner_student = public.is_partner_student(p.user_id) where p.user_id = new.user_id and p.partner_student is distinct from public.is_partner_student(p.user_id);
  return new;
end $$;
drop trigger if exists user_private_partner_tag on public.user_private;
create trigger user_private_partner_tag after insert or update of university_id on public.user_private for each row execute function public.refresh_partner_student_private();

create or replace function public.refresh_partner_student_university() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles p set partner_student = public.is_partner_student(p.user_id)
  where p.user_id in (select x.user_id from public.user_private x where x.university_id = new.id) and p.partner_student is distinct from public.is_partner_student(p.user_id);
  return new;
end $$;
drop trigger if exists universities_partner_tag on public.universities;
create trigger universities_partner_tag after update of status on public.universities for each row execute function public.refresh_partner_student_university();
