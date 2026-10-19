-- Account deletion guard (19 October 2026), the server-side half of 20261019001100:
-- delete_my_account refuses while account_deletion_blocker() gives a reason, and Handova is told when an organisation
-- is left with nobody managing it (it is still suspended, as before).
-- Same body as the live function otherwise. 20261019000600_conversation_retention.sql carries the same two additions.

create or replace function public.delete_my_account()
 returns void language plpgsql security definer set search_path to ''
as $function$
declare uid uuid := auth.uid(); blocker text; o record;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  blocker := public.account_deletion_blocker();
  if blocker is not null then raise exception '%', blocker; end if;
  if not exists (
    select 1 from public.account_deletion_authorizations a
    where a.user_id = uid and a.verified_at > now() - interval '5 minutes'
  ) then
    raise exception 'Please use Account and privacy to delete your account.';
  end if;
  delete from public.account_deletion_authorizations where user_id = uid;

  update public.agreement_signatures set account_closed_at = now() where user_id = uid and account_closed_at is null;
  update public.contribution_signatures set account_closed_at = now() where user_id = uid and account_closed_at is null;
  update public.engagements
    set scope = jsonb_set(scope, '{talent}', '"Former member"'),
        talent_signed_name = case when talent_signed_name <> '' then 'Former member' else '' end,
        public = false
    where user_id = uid;
  -- Messages in conversations with a contribution or a report are kept for six years, shown as "Former member".
  update public.messages m set kind = 'former', sender_closed_at = now(), sender_id = null
    where m.sender_id = uid and (
      exists (select 1 from public.conversations c join public.engagements e on e.need_id = c.need_id and e.user_id = c.user_id where c.id = m.conversation_id)
      or exists (select 1 from public.reports r where r.target_type = 'conversation' and r.target_id = m.conversation_id));
  delete from public.messages where sender_id = uid;
  -- An organisation left with nobody is suspended, and Handova is told so it can follow up.
  for o in select org.id, org.name from public.organisations org
    where exists (select 1 from public.organisation_members m where m.organisation_id = org.id and m.user_id = uid)
      and not exists (select 1 from public.organisation_members m where m.organisation_id = org.id and m.user_id <> uid)
  loop
    update public.organisations set status = 'suspended' where id = o.id;
    perform public.notify_admins('org_without_member', 'An organisation no longer has anyone managing it', o.name || ': its only member deleted their account, so it was suspended.', '#admin-list/organisations');
  end loop;
  delete from auth.users where id = uid;
end $function$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
