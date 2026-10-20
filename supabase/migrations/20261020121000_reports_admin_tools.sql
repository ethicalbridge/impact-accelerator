-- Reports in Admin (audit 20 Oct 2026: A16, A17, A12, D21).
-- 1. Every report has the reference the reporter was given: the first 8 characters of its id, in capitals
--    (report_notify sends "Reference XXXXXXXX", and the report form shows the same).
-- 2. admin_reports(): every report, open or closed, with its reference, the reporter's name and email (admins only;
--    blank means anonymous), and the case severity. The reporter's own copy of the row never shows another person.
-- 3. Reports Handova receives by email (or spots in a questionnaire answer) are recorded as ordinary report rows,
--    marked source = 'email' or 'questionnaire'. We chose a report row rather than a case without a report so that
--    one list, one reference format, one retention rule (6 years after closure, child cases kept) and the same
--    protective buttons work for every concern, whatever way it arrived. The outside reporter's name and email are
--    kept on the row (they have no Handova account).
-- 4. admin_resolve_report(): resolve with the internal note, and optionally tell the reporter the outcome in a
--    short notification (emailed to them). admin_reopen_report(): reopen on appeal, keeping the earlier note.

alter table public.reports add column if not exists source text not null default 'platform';
alter table public.reports add column if not exists source_ref uuid;
alter table public.reports add column if not exists reporter_name text not null default '';
alter table public.reports add column if not exists reporter_email text not null default '';
alter table public.reports add column if not exists outcome_message text not null default '';
alter table public.reports add column if not exists outcome_sent_at timestamptz;
do $$ begin
  alter table public.reports add constraint reports_source_check check (source in ('platform', 'email', 'questionnaire'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.reports add constraint reports_reporter_contact_check check (length(reporter_name) <= 160 and length(reporter_email) <= 254 and length(outcome_message) <= 1000);
exception when duplicate_object then null; end $$;
create index if not exists reports_source_ref_idx on public.reports (source_ref) where source_ref is not null;
-- Members still insert only target_type, target_id, reason and details (the new columns are written by admin functions).

create or replace function public.report_reference(p_id uuid)
 returns text language sql immutable set search_path to ''
as $$ select upper(left(p_id::text, 8)) $$;

create or replace function public.admin_reports()
 returns table(id uuid, reference text, target_type text, target_id uuid, reason text, details text, status text, admin_note text,
   created_at timestamptz, resolved_at timestamptz, source text, source_ref uuid, reporter_id uuid, reporter_name text, reporter_email text,
   severity text, child_case boolean, case_updated_at timestamptz, outcome_message text, outcome_sent_at timestamptz)
 language plpgsql stable security definer set search_path to ''
as $function$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  return query
  select r.id, public.report_reference(r.id), r.target_type, r.target_id, r.reason, r.details, r.status, r.admin_note,
    r.created_at, r.resolved_at, r.source, r.source_ref, r.reporter_id,
    coalesce(nullif(r.reporter_name, ''), p.name,
      (select m.full_name from public.organisation_members m where m.user_id = r.reporter_id and coalesce(m.full_name, '') <> '' limit 1),
      nullif(u.raw_user_meta_data->>'full_name', ''), '')::text,
    coalesce(nullif(r.reporter_email, ''), u.email::text, '')::text,
    coalesce(c.severity, '')::text, coalesce(c.child_case, false), c.updated_at, r.outcome_message, r.outcome_sent_at
  from public.reports r
  left join auth.users u on u.id = r.reporter_id
  left join public.profiles p on p.user_id = r.reporter_id
  left join public.report_cases c on c.report_id = r.id
  order by r.created_at desc;
end $function$;
revoke all on function public.admin_reports() from public, anon;
grant execute on function public.admin_reports() to authenticated;

-- Record a report Handova received outside the site (by email), or a concern from a questionnaire answer.
-- The reports trigger records the signed-in person as the reporter and sends them a receipt; here the reporter is
-- not the admin, so the insert runs with the signed-in user cleared for that one statement (then restored).
create or replace function public.admin_record_report(p_source text, p_reason text, p_target_type text, p_target_id uuid, p_details text,
  p_reporter_name text, p_reporter_email text, p_received date, p_source_ref uuid)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare
  me uuid := auth.uid();
  old_claims text := current_setting('request.jwt.claims', true);
  old_sub text := current_setting('request.jwt.claim.sub', true);
  rid uuid := gen_random_uuid();
  src text := coalesce(nullif(trim(p_source), ''), 'email');
  tt text := coalesce(nullif(trim(p_target_type), ''), 'other');
  d text := trim(coalesce(p_details, ''));
  em text := lower(trim(coalesce(p_reporter_email, '')));
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  if src not in ('email', 'questionnaire') then raise exception 'Choose where the report came from.'; end if;
  if length(d) < 10 then raise exception 'Describe the concern in at least 10 characters.'; end if;
  if em <> '' and em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Check the reporter’s email address.'; end if;
  if p_received is not null and p_received > current_date then raise exception 'The date received can’t be in the future.'; end if;
  if p_source_ref is not null and exists (select 1 from public.reports r where r.source_ref = p_source_ref) then
    raise exception 'A case is already open for this answer. Find it in Admin › Reports.';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  insert into public.reports (id, target_type, target_id, reason, details, source, source_ref, reporter_name, reporter_email, created_at)
  values (rid, tt, case when tt = 'other' then null else p_target_id end, p_reason, left(d, 4000), src, p_source_ref,
    left(trim(coalesce(p_reporter_name, '')), 160), left(em, 254),
    case when p_received is null or p_received >= current_date then now() else p_received::timestamptz + interval '12 hours' end);
  perform set_config('request.jwt.claim.sub', coalesce(old_sub, ''), true);
  perform set_config('request.jwt.claims', coalesce(old_claims, ''), true);
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
  values (me, 'report_recorded', 'report', rid, jsonb_build_object('reference', public.report_reference(rid), 'source', src, 'reason', p_reason));
  return public.report_reference(rid);
end $function$;
revoke all on function public.admin_record_report(text, text, text, uuid, text, text, text, date, uuid) from public, anon;
grant execute on function public.admin_record_report(text, text, text, uuid, text, text, text, date, uuid) to authenticated;

-- Resolve a report. The note is internal; p_tell (optional) is sent to the reporter as a short notification.
create or replace function public.admin_resolve_report(p_id uuid, p_note text, p_tell text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare r record; note text := left(trim(coalesce(p_note, '')), 2000); tell text := left(trim(coalesce(p_tell, '')), 1000);
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  if length(note) < 10 then raise exception 'Write what was done, in at least 10 characters. Only Handova sees this note.'; end if;
  select * into r from public.reports where id = p_id for update;
  if r.id is null then raise exception 'Report not found.'; end if;
  update public.reports set status = 'resolved', admin_note = note, resolved_at = now(),
    outcome_message = case when tell <> '' then tell else outcome_message end,
    outcome_sent_at = case when tell <> '' and r.reporter_id is not null then now() else outcome_sent_at end
  where id = p_id;
  if tell <> '' and r.reporter_id is not null then
    perform public.notify(r.reporter_id, 'report_outcome', 'An update on the concern you reported',
      'Reference ' || public.report_reference(r.id) || '. ' || tell, '#report');
    insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), 'reporter_told', 'report', r.id, jsonb_build_object('reference', public.report_reference(r.id), 'note', tell));
  end if;
end $function$;
revoke all on function public.admin_resolve_report(uuid, text, text) from public, anon;
grant execute on function public.admin_resolve_report(uuid, text, text) to authenticated;

-- Reopen a resolved report (an appeal, or new information). The earlier note is kept below the reason.
create or replace function public.admin_reopen_report(p_id uuid, p_reason text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare v_reason text := left(trim(coalesce(p_reason, '')), 600);
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  if length(v_reason) < 5 then raise exception 'Say briefly why it is reopened.'; end if;
  update public.reports set status = 'reviewing', resolved_at = null,
    admin_note = left('Reopened ' || to_char(now() at time zone 'UTC', 'DD Mon YYYY') || ': ' || v_reason || case when admin_note <> '' then E'\n\nEarlier: ' || admin_note else '' end, 2000)
  where id = p_id and status = 'resolved';
  if not found then raise exception 'Only a resolved report can be reopened.'; end if;
end $function$;
revoke all on function public.admin_reopen_report(uuid, text) from public, anon;
grant execute on function public.admin_reopen_report(uuid, text) to authenticated;
