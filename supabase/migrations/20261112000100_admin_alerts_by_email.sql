-- 12 Nov 2026 (founder decision): Handova admins get every milestone alert by email as well as in the dashboard
-- (application, professional chosen, agreement signed, work completed), even with emails turned off (notify-email
-- ADMIN_ALWAYS). The daily summary email is no longer needed. "New application" opens the need, where admins see
-- who applied.
create or replace function public.notify_admins_quiet(k text, t text, b text, l text, r uuid)
 returns void language sql security definer set search_path to ''
as $function$
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select a.user_id, k, t, coalesce(b, ''), coalesce(l, ''), r from public.admins a;
$function$;
revoke all on function public.notify_admins_quiet(text, text, text, text, uuid) from public, anon, authenticated;

select cron.unschedule('handova-admin-digest');

create or replace function public.admin_alert_application()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare n record; who text;
begin
  select nd.id, nd.title, o.name as org into n from public.needs nd join public.organisations o on o.id = nd.organisation_id where nd.id = new.need_id;
  select name into who from public.profiles where user_id = new.user_id;
  perform public.notify_admins_quiet('admin_application', 'New application: ' || coalesce(n.title, 'a need'),
    concat_ws(' · ', coalesce(who, 'A professional') || ' applied', n.org), '#need/' || n.id, new.id);
  return new;
exception when others then return new;
end $function$;
update public.notifications set link = '#need/' || a.need_id from public.applications a
  where notifications.kind = 'admin_application' and notifications.ref = a.id;
