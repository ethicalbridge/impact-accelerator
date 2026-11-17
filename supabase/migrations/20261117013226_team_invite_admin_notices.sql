-- Team notifications for admins say who invited whom (17 Nov 2026). Before, "Team member invited" only named the
-- organisation and opened the organisations list. Now it names the person who invited and the email invited, and opens
-- the organisation; admins are also told when the invitation is accepted or declined. Existing invite notifications
-- are filled in from the invitations table.

create or replace function public.invite_org_member(p_org uuid, p_email text)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare
  uid uuid := auth.uid();
  em text := lower(trim(coalesce(p_email, '')));
  org record; target uuid; used int; inviter text;
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
  -- Admins see who invited whom, and the link opens the organisation (17 Nov 2026).
  select coalesce(nullif(m.full_name, ''), u.email) into inviter
    from auth.users u left join public.organisation_members m on m.user_id = u.id and m.organisation_id = p_org where u.id = uid;
  perform public.notify_admins('team', 'Team member invited', org.name || ': ' || coalesce(inviter, 'the owner') || ' invited ' || em || '. Waiting for them to accept.', '#admin-org/' || p_org);
  return 'invited';
end $function$;
revoke all on function public.invite_org_member(uuid, text) from public, anon;
grant execute on function public.invite_org_member(uuid, text) to authenticated;

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
    perform public.notify_admins('team', 'Team invitation declined', inv.name || ': ' || em || ' declined the invitation.', '#admin-org/' || inv.organisation_id);
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
  perform public.notify_admins('team', 'Team member joined', inv.name || ': ' || coalesce(nullif(nm, ''), em) || ' (' || em || ') accepted the invitation and joined the team.', '#admin-org/' || inv.organisation_id);
end $function$;
revoke all on function public.respond_org_invite(uuid, boolean) from public, anon;
grant execute on function public.respond_org_invite(uuid, boolean) to authenticated;

-- Fill in the admin notifications already sent, matched to their invitation by organisation and time.
update public.notifications n
   set body = o.name || ': ' || coalesce(nullif(m.full_name, ''), u.email, 'the owner') || ' invited ' || i.email || '.',
       link = '#admin-org/' || i.organisation_id
  from public.org_member_invites i
  join public.organisations o on o.id = i.organisation_id
  left join auth.users u on u.id = i.invited_by
  left join public.organisation_members m on m.user_id = i.invited_by and m.organisation_id = i.organisation_id
 where n.kind = 'team' and n.title = 'Team member invited' and n.body = o.name
   and abs(extract(epoch from (n.created_at - i.created_at))) < 5;
