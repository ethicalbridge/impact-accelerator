-- O2 (audit 20 Oct 2026): organisations can have a small team.
-- The owner adds colleagues by email (at most 3 people per organisation, invitations included) and can hand over ownership.
-- A colleague who already has a Handova account is added straight away; otherwise the invitation waits until they sign up
-- with that email and call claim_org_invites() (the site does this on the onboarding page).
-- Every change is made through the functions below (security definer); members can only read.

create table if not exists public.org_member_invites (
  id uuid primary key default gen_random_uuid(),
  -- Removed with the organisation. No link to auth.users: the invited person usually has no account yet.
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  email text not null check (email = lower(email) and length(email) between 3 and 254),
  invited_by uuid,
  created_at timestamptz not null default now(),
  unique (organisation_id, email)
);
create index if not exists org_member_invites_email on public.org_member_invites(email);
alter table public.org_member_invites enable row level security;
revoke all on public.org_member_invites from public, anon, authenticated;
grant select (id, organisation_id, email, created_at) on public.org_member_invites to authenticated;
drop policy if exists org_member_invites_read on public.org_member_invites;
create policy org_member_invites_read on public.org_member_invites for select to authenticated
  using (public.is_org_member(organisation_id) or public.is_admin());

-- The owner of an organisation. If nobody is the owner (for example the owner deleted their account), any member counts.
create or replace function public.is_org_owner(org uuid)
 returns boolean language sql stable security definer set search_path to ''
as $$
  select exists (select 1 from public.organisation_members m where m.organisation_id = org and m.user_id = auth.uid()
    and (m.role = 'owner' or not exists (select 1 from public.organisation_members o where o.organisation_id = org and o.role = 'owner')));
$$;
revoke all on function public.is_org_owner(uuid) from public, anon;
grant execute on function public.is_org_owner(uuid) to authenticated;

create or replace function public.invite_org_member(p_org uuid, p_email text)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare
  uid uuid := auth.uid();
  em text := lower(trim(coalesce(p_email, '')));
  org record; target record; used int;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if public.is_suspended(uid) then raise exception 'Your account is suspended while Handova looks into a concern.'; end if;
  if not public.is_org_owner(p_org) then raise exception 'Only the organisation’s owner can add team members.'; end if;
  select o.id, o.name, o.status into org from public.organisations o where o.id = p_org for update;
  if org.id is null then raise exception 'Organisation not found.'; end if;
  if org.status in ('suspended', 'rejected') then raise exception 'This organisation can’t add team members at the moment.'; end if;
  if em !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or length(em) > 254 then raise exception 'Type a full email address.'; end if;
  select u.id, coalesce(u.raw_user_meta_data->>'full_name', '') as full_name into target
    from auth.users u where lower(u.email) = em and u.email_confirmed_at is not null limit 1;
  if target.id is not null and exists (select 1 from public.organisation_members m where m.organisation_id = p_org and m.user_id = target.id) then
    raise exception 'This person is already on the team.';
  end if;
  if exists (select 1 from public.org_member_invites i where i.organisation_id = p_org and i.email = em) then
    raise exception 'This email address has already been invited.';
  end if;
  used := (select count(*) from public.organisation_members m where m.organisation_id = p_org)
        + (select count(*) from public.org_member_invites i where i.organisation_id = p_org);
  if used >= 3 then raise exception 'An organisation can have up to 3 team members, including invitations.'; end if;
  if target.id is not null then
    if public.is_suspended(target.id) then raise exception 'This person can’t be added at the moment. Write to hello@handova.org.'; end if;
    if (select count(*) from public.organisation_members m where m.user_id = target.id) >= 3 then
      raise exception 'This person already manages three organisations, the most Handova allows.';
    end if;
    insert into public.organisation_members(organisation_id, user_id, role, full_name)
      values (p_org, target.id, 'member', left(target.full_name, 120));
    perform public.notify(target.id, 'team', 'You were added to an organisation’s team', org.name || ': you can now open its workspace on Handova.', '#org');
    perform public.notify_admins('team', 'Team member added', org.name, '#admin-list/organisations');
    return 'added';
  end if;
  insert into public.org_member_invites(organisation_id, email, invited_by) values (p_org, em, uid);
  perform public.notify_admins('team', 'Team member invited', org.name, '#admin-list/organisations');
  return 'invited';
end $function$;
revoke all on function public.invite_org_member(uuid, text) from public, anon;
grant execute on function public.invite_org_member(uuid, text) to authenticated;

-- Called after sign-in: joins every organisation that invited this (confirmed) email address. Returns how many.
create or replace function public.claim_org_invites()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare uid uuid := auth.uid(); em text; nm text; i record; n int := 0;
begin
  if uid is null then return 0; end if;
  select lower(u.email), coalesce(u.raw_user_meta_data->>'full_name', '') into em, nm
    from auth.users u where u.id = uid and u.email_confirmed_at is not null;
  if em is null or public.is_suspended(uid) then return 0; end if;
  for i in select x.id, x.organisation_id, o.name from public.org_member_invites x join public.organisations o on o.id = x.organisation_id
           where x.email = em order by x.created_at for update of x loop
    if (select count(*) from public.organisation_members m where m.user_id = uid) < 3
       and not exists (select 1 from public.organisation_members m where m.organisation_id = i.organisation_id and m.user_id = uid)
       and (select count(*) from public.organisation_members m where m.organisation_id = i.organisation_id) < 3 then
      insert into public.organisation_members(organisation_id, user_id, role, full_name) values (i.organisation_id, uid, 'member', left(nm, 120));
      perform public.notify_org(i.organisation_id, 'team', 'A colleague joined your organisation’s team', coalesce(nullif(nm, ''), em), '#org/details');
      n := n + 1;
    end if;
    delete from public.org_member_invites where id = i.id;
  end loop;
  return n;
end $function$;
revoke all on function public.claim_org_invites() from public, anon;
grant execute on function public.claim_org_invites() to authenticated;

create or replace function public.cancel_org_invite(p_id uuid)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare org uuid;
begin
  select organisation_id into org from public.org_member_invites where id = p_id;
  if org is null or not public.is_org_owner(org) then raise exception 'Invitation not found.'; end if;
  delete from public.org_member_invites where id = p_id;
end $function$;
revoke all on function public.cancel_org_invite(uuid) from public, anon;
grant execute on function public.cancel_org_invite(uuid) to authenticated;

-- The owner removes a member, or a member leaves. The owner hands over ownership before leaving.
create or replace function public.remove_org_member(p_org uuid, p_user uuid)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare uid uuid := auth.uid(); target record; org_name text;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  select m.user_id, m.role into target from public.organisation_members m where m.organisation_id = p_org and m.user_id = p_user for update;
  if target.user_id is null then raise exception 'This person is not on the team.'; end if;
  if p_user <> uid and not public.is_org_owner(p_org) then raise exception 'Only the owner can remove team members.'; end if;
  if target.role = 'owner' then raise exception 'Make someone else the owner first.'; end if;
  if (select count(*) from public.organisation_members m where m.organisation_id = p_org) <= 1 then
    raise exception 'An organisation needs at least one person managing it.';
  end if;
  delete from public.organisation_members where organisation_id = p_org and user_id = p_user;
  select name into org_name from public.organisations where id = p_org;
  if p_user <> uid then
    perform public.notify(p_user, 'team', 'You were removed from an organisation’s team', org_name, '#workspace');
  end if;
  perform public.notify_org(p_org, 'team', case when p_user = uid then 'A team member left' else 'A team member was removed' end, org_name, '#org/details');
end $function$;
revoke all on function public.remove_org_member(uuid, uuid) from public, anon;
grant execute on function public.remove_org_member(uuid, uuid) to authenticated;

create or replace function public.transfer_org_ownership(p_org uuid, p_user uuid)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare uid uuid := auth.uid(); org_name text;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if public.is_suspended(uid) then raise exception 'Your account is suspended while Handova looks into a concern.'; end if;
  if not public.is_org_owner(p_org) then raise exception 'Only the owner can hand over ownership.'; end if;
  if p_user = uid or not exists (select 1 from public.organisation_members m where m.organisation_id = p_org and m.user_id = p_user) then
    raise exception 'Choose another member of the team.';
  end if;
  if public.is_suspended(p_user) then raise exception 'This person can’t become the owner at the moment. Write to hello@handova.org.'; end if;
  update public.organisation_members set role = 'member' where organisation_id = p_org and role = 'owner';
  update public.organisation_members set role = 'owner' where organisation_id = p_org and user_id = p_user;
  select name into org_name from public.organisations where id = p_org;
  perform public.notify(p_user, 'team', 'You are now the owner of an organisation on Handova', org_name, '#org/details');
  perform public.notify_admins('team', 'Organisation ownership transferred', org_name, '#admin-list/organisations');
end $function$;
revoke all on function public.transfer_org_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_org_ownership(uuid, uuid) to authenticated;
