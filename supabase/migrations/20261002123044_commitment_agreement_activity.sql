-- 1. Monthly commitment: a published profile offers at least 4 hours a month.
alter table public.profiles alter column hours_available set default 4;
alter table public.profiles add constraint profiles_min_commitment check (not published or hours_available between 4 and 160);
alter table public.profiles add column closed_at timestamptz, add column closed_reason text not null default '';

-- 2. Signed agreements. No foreign key to auth.users: the record is kept even if the account is deleted.
create table public.agreement_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null default '',
  kind text not null check (kind in ('professional', 'organisation')),
  version text not null,
  full_name text not null check (length(full_name) between 2 and 160),
  hours_committed integer,
  agreement_text text not null,
  text_sha256 text not null,
  ip text not null default '',
  user_agent text not null default '',
  signed_at timestamptz not null default now()
);
create index agreement_signatures_user on public.agreement_signatures (user_id, kind, signed_at desc);
alter table public.agreement_signatures enable row level security;
revoke all on public.agreement_signatures from anon, authenticated;
grant select on public.agreement_signatures to authenticated;
create policy agreement_signatures_read on public.agreement_signatures for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
-- No insert, update or delete policies: signatures are written only by sign_agreement and never changed.

create function public.current_agreement(k text) returns text language sql immutable set search_path = '' as $$
  select case k when 'professional' then 'professional-2026-10-02' else null end
$$;

create function public.sign_agreement(p_kind text, p_version text, p_name text, p_text text, p_hours integer default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); hdrs json; new_id uuid;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if p_version is distinct from public.current_agreement(p_kind) then raise exception 'This agreement has been updated. Reload the page and read the new version.'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Type your full name to sign.'; end if;
  if length(coalesce(p_text, '')) < 500 or length(p_text) > 100000 then raise exception 'The agreement text is missing.'; end if;
  hdrs := nullif(current_setting('request.headers', true), '')::json;
  insert into public.agreement_signatures (user_id, email, kind, version, full_name, hours_committed, agreement_text, text_sha256, ip, user_agent)
  values (uid, coalesce((select email from auth.users where id = uid), ''), p_kind, p_version, trim(p_name), p_hours, p_text,
    encode(sha256(convert_to(p_text, 'UTF8')), 'hex'),
    coalesce(trim(split_part(hdrs->>'x-forwarded-for', ',', 1)), ''), left(coalesce(hdrs->>'user-agent', ''), 400))
  returning id into new_id;
  return new_id;
end $$;
revoke all on function public.sign_agreement(text, text, text, text, integer) from public, anon;
grant execute on function public.sign_agreement(text, text, text, text, integer) to authenticated;

-- 3. A profile can only be published after signing the current agreement.
create or replace function public.profile_review_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.published and (tg_op = 'INSERT' or not old.published) and not exists (
    select 1 from public.agreement_signatures s where s.user_id = new.user_id and s.kind = 'professional' and s.version = public.current_agreement('professional')
  ) then raise exception 'Please read and sign the Handova professional agreement before publishing your profile.'; end if;
  if new.published then new.closed_at = null; new.closed_reason = ''; end if;
  if tg_op = 'INSERT' then new.review_status = case when new.published then 'pending'::public.review_status else 'draft' end; new.approved_at = null;
  elsif new.published and not old.published and old.review_status in ('draft', 'changes_requested') then new.review_status = 'pending';
  end if;
  if new.review_status = 'pending' and (tg_op = 'INSERT' or old.review_status <> 'pending') then
    perform public.notify_admins('profile_review', 'Profile to review', new.name, '#admin');
  end if;
  return new;
end $$;

-- 4. Activity: three months without endorsed work (from approval or the last endorsed contribution) closes a profile.
-- A reminder goes out two weeks before. Profiles with an engagement in progress stay open.
create function public.profile_activity_check() returns integer language plpgsql security definer set search_path = '' as $$
declare closed integer;
begin
  with p as (
    select pr.user_id, greatest(pr.approved_at, (select max(e.completed_at) from public.engagements e where e.user_id = pr.user_id and e.status = 'completed' and coalesce(e.endorsement, '') <> '')) as since
    from public.profiles pr
    where pr.published and pr.review_status = 'approved'
      and not exists (select 1 from public.engagements e where e.user_id = pr.user_id and e.status = 'active')
  )
  insert into public.notifications (user_id, kind, title, body, link)
  select p.user_id, 'activity_reminder', 'Your profile closes in two weeks',
    'Profiles without endorsed work for three months are closed so organisations only see active members. Apply to a need or reply to an invitation to keep it open.', '#needs'
  from p
  where p.since <= now() - interval '3 months' + interval '14 days' and p.since > now() - interval '3 months'
    and not exists (select 1 from public.notifications n where n.user_id = p.user_id and n.kind = 'activity_reminder' and n.created_at >= p.since);

  with p as (
    select pr.user_id, greatest(pr.approved_at, (select max(e.completed_at) from public.engagements e where e.user_id = pr.user_id and e.status = 'completed' and coalesce(e.endorsement, '') <> '')) as since
    from public.profiles pr
    where pr.published and pr.review_status = 'approved'
      and not exists (select 1 from public.engagements e where e.user_id = pr.user_id and e.status = 'active')
  ), c as (
    update public.profiles pr set published = false, review_status = 'draft', approved_at = null, closed_at = now(), closed_reason = 'inactive'
    from p where pr.user_id = p.user_id and p.since <= now() - interval '3 months'
    returning pr.user_id
  )
  insert into public.notifications (user_id, kind, title, body, link)
  select c.user_id, 'profile_closed', 'Your profile has been closed for now',
    'There was no endorsed work for three months. Publish your profile again whenever you are ready and we will review it.', '#workspace/profile'
  from c;
  get diagnostics closed = row_count;
  return closed;
end $$;
revoke all on function public.profile_activity_check() from public, anon, authenticated;
select cron.schedule('handova-profile-activity', '40 1 * * *', 'select public.profile_activity_check()');
