-- Re-audit 20 Oct 2026, W8 (server part): errors in visitors' browsers reach Handova.
-- Only the error text, the page and the app version are kept (no person, no address, no browser details). Anything
-- that looks like an email address, an ID or a sign-in token is blanked out before saving. At most 20 errors a
-- minute are kept across the whole site. Admins can read them; they are removed after 90 days (retention_purge).

create table if not exists public.client_errors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message text not null default '',
  page text not null default '',
  app_version text not null default ''
);
create index if not exists client_errors_created_at_idx on public.client_errors (created_at);
alter table public.client_errors enable row level security;
revoke all on public.client_errors from public, anon, authenticated;
grant select on public.client_errors to authenticated;
drop policy if exists client_errors_admin_read on public.client_errors;
create policy client_errors_admin_read on public.client_errors for select to authenticated using (public.is_admin());

create or replace function public.scrub_client_text(t text)
 returns text language sql immutable set search_path to ''
as $$
  select regexp_replace(regexp_replace(regexp_replace(coalesce(t, ''),
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[email]', 'g'),
    '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', '[id]', 'g'),
    '[A-Za-z0-9_.-]{40,}', '[token]', 'g')
$$;
revoke all on function public.scrub_client_text(text) from public, anon, authenticated;

create or replace function public.log_client_error(p_message text, p_page text, p_version text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare msg text; pg text; ver text;
begin
  msg := left(trim(public.scrub_client_text(left(coalesce(p_message, ''), 2000))), 500);
  if msg = '' then return; end if;
  -- The page without query strings or anything after a sign-in token.
  pg := split_part(split_part(left(coalesce(p_page, ''), 1000), '?', 1), 'access_token', 1);
  pg := left(trim(public.scrub_client_text(pg)), 200);
  ver := left(regexp_replace(coalesce(p_version, ''), '[^A-Za-z0-9._-]', '', 'g'), 40);
  perform pg_advisory_xact_lock(hashtext('public.log_client_error'));
  if (select count(*) from public.client_errors where created_at > now() - interval '1 minute') >= 20 then return; end if;
  insert into public.client_errors (message, page, app_version) values (msg, pg, ver);
end $function$;
revoke all on function public.log_client_error(text, text, text) from public;
grant execute on function public.log_client_error(text, text, text) to anon, authenticated;
