-- 13 Nov 2026: once Handova reviews an organisation, need, profile or new apply-by date, the matching review alerts
-- are marked read for every admin, so the notification counts always equal what is still waiting.
create or replace function public.review_alerts_read()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if tg_table_name = 'organisations' and old.status = 'pending' and new.status is distinct from 'pending' then
    update public.notifications set read_at = now()
     where read_at is null and kind = 'org_review' and body = old.name and user_id in (select user_id from public.admins);
  elsif tg_table_name = 'needs' then
    if old.status = 'pending' and new.status is distinct from 'pending' then
      update public.notifications set read_at = now()
       where read_at is null and kind in ('need_submitted', 'need_changed') and body = old.title and user_id in (select user_id from public.admins);
    end if;
    if old.requested_deadline is not null and new.requested_deadline is null then
      update public.notifications set read_at = now()
       where read_at is null and kind = 'need_deadline' and body like old.title || '%' and user_id in (select user_id from public.admins);
    end if;
  elsif tg_table_name = 'profiles' and old.review_status = 'pending' and new.review_status is distinct from 'pending' then
    update public.notifications set read_at = now()
     where read_at is null and kind in ('profile_review', 'profile_changed') and body = old.name and user_id in (select user_id from public.admins);
  end if;
  return new;
end $function$;
revoke all on function public.review_alerts_read() from public, anon, authenticated;
create or replace trigger organisations_review_alerts_read after update of status on public.organisations
  for each row execute function public.review_alerts_read();
create or replace trigger needs_review_alerts_read after update of status, requested_deadline on public.needs
  for each row execute function public.review_alerts_read();
create or replace trigger profiles_review_alerts_read after update of review_status on public.profiles
  for each row execute function public.review_alerts_read();
-- Catch up: alerts for items already reviewed.
update public.notifications n set read_at = now()
 where n.read_at is null and n.user_id in (select user_id from public.admins) and (
   (n.kind = 'org_review' and not exists (select 1 from public.organisations o where o.name = n.body and o.status = 'pending'))
   or (n.kind in ('need_submitted', 'need_changed') and not exists (select 1 from public.needs d where d.title = n.body and d.status = 'pending'))
   or (n.kind = 'need_deadline' and not exists (select 1 from public.needs d where n.body like d.title || '%' and d.requested_deadline is not null))
   or (n.kind in ('profile_review', 'profile_changed') and not exists (select 1 from public.profiles p where p.name = n.body and p.review_status = 'pending')));
