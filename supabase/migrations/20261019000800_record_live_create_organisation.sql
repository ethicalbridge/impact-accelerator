-- Records in the repo the live definition of create_organisation (applied directly on 2 October, never committed):
-- an organisation can only be created after its owner signs the current Handova organisation agreement.
-- Running this again changes nothing on the live database.
create or replace function public.create_organisation(p_name text, p_country text, p_city text, p_website text, p_summary text, p_org_type text, p_full_name text, p_locally_led boolean)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare v uuid; sig uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if not coalesce(p_locally_led, false) then raise exception 'Handova is for locally led organisations.'; end if;
  if (select count(*) from public.organisation_members m where m.user_id = auth.uid()) >= 3 then raise exception 'You can manage up to three organisations.'; end if;
  select s.id into sig from public.agreement_signatures s
    where s.user_id = auth.uid() and s.kind = 'organisation' and s.version = public.current_agreement('organisation') and s.organisation_id is null
    order by s.signed_at desc limit 1;
  if sig is null then raise exception 'Please read and sign the Handova organisation agreement first.'; end if;
  insert into public.organisations(name, country, city, website, summary, org_type, locally_led_confirmed)
  values (trim(p_name), trim(p_country), trim(coalesce(p_city, '')), trim(coalesce(p_website, '')), trim(coalesce(p_summary, '')), coalesce(nullif(trim(p_org_type), ''), 'Community organisation'), true)
  returning id into v;
  update public.agreement_signatures set organisation_id = v where id = sig;
  insert into public.organisation_members(organisation_id, user_id, role, full_name) values (v, auth.uid(), 'owner', trim(coalesce(p_full_name, '')));
  perform public.notify_admins('org_review', 'Organisation to review', trim(p_name), '#admin');
  return v;
end $function$;
