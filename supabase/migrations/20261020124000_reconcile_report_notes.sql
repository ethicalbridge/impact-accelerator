-- Reconciles two fix-sprint changes (20 Oct 2026): Handova's internal note on a report now lives only in the
-- admin-only case record (20261020120100, L23), so resolving, reopening and listing reports (20261020121000) read and
-- write it there. The reports.admin_note column stays empty (report_note_guard).

create or replace function public.admin_resolve_report(p_id uuid, p_note text, p_tell text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare r record; note text := left(trim(coalesce(p_note, '')), 2000); tell text := left(trim(coalesce(p_tell, '')), 1000);
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  if length(note) < 10 then raise exception 'Write what was done, in at least 10 characters. Only Handova sees this note.'; end if;
  select * into r from public.reports where id = p_id for update;
  if r.id is null then raise exception 'Report not found.'; end if;
  insert into public.report_cases (report_id, admin_note, updated_at, updated_by) values (p_id, note, now(), auth.uid())
  on conflict (report_id) do update set admin_note = excluded.admin_note, updated_at = now(), updated_by = auth.uid();
  update public.reports set status = 'resolved', resolved_at = now(),
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

create or replace function public.admin_reopen_report(p_id uuid, p_reason text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare v_reason text := left(trim(coalesce(p_reason, '')), 600);
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  if length(v_reason) < 5 then raise exception 'Say briefly why it is reopened.'; end if;
  update public.reports set status = 'reviewing', resolved_at = null where id = p_id and status = 'resolved';
  if not found then raise exception 'Only a resolved report can be reopened.'; end if;
  insert into public.report_cases (report_id, admin_note, updated_at, updated_by)
  values (p_id, left('Reopened ' || to_char(now() at time zone 'UTC', 'DD Mon YYYY') || ': ' || v_reason, 2000), now(), auth.uid())
  on conflict (report_id) do update set admin_note = left('Reopened ' || to_char(now() at time zone 'UTC', 'DD Mon YYYY') || ': ' || v_reason
    || case when public.report_cases.admin_note <> '' then E'\n\nEarlier: ' || public.report_cases.admin_note else '' end, 2000),
    updated_at = now(), updated_by = auth.uid();
end $function$;

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
  select r.id, public.report_reference(r.id), r.target_type, r.target_id, r.reason, r.details, r.status, coalesce(c.admin_note, '')::text,
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
