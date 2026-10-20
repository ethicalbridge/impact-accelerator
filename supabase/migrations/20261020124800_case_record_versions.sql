-- Case records keep their history (audit 20 Oct 2026: A22).
-- Every save goes through admin_save_case(): the previous version is copied to report_case_versions (read-only,
-- admins only) and the save is written to the Activity log as "case record updated" with the report's reference.
-- Admins can no longer write report_cases directly, so no save can skip the history.
-- Versions go with their case record (on delete cascade), so the retention job removes them together.

create table if not exists public.report_case_versions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.report_cases(report_id) on delete cascade,
  severity text not null default '',
  protective_actions text not null default '',
  informed text not null default '',
  referral text not null default '',
  wishes text not null default '',
  decision text not null default '',
  outcome text not null default '',
  child_case boolean not null default false,
  saved_at timestamptz,
  saved_by uuid,
  replaced_at timestamptz not null default now(),
  replaced_by uuid
);
create index if not exists report_case_versions_report_idx on public.report_case_versions (report_id, replaced_at desc);
alter table public.report_case_versions enable row level security;
drop policy if exists report_case_versions_read on public.report_case_versions;
create policy report_case_versions_read on public.report_case_versions for select to authenticated using (public.is_admin());
revoke all on public.report_case_versions from anon, authenticated;
grant select on public.report_case_versions to authenticated;

revoke insert, update, delete, truncate on public.report_cases from anon, authenticated;
grant select on public.report_cases to authenticated;

create or replace function public.admin_save_case(p_report uuid, p_severity text, p_child_case boolean, p_protective_actions text,
  p_informed text, p_referral text, p_wishes text, p_decision text, p_outcome text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare old public.report_cases; sev text := coalesce(p_severity, '');
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  if sev not in ('', 'urgent', 'high', 'standard') then raise exception 'Choose a severity.'; end if;
  if not exists (select 1 from public.reports r where r.id = p_report) then raise exception 'Report not found.'; end if;
  select * into old from public.report_cases where report_id = p_report for update;
  if old.report_id is not null then
    if (old.severity, old.child_case, old.protective_actions, old.informed, old.referral, old.wishes, old.decision, old.outcome)
       is not distinct from (sev, coalesce(p_child_case, false), left(coalesce(p_protective_actions, ''), 2000), left(coalesce(p_informed, ''), 2000),
         left(coalesce(p_referral, ''), 2000), left(coalesce(p_wishes, ''), 2000), left(coalesce(p_decision, ''), 2000), left(coalesce(p_outcome, ''), 2000)) then
      return; -- nothing changed
    end if;
    insert into public.report_case_versions (report_id, severity, protective_actions, informed, referral, wishes, decision, outcome, child_case, saved_at, saved_by, replaced_by)
    values (old.report_id, old.severity, old.protective_actions, old.informed, old.referral, old.wishes, old.decision, old.outcome, old.child_case, old.updated_at, old.updated_by, auth.uid());
  end if;
  insert into public.report_cases (report_id, severity, child_case, protective_actions, informed, referral, wishes, decision, outcome, updated_at, updated_by)
  values (p_report, sev, coalesce(p_child_case, false), left(coalesce(p_protective_actions, ''), 2000), left(coalesce(p_informed, ''), 2000),
    left(coalesce(p_referral, ''), 2000), left(coalesce(p_wishes, ''), 2000), left(coalesce(p_decision, ''), 2000), left(coalesce(p_outcome, ''), 2000), now(), auth.uid())
  on conflict (report_id) do update set severity = excluded.severity, child_case = excluded.child_case, protective_actions = excluded.protective_actions,
    informed = excluded.informed, referral = excluded.referral, wishes = excluded.wishes, decision = excluded.decision, outcome = excluded.outcome,
    updated_at = excluded.updated_at, updated_by = excluded.updated_by;
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
  values (auth.uid(), 'case_record_updated', 'report', p_report, jsonb_build_object('reference', public.report_reference(p_report), 'severity', sev,
    'child_case', coalesce(p_child_case, false), 'first_save', old.report_id is null));
end $function$;
revoke all on function public.admin_save_case(uuid, text, boolean, text, text, text, text, text, text) from public, anon;
grant execute on function public.admin_save_case(uuid, text, boolean, text, text, text, text, text, text) to authenticated;
