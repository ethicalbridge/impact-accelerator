-- 24 Nov 2026: approving a profile failed with 'record "old" has no field "status"'. The organisations branch read
-- old.status in the same condition as the table check, and profiles have no status column. Each table now has its own
-- nested check, so a field is only read on the table that has it.
create or replace function public.review_alerts_read()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if tg_table_name = 'organisations' then
    if old.status = 'pending' and new.status is distinct from 'pending' then
      update public.notifications set read_at = now()
       where read_at is null and kind = 'org_review' and body = old.name and user_id in (select user_id from public.admins);
    end if;
  elsif tg_table_name = 'needs' then
    if old.status = 'pending' and new.status is distinct from 'pending' then
      update public.notifications set read_at = now()
       where read_at is null and kind in ('need_submitted', 'need_changed') and body = old.title and user_id in (select user_id from public.admins);
    end if;
    if old.requested_deadline is not null and new.requested_deadline is null then
      update public.notifications set read_at = now()
       where read_at is null and kind = 'need_deadline' and body like old.title || '%' and user_id in (select user_id from public.admins);
    end if;
  elsif tg_table_name = 'profiles' then
    if old.review_status = 'pending' and new.review_status is distinct from 'pending' then
      update public.notifications set read_at = now()
       where read_at is null and kind in ('profile_review', 'profile_changed') and body = old.name and user_id in (select user_id from public.admins);
    end if;
  end if;
  return new;
end $function$;
