-- Round-3 audit (20 Oct 2026), L27/O16: joining an organisation's team now always needs the person's consent.
-- Before: if the email had a Handova account, the person was added straight away and the owner saw their name, and the
-- different answers ("added" / "invitation saved") told the owner whether an email had an account.
-- Now: the owner can only invite (approved organisations only, at most 10 invitations a day); the answer is always the
-- same; the invited person sees the invitation in Handova and accepts or declines it. Invitations expire after 30 days.
-- Cancelled, declined and accepted invitations are kept with their status (no rows are removed here).

alter table public.org_member_invites add column if not exists status text not null default 'pending';
alter table public.org_member_invites add column if not exists responded_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'org_member_invites_status_check' and conrelid = 'public.org_member_invites'::regclass) then
    alter table public.org_member_invites add constraint org_member_invites_status_check check (status in ('pending', 'accepted', 'declined', 'cancelled'));
  end if;
end $$;
grant select (status, responded_at) on public.org_member_invites to authenticated;

create or replace function public.invite_org_member(p_org uuid, p_email text)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare
  uid uuid := auth.uid();
  em text := lower(trim(coalesce(p_email, '')));
  org record; target uuid; used int;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if public.is_suspended(uid) then raise exception 'Your account is suspended while Handova looks into a concern.'; end if;
  if not public.is_org_owner(p_org) then raise exception 'Only the organisation’s owner can add team members.'; end if;
  select o.id, o.name, o.status into org from public.organisations o where o.id = p_org for update;
  if org.id is null then raise exception 'Organisation not found.'; end if;
  if org.status <> 'approved' then raise exception 'You can add team members once Handova has approved your organisation.'; end if;
  if em !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or length(em) > 254 then raise exception 'Type a full email address.'; end if;
  if (select count(*) from public.org_member_invites i where i.organisation_id = p_org and i.created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have sent many invitations today. Please try again tomorrow.';
  end if;
  if exists (select 1 from public.org_member_invites i where i.organisation_id = p_org and i.email = em and i.status = 'pending' and i.created_at > now() - interval '30 days') then
    raise exception 'This email address has already been invited.';
  end if;
  used := (select count(*) from public.organisation_members m where m.organisation_id = p_org)
        + (select count(*) from public.org_member_invites i where i.organisation_id = p_org and i.status = 'pending' and i.created_at > now() - interval '30 days');
  if used >= 3 then raise exception 'An organisation can have up to 3 team members, including invitations.'; end if;
  insert into public.org_member_invites (organisation_id, email, invited_by, status, created_at, responded_at)
  values (p_org, em, uid, 'pending', now(), null)
  on conflict (organisation_id, email) do update set invited_by = excluded.invited_by, status = 'pending', created_at = now(), responded_at = null;
  -- If the address already has a confirmed account, the person is told in Handova. The owner learns nothing either way.
  select u.id into target from auth.users u where lower(u.email) = em and u.email_confirmed_at is not null limit 1;
  if target is not null and not exists (select 1 from public.organisation_members m where m.organisation_id = p_org and m.user_id = target) then
    perform public.notify(target, 'team', 'An organisation invited you to its team', org.name || ' invited you to help manage it on Handova. Accept or decline the invitation.', '#team-invites');
  end if;
  perform public.notify_admins('team', 'Team member invited', org.name, '#admin-list/organisations');
  return 'invited';
end $function$;
revoke all on function public.invite_org_member(uuid, text) from public, anon;
grant execute on function public.invite_org_member(uuid, text) to authenticated;

-- The invitations waiting for the signed-in person (sent to their confirmed email in the last 30 days).
create or replace function public.my_org_invites()
 returns table (id uuid, organisation_id uuid, organisation_name text, created_at timestamptz)
 language sql stable security definer set search_path to ''
as $$
  select i.id, i.organisation_id, o.name, i.created_at
  from public.org_member_invites i
  join public.organisations o on o.id = i.organisation_id
  join auth.users u on u.id = auth.uid() and u.email_confirmed_at is not null and lower(u.email) = i.email
  where i.status = 'pending' and i.created_at > now() - interval '30 days' and o.status = 'approved'
    and not exists (select 1 from public.organisation_members m where m.organisation_id = i.organisation_id and m.user_id = auth.uid())
  order by i.created_at;
$$;
revoke all on function public.my_org_invites() from public, anon;
grant execute on function public.my_org_invites() to authenticated;

-- Accept or decline an invitation sent to the signed-in person's email.
create or replace function public.respond_org_invite(p_id uuid, p_accept boolean)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare uid uuid := auth.uid(); em text; nm text; inv record;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  select lower(u.email), coalesce(u.raw_user_meta_data->>'full_name', '') into em, nm from auth.users u where u.id = uid and u.email_confirmed_at is not null;
  select i.id, i.organisation_id, o.name, o.status as org_status into inv
    from public.org_member_invites i join public.organisations o on o.id = i.organisation_id
    where i.id = p_id and i.email = em and i.status = 'pending' and i.created_at > now() - interval '30 days' for update of i;
  if inv.id is null then raise exception 'This invitation is no longer open.'; end if;
  if not p_accept then
    update public.org_member_invites set status = 'declined', responded_at = now() where id = p_id;
    return;
  end if;
  if public.is_suspended(uid) then raise exception 'Your account is suspended while Handova looks into a concern.'; end if;
  if inv.org_status <> 'approved' then raise exception 'This organisation can’t add team members at the moment.'; end if;
  if (select count(*) from public.organisation_members m where m.user_id = uid) >= 3 then
    raise exception 'You already help manage three organisations, the most Handova allows.';
  end if;
  if (select count(*) from public.organisation_members m where m.organisation_id = inv.organisation_id) >= 3 then
    raise exception 'This organisation’s team is full.';
  end if;
  insert into public.organisation_members (organisation_id, user_id, role, full_name)
    values (inv.organisation_id, uid, 'member', left(nm, 120)) on conflict do nothing;
  update public.org_member_invites set status = 'accepted', responded_at = now() where id = p_id;
  perform public.notify_org(inv.organisation_id, 'team', 'A colleague joined your organisation’s team', coalesce(nullif(nm, ''), em), '#org/details');
end $function$;
revoke all on function public.respond_org_invite(uuid, boolean) from public, anon;
grant execute on function public.respond_org_invite(uuid, boolean) to authenticated;

-- Old automatic joining on sign-in: no longer joins anyone (kept so older pages don't fail).
create or replace function public.claim_org_invites()
 returns integer language sql stable security definer set search_path to ''
as $$ select 0 $$;
revoke all on function public.claim_org_invites() from public, anon;
grant execute on function public.claim_org_invites() to authenticated;

-- Cancelling keeps the row, marked cancelled.
create or replace function public.cancel_org_invite(p_id uuid)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare org uuid;
begin
  select organisation_id into org from public.org_member_invites where id = p_id and status = 'pending';
  if org is null or not public.is_org_owner(org) then raise exception 'Invitation not found.'; end if;
  update public.org_member_invites set status = 'cancelled', responded_at = now() where id = p_id;
end $function$;
revoke all on function public.cancel_org_invite(uuid) from public, anon;
grant execute on function public.cancel_org_invite(uuid) to authenticated;
