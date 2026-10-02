-- Fixes from the security audit of 2 October 2026.

-- 1. Signatures are only accepted for the exact official text of each agreement version.
create table if not exists public.agreement_versions (
  kind text not null, version text not null, text_sha256 text not null, published_at timestamptz not null default now(),
  primary key (kind, version)
);
alter table public.agreement_versions enable row level security;
revoke all on public.agreement_versions from anon, authenticated;
grant select on public.agreement_versions to anon, authenticated;
create policy agreement_versions_read on public.agreement_versions for select using (true);
insert into public.agreement_versions (kind, version, text_sha256) values
  ('professional', 'professional-2026-10-02-v2', '038e141fff993818e0814a6dbdcc528d726df7096168ab48d5fed2935ce03547'),
  ('organisation', 'organisation-2026-10-02-v2', '08a7c05821e19d82ee8d95fb50231e634c941cf2520278f06eb89680f3a2314e')
on conflict (kind, version) do update set text_sha256 = excluded.text_sha256;

create or replace function public.current_agreement(k text) returns text language sql immutable set search_path = '' as $$
  select case k when 'professional' then 'professional-2026-10-02-v2' when 'organisation' then 'organisation-2026-10-02-v2' else null end
$$;

create or replace function public.sign_agreement(p_kind text, p_version text, p_name text, p_text text, p_hours integer default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); hdrs json; new_id uuid; h text;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if p_kind is distinct from 'professional' then raise exception 'Use the organisation form to sign the organisation agreement.'; end if;
  if p_version is distinct from public.current_agreement(p_kind) then raise exception 'This agreement has been updated. Reload the page and read the new version.'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Type your full name to sign.'; end if;
  h := encode(sha256(convert_to(coalesce(p_text, ''), 'UTF8')), 'hex');
  if h is distinct from (select v.text_sha256 from public.agreement_versions v where v.kind = p_kind and v.version = p_version) then
    raise exception 'This agreement has been updated. Reload the page and read the new version.';
  end if;
  hdrs := nullif(current_setting('request.headers', true), '')::json;
  insert into public.agreement_signatures (user_id, email, kind, version, full_name, hours_committed, agreement_text, text_sha256, ip, user_agent)
  values (uid, coalesce((select email from auth.users where id = uid), ''), p_kind, p_version, trim(p_name), p_hours, p_text, h,
    coalesce(trim(split_part(hdrs->>'x-forwarded-for', ',', 1)), ''), left(coalesce(hdrs->>'user-agent', ''), 400))
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.sign_org_agreement(p_version text, p_name text, p_role text, p_text text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); hdrs json; new_id uuid; h text;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if p_version is distinct from public.current_agreement('organisation') then raise exception 'This agreement has been updated. Reload the page and read the new version.'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Type your full name to sign.'; end if;
  if length(trim(coalesce(p_role, ''))) < 2 then raise exception 'Add your role in the organisation.'; end if;
  h := encode(sha256(convert_to(coalesce(p_text, ''), 'UTF8')), 'hex');
  if h is distinct from (select v.text_sha256 from public.agreement_versions v where v.kind = 'organisation' and v.version = p_version) then
    raise exception 'This agreement has been updated. Reload the page and read the new version.';
  end if;
  hdrs := nullif(current_setting('request.headers', true), '')::json;
  insert into public.agreement_signatures (user_id, email, kind, version, full_name, signer_role, agreement_text, text_sha256, ip, user_agent)
  values (uid, coalesce((select email from auth.users where id = uid), ''), 'organisation', p_version, trim(p_name), left(trim(p_role), 120), p_text, h,
    coalesce(trim(split_part(hdrs->>'x-forwarded-for', ',', 1)), ''), left(coalesce(hdrs->>'user-agent', ''), 400))
  returning id into new_id;
  return new_id;
end $$;

-- 2. The name on an identity document is visible only to administrators (via id_verifications), never publicly.
revoke select (id_document_name) on public.profiles from anon, authenticated;

-- 3. Changing your name after a verified identity check sends the check back to an administrator.
--    Changing public details after approval alerts administrators.
create or replace function public.profile_change_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.name is distinct from old.name and old.id_status = 'approved' then
    new.id_status := 'name_mismatch'; new.id_verified_at := null;
    perform public.notify_admins('id_check', 'Name changed after identity check', new.name, '#admin');
  elsif old.review_status = 'approved' and (new.headline, new.photo_url, new.website, new.linkedin) is distinct from (old.headline, old.photo_url, old.website, old.linkedin) then
    perform public.notify_admins('profile_changed', 'Approved profile updated', new.name, '#profile/' || new.user_id);
  end if;
  return new;
end $$;
drop trigger if exists profiles_change_guard on public.profiles;
create trigger profiles_change_guard before update on public.profiles for each row execute function public.profile_change_guard();

create or replace function public.org_change_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'approved' and (new.name, new.website, new.summary, new.ethical_bridge_url) is distinct from (old.name, old.website, old.summary, old.ethical_bridge_url) then
    perform public.notify_admins('org_changed', 'Approved organisation updated', new.name, '#organisations/' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists organisations_change_guard on public.organisations;
create trigger organisations_change_guard before update on public.organisations for each row execute function public.org_change_guard();

-- 4. Reports about a conversation can only come from someone in it; at most 10 reports a day per person.
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated with check (
  (target_type <> 'conversation' or public.is_conversation_party(target_id))
  and (select count(*) from public.reports r where r.reporter_id = (select auth.uid()) and r.created_at > now() - interval '1 day') < 10
);

-- 5. Tidy up execute rights and over-broad grants.
revoke execute on function public.id_check_welcome() from public, anon, authenticated;
revoke execute on function public.mark_active() from public, anon, authenticated;
revoke execute on function public.profile_change_guard() from public, anon, authenticated;
revoke execute on function public.org_change_guard() from public, anon, authenticated;
revoke truncate, trigger, references on public.user_settings from authenticated;
