-- Re-audit 20 Oct 2026: L23, A18 (server part), O12 (server part).

-- ---------- L23: Handova's internal note on a report lives in the admin-only case record ----------
-- The reporter can read their own report row, so the note moves to report_cases (admins only), and the old column
-- is always kept empty.
alter table public.report_cases add column if not exists admin_note text not null default '';

insert into public.report_cases (report_id, admin_note)
select r.id, r.admin_note from public.reports r where coalesce(r.admin_note, '') <> ''
on conflict (report_id) do update set admin_note = excluded.admin_note;
update public.reports set admin_note = '' where coalesce(admin_note, '') <> '';

create or replace function public.report_note_guard()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  new.admin_note := '';
  return new;
end $function$;
revoke all on function public.report_note_guard() from public, anon, authenticated;
create or replace trigger reports_note_guard before insert or update on public.reports for each row execute function public.report_note_guard();

-- Status changes keep the note; a new note (for example the outcome when resolving) replaces it in the case record.
create or replace function public.admin_update_report(p_id uuid, p_status text, p_note text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare note text := left(trim(coalesce(p_note, '')), 2000);
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  if not exists (select 1 from public.reports where id = p_id) then raise exception 'Report not found.'; end if;
  -- The note first, so the activity log entry written by the status change below includes it.
  if note <> '' then
    insert into public.report_cases (report_id, admin_note, updated_at, updated_by) values (p_id, note, now(), auth.uid())
    on conflict (report_id) do update set admin_note = excluded.admin_note, updated_at = now(), updated_by = auth.uid();
  end if;
  update public.reports set status = p_status, resolved_at = case when p_status = 'resolved' then now() else null end where id = p_id;
end $function$;
revoke all on function public.admin_update_report(uuid, text, text) from public, anon;
grant execute on function public.admin_update_report(uuid, text, text) to authenticated;

-- The activity log takes the note from the case record (same function as before, only the report note changed).
create or replace function public.log_admin_change()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare a uuid := auth.uid();
begin
  if a is null or not exists (select 1 from public.admins ad where ad.user_id = a) then return new; end if;
  if tg_table_name = 'profiles' then
    if new.review_status is distinct from old.review_status then
      insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
      values (a, 'profile_' || new.review_status::text, 'profile', new.user_id, jsonb_build_object('from', old.review_status::text, 'to', new.review_status::text, 'name', new.name));
    end if;
    if new.id_status is distinct from old.id_status then
      insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
      values (a, 'identity_' || coalesce(new.id_status::text, 'none'), 'profile', new.user_id, jsonb_build_object('from', old.id_status::text, 'to', new.id_status::text, 'name', new.name));
    end if;
  elsif tg_table_name = 'needs' then
    if new.status is distinct from old.status then
      insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
      values (a, 'need_' || new.status::text, 'need', new.id, jsonb_build_object('from', old.status::text, 'to', new.status::text, 'title', new.title, 'note', new.review_note));
    end if;
  elsif tg_table_name = 'reports' then
    if new.status is distinct from old.status then
      insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
      values (a, 'report_' || new.status, 'report', new.id, jsonb_build_object('from', old.status, 'to', new.status, 'reason', new.reason,
        'note', coalesce((select rc.admin_note from public.report_cases rc where rc.report_id = new.id), '')));
    end if;
  end if;
  return new;
end $function$;
revoke all on function public.log_admin_change() from public, anon, authenticated;

-- Admins can also write the note from the case record form.
grant insert (admin_note), update (admin_note) on public.report_cases to authenticated;

-- ---------- A18: a safety or safeguarding report is urgent, like exploitation ----------
create or replace function public.report_notify()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  new.reporter_id = auth.uid();
  perform public.notify_admins('report',
    case new.reason
      when 'exploitation' then 'Urgent: sexual exploitation or abuse reported'
      when 'safety' then 'Urgent: safety or safeguarding concern reported'
      else 'New concern reported' end,
    new.reason || ' · ' || new.target_type, '#admin');
  if new.reporter_id is not null then
    perform public.notify(new.reporter_id, 'report_received', 'We received your report',
      'Thank you. Our safeguarding lead reads every report and will contact you if we need more information. Reference ' || upper(left(new.id::text, 8)) || '.', '#report');
  end if;
  return new;
end $function$;
revoke all on function public.report_notify() from public, anon, authenticated;

-- ---------- O12: a declared conflict of interest reaches Handova ----------
-- The in-app alert carries the declaration; the email only says there is one (notify-email keeps this text private).
create or replace function public.conflict_notify()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare t text; nm text;
begin
  if length(trim(coalesce(new.conflict_note, ''))) = 0 then return new; end if;
  select n.title into t from public.needs n where n.id = new.need_id;
  select p.name into nm from public.profiles p where p.user_id = new.user_id;
  perform public.notify_admins('conflict_declared', 'Declared link: ' || coalesce(t, 'a need'),
    case when tg_table_name = 'applications' then 'Application from ' else 'Invitation to ' end
      || coalesce(nm, 'a professional') || ': ' || left(trim(new.conflict_note), 500),
    '#admin');
  return new;
end $function$;
revoke all on function public.conflict_notify() from public, anon, authenticated;
create or replace trigger applications_conflict_notify after insert on public.applications for each row
  when (length(trim(coalesce(new.conflict_note, ''))) > 0) execute function public.conflict_notify();
create or replace trigger invitations_conflict_notify after insert on public.invitations for each row
  when (length(trim(coalesce(new.conflict_note, ''))) > 0) execute function public.conflict_notify();
