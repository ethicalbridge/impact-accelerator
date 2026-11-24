-- 24 Nov 2026: reminders when Handova asked for changes and nothing came back. After 3 days, then every 4 days, at most
-- 3 reminders; 4 days after the third, Handova admins get one alert to follow up personally. Each reminder repeats the
-- start of what was asked. A round can be left out of reminders (reminders_off), for example a need that was declined.
alter table public.review_rounds add column if not exists reminders_off boolean not null default false;

create or replace function public.changes_reminders()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare r record; n integer := 0; sent integer; last_at timestamptz; who text; t text; b text; l text; excerpt text;
begin
  for r in
    select x.*, case x.target_type
        when 'organisation' then (select o.name from public.organisations o where o.id = x.target_id and o.status = 'changes_requested')
        when 'need' then (select nd.title from public.needs nd where nd.id = x.target_id and nd.status = 'draft')
        else (select p.name from public.profiles p where p.user_id = x.target_id and p.review_status = 'changes_requested' and p.closed_at is null) end as label,
      case x.target_type when 'need' then (select nd.organisation_id from public.needs nd where nd.id = x.target_id) when 'organisation' then x.target_id end as org_id
    from (select distinct on (target_type, target_id) * from public.review_rounds order by target_type, target_id, asked_at desc) x
    where x.resent_at is null and not x.reminders_off and x.asked_at > now() - interval '60 days'
  loop
    continue when r.label is null; -- no longer waiting on them
    select count(*), max(created_at) into sent, last_at from (
      select distinct on (date_trunc('minute', created_at)) created_at from public.notifications
      where kind = 'changes_reminder' and ref = r.target_id and created_at > r.asked_at order by date_trunc('minute', created_at)) s;
    if sent >= 3 then
      if last_at < now() - interval '4 days' and not exists (select 1 from public.notifications where kind = 'changes_stalled' and ref = r.target_id and created_at > r.asked_at) then
        insert into public.notifications (user_id, kind, title, body, link, ref)
          select a.user_id, 'changes_stalled', 'No reply after 3 reminders: ' || left(r.label, 120),
            'You asked for changes on ' || to_char(r.asked_at, 'FMDD Mon YYYY') || '. Three reminders went out and nothing came back. A personal message may help, or you can approve, decline or close it.',
            '#admin', r.target_id
          from public.admins a;
        n := n + 1;
      end if;
      continue;
    end if;
    continue when now() < r.asked_at + interval '3 days' + sent * interval '4 days' or (last_at is not null and last_at > now() - interval '4 days');
    excerpt := nullif(trim(regexp_replace(coalesce(r.note, ''), '\s+', ' ', 'g')), '');
    excerpt := case when excerpt is null then '' when length(excerpt) > 500 then ' What we asked: ' || left(excerpt, 500) || '…' else ' What we asked: ' || excerpt end;
    if r.target_type = 'organisation' then
      t := 'Reminder: please update your organisation details';
      b := 'On ' || to_char(r.asked_at, 'FMDD Mon YYYY') || ' Handova asked for a small change before approving ' || r.label || '. Open your organisation profile, make the change and save: it comes straight back to us.' || excerpt;
      l := '#org';
      insert into public.notifications (user_id, kind, title, body, link, ref) select m.user_id, 'changes_reminder', t, b, l, r.target_id from public.organisation_members m where m.organisation_id = r.org_id;
    elsif r.target_type = 'need' then
      t := 'Reminder: your need is waiting for a few changes';
      b := 'On ' || to_char(r.asked_at, 'FMDD Mon YYYY') || ' Handova asked for changes to “' || r.label || '” before publishing it. Open the need, update it and send it again.' || excerpt;
      l := '#org/needs/' || r.target_id;
      insert into public.notifications (user_id, kind, title, body, link, ref) select m.user_id, 'changes_reminder', t, b, l, r.target_id from public.organisation_members m where m.organisation_id = r.org_id;
    else
      t := 'Reminder: your profile is waiting for a few changes';
      b := 'On ' || to_char(r.asked_at, 'FMDD Mon YYYY') || ' Handova asked for a few changes before approving your profile. Open your profile, update it and send it for review again.' || excerpt;
      l := '#workspace/profile';
      insert into public.notifications (user_id, kind, title, body, link, ref) values (r.target_id, 'changes_reminder', t, b, l, r.target_id);
    end if;
    n := n + 1;
  end loop;
  return n;
end $function$;
revoke all on function public.changes_reminders() from public, anon, authenticated;

select cron.schedule('handova-changes-reminders', '35 3 * * *', 'select public.changes_reminders()');

-- The Progress page lists these reminders on the organisation and professional cards too.
do $do$ begin
  execute replace(replace(pg_get_functiondef('public.admin_progress'::regproc),
    '^(finish_signup|signup_reminder|retention_org_reminder)', '^(finish_signup|signup_reminder|retention_org_reminder|changes_reminder)'),
    '^(finish_signup|signup_reminder|profile_unsent|id_check|retention_reminder)', '^(finish_signup|signup_reminder|profile_unsent|id_check|retention_reminder|changes_reminder)');
end $do$;
