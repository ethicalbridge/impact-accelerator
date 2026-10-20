-- Agreements v3 (20 Oct 2026): professional, organisation and contribution agreements aligned with the
-- Handova policies (v1.0). Everyone signs the new platform agreement once; contributions created from now on use
-- contribution v3, and agreements already created keep the version they were created with.

create or replace function public.current_agreement(k text)
 returns text language sql immutable set search_path to ''
as $$
  select case k when 'professional' then 'professional-2026-10-20-v3' when 'organisation' then 'organisation-2026-10-20-v3' else null end
$$;

insert into public.agreement_versions(kind, version, text_sha256, published_at) values
  ('professional', 'professional-2026-10-20-v3', '2d1437b2dfbe746ed2b8e104183caf76b76ce25dc0184eb1866e103103ca8a6d', now()),
  ('organisation', 'organisation-2026-10-20-v3', 'abc0ac5dd11780c59aa3b59886c2f1c769560617f2c225ad13bb4a89b238c2d1', now())
on conflict (kind, version) do update set text_sha256 = excluded.text_sha256;

-- New contributions use the new contribution agreement.
create or replace function public.create_engagement(p_need uuid, p_user uuid)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare v uuid; n record; filled integer;
begin
  select * into n from public.needs where id = p_need for update;
  if n.status <> 'open' then raise exception 'This need is no longer open.'; end if;
  select count(*) into filled from public.engagements e where e.need_id = p_need and e.status <> 'ended';
  if filled >= n.places then raise exception 'All places on this need are already filled.'; end if;
  insert into public.engagements(need_id, organisation_id, user_id, terms_version, scope)
  select n.id, n.organisation_id, p.user_id, 'contribution-2026-10-v3', jsonb_build_object('need_title', n.title, 'description', n.description, 'output', n.output, 'skills', n.skills,
    'languages', n.languages, 'hours', n.hours, 'arrangement', n.arrangement, 'location', n.location, 'country', n.country,
    'deadline', n.deadline, 'organisation', o.name, 'organisation_country', o.country, 'talent', p.name, 'talent_country', p.country)
  from public.profiles p, public.organisations o where p.user_id = p_user and o.id = n.organisation_id
  returning id into v;
  if filled + 1 >= n.places then update public.needs set status = 'closed' where id = p_need; end if;
  perform public.notify(p_user, 'agreement', 'Sign your contribution agreement', n.title, '#agreement/' || v);
  perform public.notify_org(n.organisation_id, 'agreement', 'Sign your contribution agreement', n.title, '#agreement/' || v);
  return v;
end $function$;

-- Has this organisation signed the current organisation agreement? (members and admins only)
create or replace function public.org_agreement_current(p_org uuid)
 returns boolean language sql stable security definer set search_path to ''
as $$
  select case when public.is_org_member(p_org) or public.is_admin() then exists (
    select 1 from public.agreement_signatures s
    where s.organisation_id = p_org and s.kind = 'organisation' and s.version = public.current_agreement('organisation')
  ) else null end
$$;
revoke all on function public.org_agreement_current(uuid) from public, anon;
grant execute on function public.org_agreement_current(uuid) to authenticated;

-- An organisation member signs a new version for an existing organisation.
create or replace function public.resign_org_agreement(p_org uuid, p_version text, p_name text, p_role text, p_text text)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare uid uuid := auth.uid(); hdrs json; new_id uuid; h text;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if not public.is_org_member(p_org) then raise exception 'Only a member of the organisation can sign for it.'; end if;
  if p_version is distinct from public.current_agreement('organisation') then raise exception 'This agreement has been updated. Reload the page and read the new version.'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Type your full name to sign.'; end if;
  if length(trim(coalesce(p_role, ''))) < 2 then raise exception 'Add your role in the organisation.'; end if;
  h := encode(sha256(convert_to(coalesce(p_text, ''), 'UTF8')), 'hex');
  if h is distinct from (select v.text_sha256 from public.agreement_versions v where v.kind = 'organisation' and v.version = p_version) then
    raise exception 'This agreement has been updated. Reload the page and read the new version.';
  end if;
  hdrs := nullif(current_setting('request.headers', true), '')::json;
  insert into public.agreement_signatures (user_id, email, kind, version, full_name, signer_role, organisation_id, agreement_text, text_sha256, ip, user_agent)
  values (uid, coalesce((select email from auth.users where id = uid), ''), 'organisation', p_version, trim(p_name), left(trim(p_role), 120), p_org, p_text, h,
    public.request_ip(hdrs), left(coalesce(hdrs->>'user-agent', ''), 400))
  returning id into new_id;
  return new_id;
end $function$;
revoke all on function public.resign_org_agreement(uuid, text, text, text, text) from public, anon;
grant execute on function public.resign_org_agreement(uuid, text, text, text, text) to authenticated;

-- New needs go for review only once the organisation has signed the current agreement.
create or replace function public.need_agreement_guard()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status <> 'pending') and not public.is_admin()
     and not exists (select 1 from public.agreement_signatures s where s.organisation_id = new.organisation_id and s.kind = 'organisation' and s.version = public.current_agreement('organisation')) then
    raise exception 'We updated the Handova organisation agreement. Sign the new version from your organisation workspace, then send the need for review.';
  end if;
  return new;
end $function$;
revoke all on function public.need_agreement_guard() from public, anon, authenticated;
create or replace trigger needs_agreement_guard before insert or update on public.needs for each row execute function public.need_agreement_guard();

-- A professional signs a new contribution agreement only with the current professional agreement signed.
create or replace function public.engagement_pro_agreement_guard()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if old.talent_signed_at is null and new.talent_signed_at is not null
     and not exists (select 1 from public.agreement_signatures s where s.user_id = new.user_id and s.kind = 'professional' and s.version = public.current_agreement('professional')) then
    raise exception 'We updated the Handova professional agreement. Read and sign it from your profile first, then sign this contribution agreement.';
  end if;
  return new;
end $function$;
revoke all on function public.engagement_pro_agreement_guard() from public, anon, authenticated;
create or replace trigger engagements_pro_agreement_guard before update on public.engagements for each row execute function public.engagement_pro_agreement_guard();
