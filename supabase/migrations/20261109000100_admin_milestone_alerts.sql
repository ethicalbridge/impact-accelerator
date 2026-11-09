-- 9 Nov 2026 (founder decision): Handova admins are told about each step of a contribution, not only when something
-- goes wrong: a professional applies, the organisation chooses someone, both sign, the work is completed.
-- These arrive as in-app notifications without an email each; one summary email a day lists the previous 24 hours.

-- Notifications marked with email_skipped never call the email function.
create or replace trigger notifications_email after insert on public.notifications
  for each row when (coalesce(new.email_skipped, '') = '') execute function public.email_notification();

create or replace function public.notify_admins_quiet(k text, t text, b text, l text, r uuid)
 returns void language sql security definer set search_path to ''
as $function$
  insert into public.notifications (user_id, kind, title, body, link, ref, email_skipped)
  select a.user_id, k, t, coalesce(b, ''), coalesce(l, ''), r, 'admin_digest' from public.admins a;
$function$;
revoke all on function public.notify_admins_quiet(text, text, text, text, uuid) from public, anon, authenticated;

-- 1. A professional applies.
create or replace function public.admin_alert_application()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare n record; who text;
begin
  select nd.id, nd.title, o.name as org, o.id as org_id into n from public.needs nd join public.organisations o on o.id = nd.organisation_id where nd.id = new.need_id;
  select name into who from public.profiles where user_id = new.user_id;
  perform public.notify_admins_quiet('admin_application', 'New application: ' || coalesce(n.title, 'a need'),
    concat_ws(' · ', coalesce(who, 'A professional') || ' applied', n.org), '#admin-org/' || n.org_id, new.id);
  return new;
exception when others then return new; -- an alert must never block an application
end $function$;
create or replace trigger applications_admin_alert after insert on public.applications
  for each row execute function public.admin_alert_application();

-- 2–4. The organisation chooses someone, both sign, the work is completed.
create or replace function public.admin_alert_engagement()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare need text := coalesce(new.scope->>'need_title', 'a need'); org text := coalesce(new.scope->>'organisation', ''); who text := coalesce(new.scope->>'talent', 'the professional');
begin
  if tg_op = 'INSERT' then
    perform public.notify_admins_quiet('admin_chosen', 'Professional chosen: ' || need,
      org || ' chose ' || who || '. The agreement is waiting for signatures.', '#agreement/' || new.id, new.id);
  elsif new.status is distinct from old.status and new.status = 'active' then
    perform public.notify_admins_quiet('admin_signed', 'Agreement signed: ' || need,
      org || ' and ' || who || ' both signed. The work has started.', '#agreement/' || new.id, new.id);
  elsif new.status is distinct from old.status and new.status = 'completed' then
    perform public.notify_admins_quiet('admin_completed', 'Work completed: ' || need,
      org || ' finished and endorsed the work of ' || who || '.', '#agreement/' || new.id, new.id);
  end if;
  return new;
exception when others then return new;
end $function$;
create or replace trigger engagements_admin_alert after insert or update of status on public.engagements
  for each row execute function public.admin_alert_engagement();

-- One email a day per admin: what happened in the last 24 hours (sent only when something did).
create or replace function public.admin_daily_digest()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare a record; c record; k integer := 0; t text; b text;
begin
  for a in select user_id from public.admins loop
    select count(*) filter (where kind = 'admin_application') as apps, count(*) filter (where kind = 'admin_chosen') as chosen,
           count(*) filter (where kind = 'admin_signed') as signed, count(*) filter (where kind = 'admin_completed') as done,
           string_agg(title, '; ' order by created_at) as items
      into c from public.notifications
     where user_id = a.user_id and kind in ('admin_application', 'admin_chosen', 'admin_signed', 'admin_completed')
       and created_at > now() - interval '24 hours';
    if coalesce(c.apps + c.chosen + c.signed + c.done, 0) = 0 then continue; end if;
    t := 'Yesterday on Handova: ' || concat_ws(', ',
      case when c.apps > 0 then c.apps || case when c.apps = 1 then ' application' else ' applications' end end,
      case when c.chosen > 0 then c.chosen || case when c.chosen = 1 then ' professional chosen' else ' professionals chosen' end end,
      case when c.signed > 0 then c.signed || case when c.signed = 1 then ' agreement signed' else ' agreements signed' end end,
      case when c.done > 0 then c.done || case when c.done = 1 then ' contribution completed' else ' contributions completed' end end);
    b := left(c.items, 900);
    insert into public.notifications (user_id, kind, title, body, link) values (a.user_id, 'admin_digest', t, b, '#notifications');
    k := k + 1;
  end loop;
  return k;
end $function$;
revoke all on function public.admin_daily_digest() from public, anon, authenticated;

-- 08:05 in Singapore (00:05 UTC), covering the previous 24 hours.
select cron.schedule('handova-admin-digest', '5 0 * * *', 'select public.admin_daily_digest()');

-- 9 Nov 2026 (founder decision): a week after a need went live, if nobody has applied, the professionals who were
-- matched to it and have hours available are reminded once (notification and email). Those who already applied,
-- who are on the organisation's team, suspended or closed are left out; needs closing within 3 days are skipped.
create or replace function public.need_match_reminders()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare k integer;
begin
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select x.user_id, 'need_reminder', 'Still looking for someone: ' || nd.title,
    concat_ws(' · ', o.name, nd.hours || ' hours', case when nd.deadline is not null then 'apply by ' || to_char(nd.deadline, 'DD Mon') end,
      'Nobody has applied yet and it matches your skills'),
    '#need/' || nd.id, nd.id
  from public.needs nd
  join public.organisations o on o.id = nd.organisation_id
  join public.notifications x on x.kind = 'need_new' and x.link = '#need/' || nd.id
  join public.profiles p on p.user_id = x.user_id
  where nd.status = 'open' and nd.approved_at < now() - interval '7 days'
    and (nd.deadline is null or nd.deadline >= current_date + 3)
    and not exists (select 1 from public.applications a where a.need_id = nd.id)
    and not exists (select 1 from public.engagements e where e.need_id = nd.id)
    and coalesce(p.hours_available, 0) > 0 and p.closed_at is null and not public.is_suspended(p.user_id)
    and not exists (select 1 from public.organisation_members m where m.organisation_id = nd.organisation_id and m.user_id = p.user_id)
    and not exists (select 1 from public.notifications r where r.kind = 'need_reminder' and r.ref = nd.id and r.user_id = x.user_id);
  get diagnostics k = row_count;
  return k;
end $function$;
revoke all on function public.need_match_reminders() from public, anon, authenticated;

-- 09:10 in Singapore (01:10 UTC).
select cron.schedule('handova-need-match-reminders', '10 1 * * *', 'select public.need_match_reminders()');
