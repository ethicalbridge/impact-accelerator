-- New-need alerts go only to professionals whose skills match the need (5 Nov 2026).
-- Profiles and needs pick skills from the same standard list, so a match is at least one shared skill (any case).
-- The organisation's own members, closed profiles and suspended accounts are still left out.
-- The usual email follows, unless the person turned emails off in Account and privacy.
create or replace function public.notify_new_need(p_need uuid)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare n record; org text; k integer;
begin
  select * into n from public.needs where id = p_need;
  if n.id is null or n.status <> 'open' then return 0; end if;
  select name into org from public.organisations where id = n.organisation_id;
  insert into public.notifications (user_id, kind, title, body, link)
  select p.user_id, 'need_new', 'New need matching your skills: ' || n.title,
         concat_ws(' · ', org, n.hours || ' hours', 'Matches your skills: ' || array_to_string(m.common, ', ')),
         '#need/' || n.id
  from public.profiles p
  cross join lateral (select coalesce(array(select s from unnest(coalesce(n.skills, '{}')) s
                       where lower(s) in (select lower(x) from unnest(coalesce(p.skills, '{}')) x)), '{}') as common) m
  where cardinality(m.common) > 0
    and p.closed_at is null
    and not public.is_suspended(p.user_id)
    and not exists (select 1 from public.organisation_members om where om.organisation_id = n.organisation_id and om.user_id = p.user_id);
  get diagnostics k = row_count;
  return k;
end $function$;
revoke all on function public.notify_new_need(uuid) from public, anon, authenticated;
