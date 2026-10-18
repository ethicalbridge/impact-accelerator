-- First call after signing, safer Messages, and keeping the record.
-- * After both sign, Handova posts a suggested first-call agenda into the conversation and tells both parties.
-- * Either party can record the first call (or that they agreed in writing); the summary is posted to Messages.
-- * Messages stay open while a contribution is live.
-- * When someone deletes their account, their messages in conversations with a contribution or a report are kept
--   for six years, shown as "Former member".
-- * Daily reminders: no first call 7 days after signing; a message unanswered for 5 days.

alter table public.engagements add column if not exists first_call_at timestamptz;
alter table public.engagements add column if not exists first_call_by uuid references auth.users(id) on delete set null;
alter table public.engagements add column if not exists first_call_written boolean not null default false;

alter table public.messages add column if not exists kind text not null default 'user' check (kind in ('user', 'system', 'former'));
alter table public.messages add column if not exists sender_closed_at timestamptz;
alter table public.messages drop constraint if exists messages_sender_id_fkey;
alter table public.messages add constraint messages_sender_id_fkey foreign key (sender_id) references auth.users(id) on delete set null;

-- Handova's own messages (and kept messages) don't trigger "New message" alerts.
create or replace function public.message_notify()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare v record;
begin
  if new.kind <> 'user' then return new; end if;
  select c.*, n.title, n.organisation_id into v from public.conversations c join public.needs n on n.id = c.need_id where c.id = new.conversation_id;
  if new.sender_id = v.user_id then perform public.notify_org(v.organisation_id, 'message', 'New message', v.title, '#conversation/' || new.conversation_id);
  else perform public.notify(v.user_id, 'message', 'New message', v.title, '#conversation/' || new.conversation_id); end if;
  return new;
end $function$;

-- The conversation for a need and professional, opened if it doesn't exist yet.
create or replace function public.conversation_for(p_need uuid, p_user uuid)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare cid uuid;
begin
  select id into cid from public.conversations where need_id = p_need and user_id = p_user;
  if cid is null then
    insert into public.conversations (need_id, user_id) values (p_need, p_user) returning id into cid;
  else
    update public.conversations set status = 'open', closed_reason = '', closed_at = null where id = cid and status <> 'open';
  end if;
  return cid;
end $function$;
revoke all on function public.conversation_for(uuid, uuid) from public, anon, authenticated;

-- Messages stay open while the contribution is live.
create or replace function public.close_conversation(p_id uuid)
 returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if not public.is_conversation_party(p_id) then raise exception 'You are not part of this conversation.'; end if;
  if exists (select 1 from public.conversations c join public.engagements e on e.need_id = c.need_id and e.user_id = c.user_id
             where c.id = p_id and e.status in ('awaiting_signatures', 'active')) then
    raise exception 'While the contribution is live, Messages stay open. To stop the work, use End this contribution. If you feel unsafe, Report a concern.';
  end if;
  update public.conversations set status = 'closed', closed_reason = 'Ended by a participant', closed_at = now() where id = p_id;
end $function$;

-- Posted by Handova when both have signed.
create or replace function public.kickoff_message(p_id uuid, p_ref text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare e record; cid uuid; focal text; org text; body text;
begin
  select * into e from public.engagements where id = p_id;
  cid := public.conversation_for(e.need_id, e.user_id);
  org := coalesce(e.scope->>'organisation', 'the organisation');
  select nullif(trim(coalesce(focal_point_name, '') || case when coalesce(focal_point_contact, '') <> '' then ' (' || focal_point_contact || ')' else '' end), '')
    into focal from public.contribution_signatures where engagement_id = p_id and party = 'organisation';
  body := 'You have both signed. The next step is a short first call (30–45 minutes) to meet and plan the work. Reply here with two or three times that suit you, and say your time zone. Audio only is fine if data is limited.' || E'\n\n'
    || 'On the call, agree:' || E'\n'
    || '1. Goal: what the finished work looks like and how ' || org || ' will keep using it after handover.' || E'\n'
    || '2. Timing: the delivery date and any check-in dates.' || E'\n'
    || '3. Contact person: who at ' || org || ' answers questions and checks the work.' || E'\n'
    || '4. Reviews: how drafts are shared and checked, and who approves the final work.' || E'\n'
    || '5. Out of scope: what this contribution does not cover.' || E'\n'
    || '6. Keeping in touch: talk anywhere, but write decisions and changes here in Messages. Sharing phone numbers or personal emails is optional, and either of you can say no.' || E'\n'
    || '7. Information and access: what is needed, shared through a secure channel the organisation chooses, and when access ends. Never passwords or card details.' || E'\n'
    || '8. Safeguarding: ' || coalesce('the focal point is ' || focal, 'the organisation''s safeguarding focal point is named on the agreement page') || '. Agree how either of you raises a concern.' || E'\n\n'
    || 'Don''t record the call or use AI note-takers unless everyone agrees at the start, and don''t show anything about the people ' || org || ' supports. After the call, one of you taps "Record what we agreed" so you both have the same written record.';
  insert into public.messages (conversation_id, sender_id, body, kind) values (cid, null, left(body, 4000), 'system');
end $function$;
revoke all on function public.kickoff_message(uuid, text) from public, anon, authenticated;

-- Record the first call (or that everything was agreed in writing) and post the summary to Messages.
create or replace function public.record_first_call(p_id uuid, p_date date, p_written boolean, p_summary text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare e record; cid uuid; uid uuid := auth.uid();
begin
  select * into e from public.engagements where id = p_id for update;
  if e.id is null or not (e.user_id = uid or public.is_org_member(e.organisation_id)) then raise exception 'You are not a party to this contribution.'; end if;
  if e.status <> 'active' then raise exception 'You can record the first call once both have signed.'; end if;
  if length(trim(coalesce(p_summary, ''))) < 10 then raise exception 'Add a short summary of what you agreed.'; end if;
  cid := public.conversation_for(e.need_id, e.user_id);
  insert into public.messages (conversation_id, sender_id, body, kind) values (cid, uid, left(trim(p_summary), 4000), 'user');
  update public.engagements set first_call_at = coalesce(p_date::timestamptz, now()), first_call_by = uid, first_call_written = coalesce(p_written, false) where id = p_id;
end $function$;
revoke all on function public.record_first_call(uuid, date, boolean, text) from public, anon;
grant execute on function public.record_first_call(uuid, date, boolean, text) to authenticated;

-- Daily reminders.
create or replace function public.kickoff_reminders()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare n integer := 0; k integer;
begin
  -- No first call recorded a week after both signed (once per contribution).
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select x.uid, 'first_call_reminder', 'Have you had your first call yet?', e.scope->>'need_title', '#agreement/' || e.id, e.id
  from public.engagements e
  cross join lateral (select e.user_id as uid union select m.user_id from public.organisation_members m where m.organisation_id = e.organisation_id) x
  where e.status = 'active' and e.first_call_at is null and greatest(e.org_signed_at, e.talent_signed_at) < now() - interval '7 days'
    and x.uid is not null
    and not exists (select 1 from public.notifications r where r.kind = 'first_call_reminder' and r.ref = e.id and r.user_id = x.uid);
  get diagnostics k = row_count; n := n + k;
  -- A message unanswered for 5 days, in a live contribution (once per message).
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select x.uid, 'reply_reminder', 'Someone is waiting for your reply', nd.title, '#conversation/' || c.id, lm.id
  from public.conversations c
  join public.needs nd on nd.id = c.need_id
  join public.engagements e on e.need_id = c.need_id and e.user_id = c.user_id and e.status in ('awaiting_signatures', 'active')
  cross join lateral (select m.id, m.sender_id, m.created_at from public.messages m where m.conversation_id = c.id and m.kind = 'user' order by m.created_at desc limit 1) lm
  cross join lateral (
    select c.user_id as uid where lm.sender_id is distinct from c.user_id
    union select om.user_id from public.organisation_members om where om.organisation_id = nd.organisation_id and lm.sender_id = c.user_id
  ) x
  where c.status = 'open' and lm.created_at < now() - interval '5 days'
    and not exists (select 1 from public.notifications r where r.kind = 'reply_reminder' and r.ref = lm.id and r.user_id = x.uid);
  get diagnostics k = row_count; n := n + k;
  return n;
end $function$;
revoke all on function public.kickoff_reminders() from public, anon, authenticated;
select cron.schedule('handova-kickoff-reminders', '20 3 * * *', 'select public.kickoff_reminders()');

-- Signing: when both have signed, post the first-call agenda and point both parties to Messages.
create or replace function public.sign_engagement(p_id uuid, p_name text, p_text text, p_version text, p_lang text, p_confirmations jsonb,
  p_role text default null, p_focal_name text default null, p_focal_contact text default null)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare e record; s text; uid uuid := auth.uid(); hdrs json; h text; party text; idst text; idat timestamptz; needed text[];
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Type your full name to sign.'; end if;
  select * into e from public.engagements where id = p_id for update;
  if e.id is null then raise exception 'Agreement not found.'; end if;
  if e.status <> 'awaiting_signatures' then raise exception 'This agreement is no longer awaiting signatures.'; end if;
  if p_version is distinct from e.terms_version then raise exception 'This agreement has been updated. Reload the page and read it again.'; end if;
  if coalesce(p_text, '') = '' or position(coalesce(e.scope->>'need_title', '') in p_text) = 0 or position(e.terms_version in p_text) = 0 then
    raise exception 'The agreement text could not be confirmed. Reload the page and sign again.';
  end if;
  h := encode(sha256(convert_to(p_text, 'UTF8')), 'hex');
  hdrs := nullif(current_setting('request.headers', true), '')::json;

  if e.user_id = uid then
    party := 'professional';
    if e.talent_signed_at is not null then raise exception 'You have already signed.'; end if;
    select p.id_status into idst from public.profiles p where p.user_id = uid;
    if public.id_check_required() and idst is distinct from 'approved' then
      raise exception 'Please verify your identity before signing your first contribution agreement. You can do it from your profile in a few minutes.';
    end if;
    select max(v.updated_at) into idat from public.id_verifications v where v.user_id = uid and lower(v.status) = 'approved';
    needed := array['scope', 'confidentiality', 'read_all', 'no_conflict'];
  elsif public.is_org_member(e.organisation_id) then
    party := 'organisation';
    if e.org_signed_at is not null then raise exception 'Your organisation has already signed.'; end if;
    if length(trim(coalesce(p_role, ''))) < 2 then raise exception 'Add your role in the organisation.'; end if;
    if length(trim(coalesce(p_focal_name, ''))) < 2 or length(trim(coalesce(p_focal_contact, ''))) < 5 then
      raise exception 'Name the safeguarding focal point for this contribution and how to reach them.';
    end if;
    needed := array['scope', 'confidentiality', 'read_all', 'no_conflict', 'authority'];
  else
    raise exception 'You are not a party to this agreement.';
  end if;
  if exists (select 1 from unnest(needed) k where coalesce((p_confirmations->>k)::boolean, false) is not true) then
    raise exception 'Tick every confirmation to sign.';
  end if;

  insert into public.contribution_signatures (engagement_id, organisation_id, party, user_id, email, full_name, signer_role, focal_point_name, focal_point_contact,
    confirmations, version, agreement_text, text_sha256, language, ip, user_agent, id_status, id_verified_at)
  values (p_id, e.organisation_id, party, uid, coalesce((select email from auth.users where id = uid), ''), trim(p_name),
    nullif(trim(coalesce(p_role, '')), ''), nullif(trim(coalesce(p_focal_name, '')), ''), nullif(trim(coalesce(p_focal_contact, '')), ''),
    coalesce(p_confirmations, '{}'::jsonb), e.terms_version, p_text, h, left(coalesce(nullif(p_lang, ''), 'en'), 8),
    coalesce(trim(split_part(hdrs->>'x-forwarded-for', ',', 1)), ''), left(coalesce(hdrs->>'user-agent', ''), 400),
    case when party = 'professional' then idst end, idat);

  if party = 'professional' then
    update public.engagements set talent_signed_name = trim(p_name), talent_signed_at = now() where id = p_id;
    perform public.notify_org(e.organisation_id, 'signed', 'The professional signed the agreement', e.scope->>'need_title', '#agreement/' || p_id);
  else
    update public.engagements set org_signed_name = trim(p_name), org_signed_by = uid, org_signed_at = now() where id = p_id;
    perform public.notify(e.user_id, 'signed', 'The organisation signed the agreement', e.scope->>'need_title', '#agreement/' || p_id);
  end if;

  update public.engagements set status = 'active' where id = p_id and talent_signed_at is not null and org_signed_at is not null returning status into s;
  if s = 'active' then
    perform public.kickoff_message(p_id, left(h, 12));
    perform public.notify(e.user_id, 'agreement_active', 'Signed by both. Next: plan your first call',
      (e.scope->>'need_title') || '. Arrange a 30–45 minute call to meet and plan the work. A suggested agenda is in your Messages. Signed ' || to_char(now() at time zone 'UTC', 'DD Mon YYYY HH24:MI') || ' UTC · ' || e.terms_version || ' · reference ' || left(h, 12), '#conversation-for/' || e.need_id || '/' || e.user_id);
    perform public.notify_org(e.organisation_id, 'agreement_active', 'Signed by both. Next: plan your first call',
      (e.scope->>'need_title') || '. Arrange a 30–45 minute call to meet and plan the work. A suggested agenda is in your Messages. Signed ' || to_char(now() at time zone 'UTC', 'DD Mon YYYY HH24:MI') || ' UTC · ' || e.terms_version || ' · reference ' || left(h, 12), '#conversation-for/' || e.need_id || '/' || e.user_id);
  end if;
  return coalesce(s, 'awaiting_signatures');
end $function$;

-- Account deletion keeps messages that are part of a contribution or a report.
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
  return removed + more;
end $function$;
