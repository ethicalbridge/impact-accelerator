-- When Handova approves a need for the first time, every professional with an active profile is told,
-- so they can apply quickly. The organisation's own members, closed profiles and suspended accounts are left out.
-- Professionals whose skills overlap with the need see which ones in the message. The usual email follows,
-- unless the person turned emails off in Account and privacy.
create or replace function public.notify_new_need(p_need uuid)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare n record; org text; k integer;
begin
  select * into n from public.needs where id = p_need;
  if n.id is null or n.status <> 'open' then return 0; end if;
  select name into org from public.organisations where id = n.organisation_id;
  insert into public.notifications (user_id, kind, title, body, link)
  select p.user_id, 'need_new', 'New need: ' || n.title,
         concat_ws(' · ', org, n.hours || ' hours',
           case when cardinality(m.common) > 0 then 'Matches your skills: ' || array_to_string(m.common, ', ') end),
         '#need/' || n.id
  from public.profiles p
  cross join lateral (select coalesce(array(select s from unnest(coalesce(n.skills, '{}')) s
                       where lower(s) in (select lower(x) from unnest(coalesce(p.skills, '{}')) x)), '{}') as common) m
  where p.closed_at is null
    and not public.is_suspended(p.user_id)
    and not exists (select 1 from public.organisation_members om where om.organisation_id = n.organisation_id and om.user_id = p.user_id);
  get diagnostics k = row_count;
  return k;
end $function$;
revoke all on function public.notify_new_need(uuid) from public, anon, authenticated;

create or replace function public.admin_review_need(p_need uuid, p_decision text, p_note text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare n public.needs;
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  select * into n from public.needs where id = p_need for update;
  if not found then raise exception 'Need not found.'; end if;
  if n.status <> 'pending' then raise exception 'This need is not waiting for review.'; end if;
  if p_decision = 'approved' then
    if not public.org_is_approved(n.organisation_id) then
      raise exception 'Approve the organisation first. The need stays pending until then.';
    end if;
    update public.needs set status = 'open' where id = p_need;
    perform public.notify_org(n.organisation_id, 'need_decision', 'Your need is live', coalesce(nullif(trim(p_note), ''), n.title), '#org/needs/' || p_need);
    -- First time live: tell professionals (a need reopened later doesn't alert everyone again).
    if n.approved_at is null then perform public.notify_new_need(p_need); end if;
  elsif p_decision = 'changes_requested' then
    if coalesce(trim(p_note), '') = '' then raise exception 'Write a note so the organisation knows what to change.'; end if;
    update public.needs set status = 'draft', review_note = trim(p_note) where id = p_need;
    perform public.notify_org(n.organisation_id, 'need_decision', 'Please update your need', trim(p_note), '#org/needs/' || p_need);
  else
    raise exception 'Choose approve or ask for changes.';
  end if;
end $function$;
