-- Retention fixes from the 19 October 2026 audit.
-- 1. A professional deleting their account no longer deletes the conversations tied to a contribution or a report:
--    the conversation stays (the person shows as "Former member") and goes six years after its last message.
--    Application-only conversations still go with the account.
-- 2. Report reasons include sexual exploitation or abuse, and fraud (both agreements require reporting them).

alter table public.conversations alter column user_id drop not null;
alter table public.conversations drop constraint conversations_user_id_fkey,
  add constraint conversations_user_id_fkey foreign key (user_id) references public.profiles(user_id) on delete set null;

create or replace function public.delete_my_account()
 returns void language plpgsql security definer set search_path to ''
as $function$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
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
  -- Application chats with no contribution and no report go with the account; the others stay, with the person shown as "Former member".
  delete from public.conversations c where c.user_id = uid
    and not exists (select 1 from public.engagements e where e.need_id = c.need_id and e.user_id = c.user_id)
    and not exists (select 1 from public.reports r where r.target_type = 'conversation' and r.target_id = c.id);
  update public.organisations o set status = 'suspended'
    where exists (select 1 from public.organisation_members m where m.organisation_id = o.id and m.user_id = uid)
      and not exists (select 1 from public.organisation_members m where m.organisation_id = o.id and m.user_id <> uid);
  delete from auth.users where id = uid;
end $function$;

create or replace function public.purge_closed_account_signatures()
 returns bigint language plpgsql security definer set search_path to ''
as $function$
declare removed bigint; more bigint;
begin
  delete from public.agreement_signatures where account_closed_at is not null and account_closed_at + interval '6 years' <= now();
  get diagnostics removed = row_count;
  delete from public.contribution_signatures where account_closed_at is not null and account_closed_at + interval '6 years' <= now();
  get diagnostics more = row_count;
  removed := removed + more;
  delete from public.messages where kind = 'former' and sender_closed_at is not null and sender_closed_at + interval '6 years' <= now();
  get diagnostics more = row_count;
  removed := removed + more;
  -- Conversations kept after a professional left go six years after their last message.
  delete from public.conversations c where c.user_id is null
    and coalesce((select max(m.created_at) from public.messages m where m.conversation_id = c.id), c.created_at) + interval '6 years' <= now();
  get diagnostics more = row_count;
  return removed + more;
end $function$;

alter table public.reports drop constraint if exists reports_reason_check;
alter table public.reports add constraint reports_reason_check
  check (reason in ('safety', 'exploitation', 'harassment', 'fraud', 'misleading', 'privacy', 'spam', 'other'));
