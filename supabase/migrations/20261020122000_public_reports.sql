-- L17 (20 Oct 2026): people without an account can report a concern on Report a concern.
-- Public reports go into the same reports table, so they appear in Admin with the other reports (the admin query
-- reads reports with select *). They have no reporter, target_type 'other', source 'public' and an optional
-- contact email. Rate limit: 3 an hour and 10 a day from one connection, and 100 a day in total. The connection
-- is kept only as a salted hash, in a separate table with no link to the report, and deleted after a day,
-- so an anonymous report stays anonymous.

alter table public.reports add column if not exists source text not null default 'platform';
alter table public.reports add column if not exists contact_email text not null default '';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'reports_source_check' and conrelid = 'public.reports'::regclass) then
    alter table public.reports add constraint reports_source_check check (source in ('platform', 'public'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reports_contact_email_check' and conrelid = 'public.reports'::regclass) then
    alter table public.reports add constraint reports_contact_email_check check (length(contact_email) <= 254);
  end if;
end $$;
-- Admins read every column (select *), and reporters read their own rows: grant the new columns explicitly
-- in case table-level SELECT is later replaced by column grants. Nobody writes them directly.
grant select (source, contact_email) on public.reports to authenticated;

create table if not exists public.public_report_throttle (
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists public_report_throttle_key_idx on public.public_report_throttle (key, created_at);
alter table public.public_report_throttle enable row level security;
revoke all on public.public_report_throttle from public, anon, authenticated;

create or replace function public.submit_public_report(p_reason text, p_details text, p_email text default '')
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  hdrs jsonb;
  k text;
  rid uuid;
  d text := trim(coalesce(p_details, ''));
  em text := lower(trim(coalesce(p_email, '')));
begin
  if p_reason is null or p_reason not in ('safety', 'exploitation', 'harassment', 'fraud', 'misleading', 'privacy', 'spam', 'other') then
    raise exception 'Choose what the concern is about.' using errcode = '22023';
  end if;
  if length(d) < 10 or length(d) > 4000 then
    raise exception 'Describe what happened in 10 to 4,000 characters.' using errcode = '22023';
  end if;
  if em <> '' and (length(em) > 254 or em !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$') then
    raise exception 'Check the email address, or leave it empty.' using errcode = '22023';
  end if;

  begin hdrs := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then hdrs := '{}'::jsonb; end;
  k := encode(sha256(convert_to('handova-public-report|' || coalesce(public.request_ip(hdrs), ''), 'UTF8')), 'hex');

  delete from public.public_report_throttle where created_at < now() - interval '1 day';
  if (select count(*) from public.public_report_throttle t where t.key = k and t.created_at > now() - interval '1 hour') >= 3
     or (select count(*) from public.public_report_throttle t where t.key = k) >= 10
     or (select count(*) from public.public_report_throttle) >= 100 then
    raise exception 'Too many reports have been sent from here. Please try again later, or write to safeguarding@handova.org.' using errcode = 'P0001';
  end if;
  insert into public.public_report_throttle (key) values (k);

  -- The reports_notify trigger alerts the admins (and sets reporter_id to the signed-in user, if any).
  insert into public.reports (target_type, target_id, reason, details, source, contact_email)
  values ('other', null, p_reason, d, 'public', em)
  returning id into rid;
  return upper(left(rid::text, 8));
end $function$;

revoke all on function public.submit_public_report(text, text, text) from public;
grant execute on function public.submit_public_report(text, text, text) to anon, authenticated;
