-- Integrity signals can be marked "Checked, nothing wrong" (audit 20 Oct 2026: A23).
-- Each signal gets a key made from its kind, link and detail. A checked signal stays hidden until something new
-- happens: a newer event (its seen_at is later than the check) or a changed detail (for example more approved hours,
-- or another account with the same verified name), which gives it a new key. Each check is written to the Activity log.
-- integrity_signals_all() is the previous admin_integrity_signals() body, unchanged; admin_integrity_signals() now
-- returns its rows with a signal_key, minus the ones checked since their last event.

create table if not exists public.integrity_signal_checks (
  signal_key text primary key,
  kind text not null default '',
  title text not null default '',
  detail text not null default '',
  note text not null default '' check (length(note) <= 600),
  checked_at timestamptz not null default now(),
  checked_by uuid
);
alter table public.integrity_signal_checks enable row level security;
drop policy if exists integrity_signal_checks_read on public.integrity_signal_checks;
create policy integrity_signal_checks_read on public.integrity_signal_checks for select to authenticated using (public.is_admin());
revoke all on public.integrity_signal_checks from anon, authenticated;
grant select on public.integrity_signal_checks to authenticated;

create or replace function public.integrity_signals_all()
 returns table(kind text, title text, detail text, link text, seen_at timestamptz)
 language plpgsql stable security definer set search_path to ''
as $function$
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  return query
    select 'duplicate_identity'::text, ('Same verified name on ' || count(*) || ' accounts')::text, string_agg(p.name, ', ')::text, '#admin-list/professionals'::text, max(p.id_verified_at)
    from public.profiles p where p.id_status = 'approved' and coalesce(p.id_document_name, '') <> ''
    group by public.norm_name(p.id_document_name) having count(*) > 1;
  return query
    select 'shared_ip'::text, 'Both sides signed from the same internet address'::text, (e.scope->>'need_title')::text, ('#agreement/' || e.id)::text, max(cs.signed_at)
    from public.engagements e join public.contribution_signatures cs on cs.engagement_id = e.id
    where coalesce(cs.ip, '') <> ''
    group by e.id, e.scope having count(distinct cs.party) = 2 and count(distinct cs.ip) = 1;
  return query
    select 'hours_over_estimate'::text, 'Approved hours above the estimate'::text, ((e.scope->>'need_title') || ': ' || sum(h.hours) || ' of ' || coalesce(e.scope->>'hours', '?') || ' hours')::text, ('#agreement/' || e.id)::text, max(h.reviewed_at)
    from public.engagements e join public.hours h on h.engagement_id = e.id and h.status = 'approved'
    group by e.id, e.scope having sum(h.hours) > coalesce(nullif(e.scope->>'hours', '')::numeric, 16);
  return query
    select 'long_days'::text, 'Three or more 12-hour days'::text, (e.scope->>'need_title')::text, ('#agreement/' || e.id)::text, max(h.created_at)
    from public.engagements e join public.hours h on h.engagement_id = e.id
    where h.hours >= 12 group by e.id, e.scope having count(*) >= 3;
  return query
    select 'retaliation'::text, 'Organisation action after a report by the professional'::text, ((e.scope->>'need_title') || ' · reported ' || to_char(r.created_at, 'DD Mon YYYY'))::text, ('#agreement/' || e.id)::text, r.created_at
    from public.reports r
    join public.engagements e on e.user_id = r.reporter_id and (r.target_id = e.id or r.target_id = e.organisation_id or r.target_id = e.need_id
      or r.target_id in (select c.id from public.conversations c where c.need_id = e.need_id and c.user_id = e.user_id))
    where (e.ended_at > r.created_at and e.ended_by is distinct from e.user_id)
       or exists (select 1 from public.hours h where h.engagement_id = e.id and h.status in ('rejected', 'changes_requested') and h.reviewed_at > r.created_at)
       or exists (select 1 from public.completion_private cp where cp.engagement_id = e.id and cp.work_again = 'no' and cp.created_at > r.created_at);
  return query
    select 'removed_identity'::text, 'Identity matches a removed account'::text, p.name::text, ('#profile/' || p.user_id)::text, p.updated_at
    from public.profiles p join public.removed_identities ri on ri.document_name_norm = public.norm_name(p.id_document_name) and ri.user_id is distinct from p.user_id
    where coalesce(p.id_document_name, '') <> '';
end $function$;
revoke all on function public.integrity_signals_all() from public, anon, authenticated;

create or replace function public.integrity_signal_key(p_kind text, p_link text, p_detail text)
 returns text language sql immutable set search_path to ''
as $$ select md5(coalesce(p_kind, '') || '|' || coalesce(p_link, '') || '|' || coalesce(p_detail, '')) $$;

drop function if exists public.admin_integrity_signals();
create function public.admin_integrity_signals()
 returns table(kind text, title text, detail text, link text, seen_at timestamptz, signal_key text)
 language plpgsql stable security definer set search_path to ''
as $function$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  return query
    select s.kind, s.title, s.detail, s.link, s.seen_at, public.integrity_signal_key(s.kind, s.link, s.detail)
    from public.integrity_signals_all() s
    where not exists (select 1 from public.integrity_signal_checks c
      where c.signal_key = public.integrity_signal_key(s.kind, s.link, s.detail) and (s.seen_at is null or c.checked_at >= s.seen_at));
end $function$;
revoke all on function public.admin_integrity_signals() from public, anon;
grant execute on function public.admin_integrity_signals() to authenticated;

create or replace function public.admin_check_signal(p_key text, p_note text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare s record; v_note text := left(trim(coalesce(p_note, '')), 600);
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  select * into s from public.integrity_signals_all() x where public.integrity_signal_key(x.kind, x.link, x.detail) = p_key limit 1;
  if s.kind is null then raise exception 'This signal has changed or gone. Reload the page.'; end if;
  insert into public.integrity_signal_checks (signal_key, kind, title, detail, note, checked_at, checked_by)
  values (p_key, s.kind, s.title, coalesce(s.detail, ''), v_note, now(), auth.uid())
  on conflict (signal_key) do update set note = excluded.note, checked_at = excluded.checked_at, checked_by = excluded.checked_by,
    title = excluded.title, detail = excluded.detail;
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
  values (auth.uid(), 'signal_checked', 'signal', null, jsonb_build_object('title', s.title, 'name', coalesce(s.detail, ''), 'note', v_note, 'link', s.link));
end $function$;
revoke all on function public.admin_check_signal(text, text) from public, anon;
grant execute on function public.admin_check_signal(text, text) to authenticated;
