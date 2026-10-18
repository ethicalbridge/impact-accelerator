-- Contribution agreements: keep proper evidence of who signed what, and when.
-- Each signature stores the exact text signed and its hash, the version, the language shown, each confirmation,
-- the signer's email, IP address and browser, and (for organisations) the signer's role and safeguarding focal point.
-- Records are kept for six years after an account closes, like the platform agreements.

alter table public.engagements alter column terms_version set default 'contribution-2026-10-v2';
alter table public.engagements add column if not exists end_reason text check (length(end_reason) <= 1000);
alter table public.engagements add column if not exists ended_at timestamptz;
alter table public.engagements add column if not exists ended_by uuid references auth.users(id) on delete set null;

create table if not exists public.contribution_signatures (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid references public.engagements(id) on delete set null,
  organisation_id uuid,
  party text not null check (party in ('organisation', 'professional')),
  user_id uuid references auth.users(id) on delete set null,
  email text not null default '',
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  signer_role text check (length(signer_role) <= 120),
  focal_point_name text check (length(focal_point_name) <= 120),
  focal_point_contact text check (length(focal_point_contact) <= 200),
  confirmations jsonb not null default '{}'::jsonb,
  version text not null,
  agreement_text text not null,
  text_sha256 text not null,
  language text not null default 'en',
  ip text not null default '',
  user_agent text not null default '',
  id_status text,
  id_verified_at timestamptz,
  signed_at timestamptz not null default now(),
  account_closed_at timestamptz,
  unique (engagement_id, party)
);
alter table public.contribution_signatures enable row level security;
drop policy if exists contribution_signatures_read on public.contribution_signatures;
create policy contribution_signatures_read on public.contribution_signatures for select using (
  user_id = auth.uid() or public.is_org_member(organisation_id) or public.is_admin()
);
revoke all on public.contribution_signatures from anon;
grant select on public.contribution_signatures to authenticated;

-- The frozen scope now also keeps the deadline and the professional's country.
create or replace function public.create_engagement(p_need uuid, p_user uuid)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare v uuid; n record; filled integer;
begin
  select * into n from public.needs where id = p_need for update;
  if n.status <> 'open' then raise exception 'This need is no longer open.'; end if;
  select count(*) into filled from public.engagements e where e.need_id = p_need and e.status <> 'ended';
  if filled >= n.places then raise exception 'All places on this need are already filled.'; end if;
  insert into public.engagements(need_id, organisation_id, user_id, terms_version, scope)
  select n.id, n.organisation_id, p.user_id, 'contribution-2026-10-v2', jsonb_build_object('need_title', n.title, 'description', n.description, 'output', n.output, 'skills', n.skills,
    'languages', n.languages, 'hours', n.hours, 'arrangement', n.arrangement, 'location', n.location, 'country', n.country,
    'deadline', n.deadline, 'organisation', o.name, 'organisation_country', o.country, 'talent', p.name, 'talent_country', p.country)
  from public.profiles p, public.organisations o where p.user_id = p_user and o.id = n.organisation_id
  returning id into v;
  if filled + 1 >= n.places then update public.needs set status = 'closed' where id = p_need; end if;
  perform public.notify(p_user, 'agreement', 'Sign your contribution agreement', n.title, '#agreement/' || v);
  perform public.notify_org(n.organisation_id, 'agreement', 'Sign your contribution agreement', n.title, '#agreement/' || v);
  return v;
end $function$;

-- Old two-argument signing: ask people to reload so they sign with the full record.
create or replace function public.sign_engagement(p_id uuid, p_name text)
 returns text language plpgsql security definer set search_path to ''
as $function$
begin
  raise exception 'Handova was updated. Please reload the page and sign again.';
end $function$;

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
    perform public.notify(e.user_id, 'agreement_active', 'Your contribution agreement is signed by both',
      (e.scope->>'need_title') || ' · ' || e.terms_version || ' · signed ' || to_char(now() at time zone 'UTC', 'DD Mon YYYY HH24:MI') || ' UTC · reference ' || left(h, 12), '#agreement/' || p_id);
    perform public.notify_org(e.organisation_id, 'agreement_active', 'Your contribution agreement is signed by both',
      (e.scope->>'need_title') || ' · ' || e.terms_version || ' · signed ' || to_char(now() at time zone 'UTC', 'DD Mon YYYY HH24:MI') || ' UTC · reference ' || left(h, 12), '#agreement/' || p_id);
  end if;
  return coalesce(s, 'awaiting_signatures');
end $function$;
revoke all on function public.sign_engagement(uuid, text, text, text, text, jsonb, text, text, text) from public, anon;
grant execute on function public.sign_engagement(uuid, text, text, text, text, jsonb, text, text, text) to authenticated;

-- Ending early: a reason is required and kept, with when and by whom.
create or replace function public.end_engagement(p_id uuid, p_reason text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare e record;
begin
  select * into e from public.engagements where id = p_id for update;
  if e.id is null or not (e.user_id = auth.uid() or public.is_org_member(e.organisation_id)) then raise exception 'You are not a party to this contribution.'; end if;
  if e.status not in ('awaiting_signatures', 'active') then raise exception 'This contribution has already finished.'; end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'Give a short reason for ending the contribution.'; end if;
  update public.engagements set status = 'ended', end_reason = left(trim(p_reason), 1000), ended_at = now(), ended_by = auth.uid() where id = p_id;
  update public.conversations set status = 'closed', closed_reason = 'Contribution ended', closed_at = now() where need_id = e.need_id and user_id = e.user_id;
  perform public.notify(e.user_id, 'ended', 'A contribution was ended', (e.scope->>'need_title') || ': ' || left(trim(p_reason), 300), '#workspace');
  perform public.notify_org(e.organisation_id, 'ended', 'A contribution was ended', (e.scope->>'need_title') || ': ' || left(trim(p_reason), 300), '#org');
end $function$;

-- Account deletion keeps the contribution signature records (marked closed) for six years.
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
  return removed + more;
end $function$;
revoke all on function public.purge_closed_account_signatures() from public, anon, authenticated;

-- When a need closes, pending invitations are closed too (they could not be accepted any more).
create or replace function public.need_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare adm boolean := public.is_admin();
begin
  if tg_op = 'UPDATE' then
    if new.organisation_id <> old.organisation_id then raise exception 'A need cannot move to another organisation.'; end if;
    if old.status in ('open', 'closed') and new.status in ('draft', 'pending') then raise exception 'Close a published need instead of returning it to draft.'; end if;
  end if;
  if new.status = 'open' and (tg_op = 'INSERT' or old.status <> 'open') then
    -- Only Handova opens a need, except reopening one it already approved.
    if not adm and not (tg_op = 'UPDATE' and old.status = 'closed' and old.approved_at is not null) then
      raise exception 'Send your need for review. Handova checks every need and opens it once it is approved.';
    end if;
    if not public.org_is_approved(new.organisation_id) then
      raise exception 'The organisation must be approved before its needs can open.';
    end if;
    if public.needs_in_use(new.organisation_id, new.id, false) >= 3 then
      raise exception 'An organisation can have up to 3 needs open or in progress at a time. Finish or close one first.';
    end if;
    if new.deadline is not null and new.deadline < current_date then raise exception 'Choose a deadline in the future.'; end if;
    new.approved_at := coalesce(new.approved_at, now());
    new.review_note := null;
  end if;
  -- When a need stops taking applications (closed by hand or because the places filled),
  -- everyone still waiting gets an answer instead of hanging.
  if tg_op = 'UPDATE' and old.status = 'open' and new.status = 'closed' then
    perform public.notify(a.user_id, 'application_decision', 'The need you applied to is closed',
      new.title || ': it is no longer taking applications. Thank you for applying.', '#workspace')
      from public.applications a where a.need_id = new.id and a.status = 'pending';
    update public.conversations c set status = 'closed', closed_reason = 'Need closed', closed_at = now()
      from public.applications a where a.need_id = new.id and a.status = 'pending' and c.need_id = new.id and c.user_id = a.user_id and c.status = 'open';
    update public.applications set status = 'declined', decided_at = now() where need_id = new.id and status = 'pending';
    -- Invitations nobody answered can no longer be accepted either.
    perform public.notify(i.user_id, 'invitation', 'An invitation is no longer open',
      new.title || ': this need is no longer taking anyone new. Thank you.', '#workspace')
      from public.invitations i where i.need_id = new.id and i.status = 'pending';
    update public.invitations set status = 'declined', decided_at = now() where need_id = new.id and status = 'pending';
  end if;
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status <> 'pending') then
    if public.needs_in_use(new.organisation_id, new.id, true) >= 3 then
      raise exception 'You already have 3 needs open, waiting for review or in progress. When one is finished or closed, you can send another.';
    end if;
    new.review_note := null;
    perform public.notify_admins('need_submitted', 'A need is waiting for review', new.title, '#admin');
  end if;
  -- A need Handova approved can't be edited: what professionals applied to must stay the same.
  -- To change it, the organisation stops applications and sends a corrected copy for review.
  if tg_op = 'UPDATE' and not adm and old.status in ('open', 'closed')
     and (new.title, new.description, new.output, new.skills, new.languages, new.hours, new.location, new.country, new.deadline, new.places, new.arrangement)
     is distinct from (old.title, old.description, old.output, old.skills, old.languages, old.hours, old.location, old.country, old.deadline, old.places, old.arrangement) then
    raise exception 'A live need can’t be edited. Stop applications and send a corrected copy for review.';
  end if;
  return new;
end $function$;
