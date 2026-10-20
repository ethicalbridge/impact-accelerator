-- Policy safety tools (20 Oct 2026), from the Handova policies v1.0:
-- 1. Safety questions on every need (Safeguarding Policy section 7), checked before a need goes for review.
-- 2. Conflict-of-interest declarations on applications and invitations (Code of Conduct, Fraud Policy).
-- 3. Recorded consent for the identity check, and a video-call alternative to Didit (Data Protection Policy).
-- 4. Admin safety tools: suspend a person, remove a person (and stop the same verified identity coming back),
--    freeze a conversation, take down a need, hide an impact CV entry, case records for reports.
-- 5. Integrity signals for admins: duplicate identities, shared sign-in addresses, inflated hours, retaliation.
-- 6. Admin two-step sign-in: once an admin has set up an authenticator app, admin access needs the code.

-- ---------- 1. Need safety questions ----------
alter table public.needs add column if not exists safeguarding jsonb not null default '{}'::jsonb;

create or replace function public.need_safety_guard()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare s jsonb := coalesce(new.safeguarding, '{}'::jsonb);
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status <> 'pending') and not public.is_admin() then
    if coalesce(s->>'remote', '') <> 'yes' or coalesce(s->>'no_contact', '') <> 'yes' or coalesce(s->>'no_child_images', '') <> 'yes' or coalesce(s->>'no_money', '') <> 'yes' then
      raise exception 'Confirm the safety questions before sending the need for review: all work is remote, no contact with the people you serve, no images of children, and no handling of your money.';
    end if;
    if coalesce(s->>'personal_data', '') not in ('none', 'exception') or coalesce(s->>'leak_risk', '') not in ('no', 'yes')
       or coalesce(s->>'distressing', '') not in ('no', 'yes') or coalesce(s->>'regulated', '') not in ('no', 'yes') then
      raise exception 'Answer every safety question before sending the need for review.';
    end if;
    if s->>'regulated' = 'yes' and length(trim(coalesce(s->>'regulated_note', ''))) < 10 then
      raise exception 'Say which qualification the regulated advice needs.';
    end if;
    new.no_vulnerable_contact := true;
  end if;
  return new;
end $function$;
revoke all on function public.need_safety_guard() from public, anon, authenticated;

-- The two explanations that could reveal sensitive details (which personal data, and the risk if leaked) are kept
-- apart from the public need: only the organisation's members and Handova admins can read them.
create table if not exists public.need_safety_notes (
  need_id uuid primary key references public.needs(id),
  personal_data_note text not null default '',
  leak_risk_note text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.need_safety_notes enable row level security;
create policy need_safety_notes_rw on public.need_safety_notes for all to authenticated
  using (public.is_admin() or exists (select 1 from public.needs n where n.id = need_id and public.is_org_member(n.organisation_id)))
  with check (exists (select 1 from public.needs n where n.id = need_id and public.is_org_member(n.organisation_id)));
create or replace trigger needs_safety_guard before insert or update on public.needs for each row execute function public.need_safety_guard();

-- ---------- 2. Conflict-of-interest declarations ----------
alter table public.applications add column if not exists conflict_note text not null default '';
alter table public.invitations add column if not exists conflict_note text not null default '';

-- ---------- 3. Identity check: recorded consent and the video-call alternative ----------
create table if not exists public.id_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  consented_at timestamptz not null default now(),
  wording text not null,
  notice_version text not null default ''
);
alter table public.id_consents enable row level security;
create policy id_consents_insert on public.id_consents for insert to authenticated with check (user_id = (select auth.uid()) and length(wording) between 20 and 2000);
create policy id_consents_read on public.id_consents for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

create table if not exists public.id_video_requests (
  user_id uuid primary key references auth.users(id),
  requested_at timestamptz not null default now(),
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'declined')),
  decided_at timestamptz,
  decided_by uuid
);
alter table public.id_video_requests enable row level security;
create policy id_video_requests_read on public.id_video_requests for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

create or replace function public.request_id_video_call()
 returns void language plpgsql security definer set search_path to ''
as $function$
declare uid uuid := auth.uid(); nm text;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  select p.name into nm from public.profiles p where p.user_id = uid;
  if nm is null then raise exception 'Create your profile first.'; end if;
  insert into public.id_video_requests(user_id) values (uid)
  on conflict (user_id) do update set requested_at = now(), status = 'requested', decided_at = null, decided_by = null;
  perform public.notify_admins('id_check', 'Video-call identity check requested', nm, '#admin');
  perform public.notify(uid, 'id_check', 'We received your request for a video call', 'Handova will email you to agree a time. On the call you show your passport or ID card on camera; we record only that your identity was confirmed.', '#workspace');
end $function$;
revoke all on function public.request_id_video_call() from public, anon;
grant execute on function public.request_id_video_call() to authenticated;

create or replace function public.admin_confirm_id_video(p_user uuid, p_document_name text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare nm text := left(trim(coalesce(p_document_name, '')), 160);
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  if length(nm) < 2 then raise exception 'Type the name exactly as it appears on the ID shown on the call.'; end if;
  update public.profiles set id_status = 'approved', id_verified_at = now(), id_document_name = nm where user_id = p_user;
  if not found then raise exception 'Profile not found.'; end if;
  insert into public.id_verifications(user_id, provider, session_id, status, document_name)
  values (p_user, 'video_call', 'video-' || gen_random_uuid()::text, 'approved', nm);
  update public.id_video_requests set status = 'confirmed', decided_at = now(), decided_by = auth.uid() where user_id = p_user;
  insert into public.admin_actions(admin_id, action, target_type, target_id, detail)
  values (auth.uid(), 'id_confirmed_video_call', 'profile', p_user, jsonb_build_object('name', nm));
  perform public.notify(p_user, 'id_check', 'Your identity is verified', 'Thank you for the video call. Your profile now shows “ID verified”.', '#workspace');
end $function$;
revoke all on function public.admin_confirm_id_video(uuid, text) from public, anon;
grant execute on function public.admin_confirm_id_video(uuid, text) to authenticated;

-- ---------- 4. Admin safety tools ----------
create table if not exists public.user_suspensions (
  user_id uuid primary key references auth.users(id),
  reason text not null,
  removed boolean not null default false,
  suspended_at timestamptz not null default now(),
  suspended_by uuid,
  lifted_at timestamptz
);
alter table public.user_suspensions enable row level security;
create policy user_suspensions_read on public.user_suspensions for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

create or replace function public.is_suspended(u uuid)
 returns boolean language sql stable security definer set search_path to ''
as $$ select exists (select 1 from public.user_suspensions s where s.user_id = u and s.lifted_at is null) $$;

-- A suspended person can't message, apply, accept or send invitations, log hours or sign.
create or replace function public.suspension_guard()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare u uuid := auth.uid();
begin
  if u is null or exists (select 1 from public.admins a where a.user_id = u) then return new; end if;
  if public.is_suspended(u) then
    raise exception 'Your account is suspended while Handova looks into a concern. Write to safeguarding@handova.org if you have questions.';
  end if;
  return new;
end $function$;
revoke all on function public.suspension_guard() from public, anon, authenticated;
create or replace trigger messages_suspension_guard before insert on public.messages for each row execute function public.suspension_guard();
create or replace trigger applications_suspension_guard before insert or update on public.applications for each row execute function public.suspension_guard();
create or replace trigger invitations_suspension_guard before insert or update on public.invitations for each row execute function public.suspension_guard();
create or replace trigger hours_suspension_guard before insert on public.hours for each row execute function public.suspension_guard();
create or replace trigger engagements_suspension_guard before update on public.engagements for each row
  when (old.talent_signed_at is null and new.talent_signed_at is not null or old.org_signed_at is null and new.org_signed_at is not null)
  execute function public.suspension_guard();

-- Removed identities: the same verified identity can't come back unnoticed.
create table if not exists public.removed_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  document_name_norm text not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);
alter table public.removed_identities enable row level security;
create policy removed_identities_read on public.removed_identities for select to authenticated using (public.is_admin());

create or replace function public.norm_name(t text)
 returns text language sql immutable set search_path to ''
as $$ select regexp_replace(lower(trim(coalesce(t, ''))), '\s+', ' ', 'g') $$;

create or replace function public.removed_identity_guard()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if new.id_status = 'approved' and (old.id_status is distinct from 'approved' or new.id_document_name is distinct from old.id_document_name)
     and coalesce(new.id_document_name, '') <> ''
     and exists (select 1 from public.removed_identities r where r.document_name_norm = public.norm_name(new.id_document_name) and r.user_id is distinct from new.user_id) then
    new.id_status := 'name_mismatch'; new.id_verified_at := null;
    perform public.notify_admins('id_check', 'Identity matches a removed account', new.name, '#admin');
  end if;
  return new;
end $function$;
revoke all on function public.removed_identity_guard() from public, anon, authenticated;
create or replace trigger profiles_removed_identity_guard before update on public.profiles for each row execute function public.removed_identity_guard();

create or replace function public.admin_suspend_user(p_user uuid, p_reason text, p_remove boolean default false)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare reason text := left(trim(coalesce(p_reason, '')), 1000); docname text;
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  if length(reason) < 5 then raise exception 'Give a short reason. It is kept in the activity log.'; end if;
  if exists (select 1 from public.admins a where a.user_id = p_user) then raise exception 'An admin account can’t be suspended here.'; end if;
  insert into public.user_suspensions(user_id, reason, removed, suspended_by) values (p_user, reason, coalesce(p_remove, false), auth.uid())
  on conflict (user_id) do update set reason = excluded.reason, removed = excluded.removed or public.user_suspensions.removed, suspended_at = now(), suspended_by = auth.uid(), lifted_at = null;
  update public.profiles set published = false where user_id = p_user and published;
  if coalesce(p_remove, false) then
    update public.engagements set public = false, hidden_by_handova = coalesce(hidden_by_handova, now()) where user_id = p_user and status = 'completed';
    select p.id_document_name into docname from public.profiles p where p.user_id = p_user;
    if coalesce(docname, '') <> '' then
      insert into public.removed_identities(user_id, document_name_norm, reason) values (p_user, public.norm_name(docname), reason);
    end if;
  end if;
  insert into public.admin_actions(admin_id, action, target_type, target_id, detail)
  values (auth.uid(), case when p_remove then 'person_removed' else 'person_suspended' end, 'profile', p_user, jsonb_build_object('reason', reason));
  perform public.notify(p_user, 'account', case when p_remove then 'Your Handova account has been closed' else 'Your Handova account is suspended' end,
    case when p_remove then 'Your account was closed after a breach of the Handova agreement. You can ask for a review within 30 days by writing to hello@handova.org.'
    else 'Your account is suspended while Handova looks into a concern. Your profile is offline and you can’t message, apply or sign for now. Write to safeguarding@handova.org with any questions.' end, '#workspace');
end $function$;
revoke all on function public.admin_suspend_user(uuid, text, boolean) from public, anon;
grant execute on function public.admin_suspend_user(uuid, text, boolean) to authenticated;

create or replace function public.admin_lift_suspension(p_user uuid, p_note text)
 returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  update public.user_suspensions set lifted_at = now() where user_id = p_user and lifted_at is null;
  if not found then raise exception 'This person is not suspended.'; end if;
  insert into public.admin_actions(admin_id, action, target_type, target_id, detail)
  values (auth.uid(), 'suspension_lifted', 'profile', p_user, jsonb_build_object('note', left(coalesce(p_note, ''), 1000)));
  perform public.notify(p_user, 'account', 'Your Handova account is active again', 'Thank you for your patience. You can publish your profile again from your workspace.', '#workspace');
end $function$;
revoke all on function public.admin_lift_suspension(uuid, text) from public, anon;
grant execute on function public.admin_lift_suspension(uuid, text) to authenticated;

-- Freeze a conversation: no new messages, the record stays.
create or replace function public.admin_set_conversation_frozen(p_id uuid, p_frozen boolean, p_reason text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare reason text := left(trim(coalesce(p_reason, '')), 500);
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  if p_frozen then
    if length(reason) < 5 then raise exception 'Give a short reason. It is kept in the activity log.'; end if;
    update public.conversations set status = 'closed', closed_reason = 'Paused by Handova', closed_at = now() where id = p_id;
  else
    update public.conversations set status = 'open', closed_reason = null, closed_at = null where id = p_id and closed_reason = 'Paused by Handova';
  end if;
  if not found then raise exception 'Conversation not found, or it was not paused by Handova.'; end if;
  insert into public.admin_actions(admin_id, action, target_type, target_id, detail)
  values (auth.uid(), case when p_frozen then 'conversation_frozen' else 'conversation_unfrozen' end, 'conversation', p_id, jsonb_build_object('reason', reason));
end $function$;
revoke all on function public.admin_set_conversation_frozen(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_conversation_frozen(uuid, boolean, text) to authenticated;

-- Take down a live need.
create or replace function public.admin_take_down_need(p_id uuid, p_reason text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare reason text := left(trim(coalesce(p_reason, '')), 1000); n record;
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  if length(reason) < 5 then raise exception 'Give a short reason. The organisation will see it.'; end if;
  select * into n from public.needs where id = p_id for update;
  if n.id is null then raise exception 'Need not found.'; end if;
  update public.needs set status = 'closed', review_note = 'Taken down by Handova: ' || reason where id = p_id;
  perform public.notify_org(n.organisation_id, 'need_decision', 'Handova took down a need', n.title || ': ' || left(reason, 300), '#org/needs');
  insert into public.admin_actions(admin_id, action, target_type, target_id, detail)
  values (auth.uid(), 'need_taken_down', 'need', p_id, jsonb_build_object('reason', reason, 'title', n.title));
end $function$;
revoke all on function public.admin_take_down_need(uuid, text) from public, anon;
grant execute on function public.admin_take_down_need(uuid, text) to authenticated;

-- Hide (or restore) an impact CV entry and its endorsement.
alter table public.engagements add column if not exists hidden_by_handova timestamptz;
create or replace function public.admin_hide_contribution(p_id uuid, p_hidden boolean, p_reason text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare reason text := left(trim(coalesce(p_reason, '')), 1000); e record;
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  if length(reason) < 5 then raise exception 'Give a short reason. It is kept in the activity log.'; end if;
  select * into e from public.engagements where id = p_id for update;
  if e.id is null then raise exception 'Contribution not found.'; end if;
  if p_hidden then
    update public.engagements set public = false, hidden_by_handova = now() where id = p_id;
    perform public.notify(e.user_id, 'cv', 'Handova has hidden an impact CV entry', (e.scope->>'need_title') || ': hidden while Handova looks into a concern.', '#workspace');
  else
    update public.engagements set hidden_by_handova = null where id = p_id;
    perform public.notify(e.user_id, 'cv', 'An impact CV entry is available again', (e.scope->>'need_title') || ': you can choose to show it on your impact CV again.', '#workspace');
  end if;
  insert into public.admin_actions(admin_id, action, target_type, target_id, detail)
  values (auth.uid(), case when p_hidden then 'cv_entry_hidden' else 'cv_entry_restored' end, 'engagement', p_id, jsonb_build_object('reason', reason));
end $function$;
revoke all on function public.admin_hide_contribution(uuid, boolean, text) from public, anon;
grant execute on function public.admin_hide_contribution(uuid, boolean, text) to authenticated;

create or replace function public.set_contribution_visibility(p_id uuid, p_public boolean)
 returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if p_public and exists (select 1 from public.engagements e where e.id = p_id and e.hidden_by_handova is not null) then
    raise exception 'Handova has hidden this entry while it looks into a concern. Write to safeguarding@handova.org if you have questions.';
  end if;
  update public.engagements set public = p_public, published_at = case when p_public then coalesce(published_at, now()) else null end
  where id = p_id and user_id = auth.uid() and status = 'completed';
  if not found then raise exception 'Only your own completed contributions can be published.'; end if;
end $function$;

-- Case records for reports (admins only; the reporter can't see them).
create table if not exists public.report_cases (
  report_id uuid primary key references public.reports(id),
  severity text not null default '' check (severity in ('', 'urgent', 'high', 'standard')),
  protective_actions text not null default '',
  informed text not null default '',
  referral text not null default '',
  wishes text not null default '',
  decision text not null default '',
  outcome text not null default '',
  child_case boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.report_cases enable row level security;
create policy report_cases_admin on public.report_cases for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- 5. Integrity signals for admins ----------
create or replace function public.admin_integrity_signals()
 returns table(kind text, title text, detail text, link text, seen_at timestamptz)
 language plpgsql stable security definer set search_path to ''
as $function$
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  -- The same verified identity on more than one account.
  return query
    select 'duplicate_identity', 'Same verified name on ' || count(*) || ' accounts', string_agg(p.name, ', '), '#admin-list/professionals', max(p.id_verified_at)
    from public.profiles p where p.id_status = 'approved' and coalesce(p.id_document_name, '') <> ''
    group by public.norm_name(p.id_document_name) having count(*) > 1;
  -- Both sides of a contribution signed from the same internet address.
  return query
    select 'shared_ip', 'Both sides signed from the same internet address', e.scope->>'need_title', '#agreement/' || e.id, max(cs.signed_at)
    from public.engagements e join public.contribution_signatures cs on cs.engagement_id = e.id
    where coalesce(cs.ip, '') <> ''
    group by e.id, e.scope having count(distinct cs.party) = 2 and count(distinct cs.ip) = 1;
  -- Approved hours above the agreed estimate, or several maximum-length days.
  return query
    select 'hours_over_estimate', 'Approved hours above the estimate', (e.scope->>'need_title') || ': ' || sum(h.hours) || ' of ' || coalesce(e.scope->>'hours', '?') || ' hours', '#agreement/' || e.id, max(h.reviewed_at)
    from public.engagements e join public.hours h on h.engagement_id = e.id and h.status = 'approved'
    group by e.id, e.scope having sum(h.hours) > coalesce(nullif(e.scope->>'hours', '')::numeric, 16);
  return query
    select 'long_days', 'Three or more 12-hour days', e.scope->>'need_title', '#agreement/' || e.id, max(h.created_at)
    from public.engagements e join public.hours h on h.engagement_id = e.id
    where h.hours >= 12 group by e.id, e.scope having count(*) >= 3;
  -- Possible retaliation: after a professional reports a concern about a contribution, the organisation ends it,
  -- declines hours or answers "no" to working together again.
  return query
    select 'retaliation', 'Organisation action after a report by the professional', (e.scope->>'need_title') || ' · reported ' || to_char(r.created_at, 'DD Mon YYYY'), '#agreement/' || e.id, r.created_at
    from public.reports r
    join public.engagements e on e.user_id = r.reporter_id and (r.target_id = e.id or r.target_id = e.organisation_id or r.target_id = e.need_id
      or r.target_id in (select c.id from public.conversations c where c.need_id = e.need_id and c.user_id = e.user_id))
    where (e.ended_at > r.created_at and e.ended_by is distinct from e.user_id)
       or exists (select 1 from public.hours h where h.engagement_id = e.id and h.status in ('rejected', 'changes_requested') and h.reviewed_at > r.created_at)
       or exists (select 1 from public.completion_private cp where cp.engagement_id = e.id and cp.work_again = 'no' and cp.created_at > r.created_at);
  -- A verified identity matching a removed account.
  return query
    select 'removed_identity', 'Identity matches a removed account', p.name, '#profile/' || p.user_id, p.updated_at
    from public.profiles p join public.removed_identities ri on ri.document_name_norm = public.norm_name(p.id_document_name) and ri.user_id is distinct from p.user_id
    where coalesce(p.id_document_name, '') <> '';
end $function$;
revoke all on function public.admin_integrity_signals() from public, anon;
grant execute on function public.admin_integrity_signals() to authenticated;

-- ---------- 6. Admin two-step sign-in ----------
-- Once an admin has a verified authenticator app, admin access needs a session signed in with the code (aal2).
create or replace function public.is_admin()
 returns boolean language sql stable security definer set search_path to ''
as $function$
  select exists (select 1 from public.admins a where a.user_id = auth.uid())
    and (coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
         or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'));
$function$;
