-- Handova rename (previously Impact Accelerator): user-facing messages inside server functions.
-- Bodies are otherwise identical to 20261001000000_init.sql and 20261001000300_admin_introductions.sql.
create or replace function public.create_organisation(p_name text, p_country text, p_city text, p_website text, p_summary text, p_org_type text, p_full_name text, p_locally_led boolean)
 returns uuid language plpgsql security definer set search_path to '' as $function$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if not coalesce(p_locally_led, false) then raise exception 'Handova is for locally led organisations.'; end if;
  if (select count(*) from public.organisation_members m where m.user_id = auth.uid()) >= 3 then raise exception 'You can manage up to three organisations.'; end if;
  insert into public.organisations(name, country, city, website, summary, org_type, locally_led_confirmed)
  values (trim(p_name), trim(p_country), trim(coalesce(p_city, '')), trim(coalesce(p_website, '')), trim(coalesce(p_summary, '')), coalesce(nullif(trim(p_org_type), ''), 'Community organisation'), true)
  returning id into v;
  insert into public.organisation_members(organisation_id, user_id, role, full_name) values (v, auth.uid(), 'owner', trim(coalesce(p_full_name, '')));
  perform public.notify_admins('org_review', 'Organisation to review', trim(p_name), '#admin');
  return v;
end $function$;

create or replace function public.admin_introduce(p_need uuid, p_user uuid, p_message text)
 returns uuid language plpgsql security definer set search_path to '' as $function$
declare v uuid; n record;
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  select * into n from public.needs where id = p_need;
  if n.id is null or n.status <> 'open' or not public.org_is_approved(n.organisation_id) then raise exception 'This need is not open.'; end if;
  if not public.profile_is_public(p_user) then raise exception 'Only approved, published profiles can be introduced.'; end if;
  if exists (select 1 from public.invitations where need_id = p_need and user_id = p_user) or exists (select 1 from public.applications where need_id = p_need and user_id = p_user and status in ('pending', 'accepted'))
    then raise exception 'This person is already connected to this need.'; end if;
  if length(trim(coalesce(p_message, ''))) < 30 then raise exception 'Write a short introduction of at least 30 characters.'; end if;
  insert into public.invitations(need_id, user_id, invited_by, message) values (p_need, p_user, auth.uid(), '[Introduced by Handova] ' || left(trim(p_message), 3900)) returning id into v;
  perform public.notify_org(n.organisation_id, 'introduction', 'Handova introduced a professional', n.title, '#org');
  return v;
end $function$;
