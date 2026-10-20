-- Re-audit 20 Oct 2026, L20: a protected record of who accepted which Terms and privacy notice, and when.
-- Until now this was only in the account's own settings (user metadata), which the person can edit.
-- 1. At sign-up, the versions the person ticked are copied here by the database (server time).
-- 2. Existing users: signing the current (v3) professional or organisation agreement counts as accepting the
--    current Terms and privacy notice, as Julieta decided.
-- Nobody can write to this table from the site; people can read their own rows, admins all rows.
-- When an account is deleted its rows stay, like signatures, and are removed 6 years later (retention_purge).

create table if not exists public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now(),
  source text not null default 'signup',
  adult_confirmed boolean,
  account_closed_at timestamptz,
  unique (user_id, terms_version, privacy_version)
);
alter table public.terms_acceptances enable row level security;
revoke all on public.terms_acceptances from public, anon, authenticated;
grant select on public.terms_acceptances to authenticated;
drop policy if exists terms_acceptances_read on public.terms_acceptances;
create policy terms_acceptances_read on public.terms_acceptances for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- The Terms and privacy notice versions the site currently shows (src/config.js termsVersion, privacyVersion).
-- Update both together whenever a new version is published.
create or replace function public.current_policy_version(k text)
 returns text language sql immutable set search_path to ''
as $$ select case k when 'terms' then 'terms-2026-10-20-2' when 'privacy' then 'privacy-2026-10-20-2' else null end $$;

-- 1. Sign-up: copy what the person accepted. Never blocks a sign-up.
create or replace function public.record_signup_terms()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if coalesce(m->>'terms_version', '') <> '' then
    insert into public.terms_acceptances (user_id, terms_version, privacy_version, accepted_at, source, adult_confirmed)
    values (new.id, left(m->>'terms_version', 80), left(coalesce(m->>'privacy_version', ''), 80), now(), 'signup',
      case when m ? 'adult_confirmed' then (m->>'adult_confirmed') = 'true' end)
    on conflict (user_id, terms_version, privacy_version) do nothing;
  end if;
  return new;
exception when others then
  return new;
end $function$;
revoke all on function public.record_signup_terms() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_terms on auth.users;
create trigger on_auth_user_created_terms after insert on auth.users for each row execute function public.record_signup_terms();

-- 2. Signing the current platform agreement records acceptance of the current Terms and privacy notice.
--    Never blocks a signature.
create or replace function public.record_agreement_terms()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if new.user_id is not null and new.version = public.current_agreement(new.kind) then
    insert into public.terms_acceptances (user_id, terms_version, privacy_version, accepted_at, source)
    values (new.user_id, public.current_policy_version('terms'), public.current_policy_version('privacy'), coalesce(new.signed_at, now()), 'agreement ' || new.version)
    on conflict (user_id, terms_version, privacy_version) do nothing;
  end if;
  return new;
exception when others then
  return new;
end $function$;
revoke all on function public.record_agreement_terms() from public, anon, authenticated;
create or replace trigger agreement_signatures_terms after insert on public.agreement_signatures for each row execute function public.record_agreement_terms();

-- Backfill: sign-ups that carried versions in their metadata (dated at account creation), then current agreements
-- already signed today.
insert into public.terms_acceptances (user_id, terms_version, privacy_version, accepted_at, source, adult_confirmed)
select u.id, left(u.raw_user_meta_data->>'terms_version', 80), left(coalesce(u.raw_user_meta_data->>'privacy_version', ''), 80), u.created_at, 'signup',
  case when u.raw_user_meta_data ? 'adult_confirmed' then (u.raw_user_meta_data->>'adult_confirmed') = 'true' end
from auth.users u where coalesce(u.raw_user_meta_data->>'terms_version', '') <> ''
on conflict (user_id, terms_version, privacy_version) do nothing;

insert into public.terms_acceptances (user_id, terms_version, privacy_version, accepted_at, source)
select distinct on (s.user_id) s.user_id, public.current_policy_version('terms'), public.current_policy_version('privacy'), s.signed_at, 'agreement ' || s.version
from public.agreement_signatures s
where s.user_id is not null and s.account_closed_at is null and s.version = public.current_agreement(s.kind)
order by s.user_id, s.signed_at
on conflict (user_id, terms_version, privacy_version) do nothing;
