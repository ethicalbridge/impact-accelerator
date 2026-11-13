-- 13 Nov 2026: one read-only snapshot for the admin Progress page: every organisation, need, professional,
-- application and contribution with the dates of each step and the reminders already sent. Handova admins only.
create or replace function public.admin_progress()
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare
  rem text := '(remind|^apply_by_|deadline_extend|finish_signup|unsent|followup)';
  out jsonb;
begin
  if not public.is_admin() then raise exception 'Only Handova admins can see this.'; end if;
  select jsonb_build_object(
    'generated_at', now(),
    'orgs', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'name', o.name, 'country', o.country, 'status', o.status, 'created_at', o.created_at, 'approved_at', o.approved_at,
        'suspended_at', o.suspended_at,
        'contact', (select coalesce(nullif(m.full_name, ''), u.email) from public.organisation_members m join auth.users u on u.id = m.user_id where m.organisation_id = o.id order by m.created_at limit 1),
        'contact_email', (select u.email from public.organisation_members m join auth.users u on u.id = m.user_id where m.organisation_id = o.id order by m.created_at limit 1),
        'last_sign_in', (select max(u.last_sign_in_at) from public.organisation_members m join auth.users u on u.id = m.user_id where m.organisation_id = o.id),
        'first_need_at', (select min(n.created_at) from public.needs n where n.organisation_id = o.id),
        'needs', (select count(*) from public.needs n where n.organisation_id = o.id),
        'changes_waiting', (select c.changes <> '{}'::jsonb from public.organisation_changes c where c.organisation_id = o.id),
        'reminders', coalesce((select jsonb_agg(jsonb_build_object('kind', x.kind, 'title', x.title, 'at', x.created_at, 'emailed', x.emailed_at is not null) order by x.created_at)
           from public.notifications x join public.organisation_members m on m.user_id = x.user_id and m.organisation_id = o.id
           where x.kind ~ '^(finish_signup|signup_reminder)'), '[]'::jsonb)
      ) order by o.created_at desc) from public.organisations o), '[]'::jsonb),
    'needs', coalesce((select jsonb_agg(jsonb_build_object(
        'id', n.id, 'title', n.title, 'org_id', n.organisation_id, 'org', o.name, 'status', n.status, 'created_at', n.created_at, 'approved_at', n.approved_at,
        'deadline', n.deadline, 'requested_deadline', n.requested_deadline, 'places', n.places,
        'apps', (select count(*) from public.applications a where a.need_id = n.id),
        'apps_pending', (select count(*) from public.applications a where a.need_id = n.id and a.status = 'pending'),
        'first_app_at', (select min(a.created_at) from public.applications a where a.need_id = n.id),
        'invites_pending', (select count(*) from public.invitations i where i.need_id = n.id and i.status = 'pending'),
        'matched', (select count(*) from public.notifications x where x.kind = 'need_new' and x.link = '#need/' || n.id),
        'chosen_at', (select min(e.created_at) from public.engagements e where e.need_id = n.id),
        'reminders', coalesce((select jsonb_agg(jsonb_build_object('kind', x.kind, 'title', x.title, 'at', x.created_at, 'emailed', x.emailed_at is not null) order by x.created_at)
           from public.notifications x where x.ref = n.id and x.kind ~ rem), '[]'::jsonb)
      ) order by n.created_at desc) from public.needs n join public.organisations o on o.id = n.organisation_id), '[]'::jsonb),
    'pros', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.user_id, 'name', p.name, 'email', u.email, 'country', p.country, 'review_status', p.review_status, 'published', p.published,
        'signed_up_at', u.created_at, 'profile_at', p.created_at, 'approved_at', p.approved_at, 'id_status', p.id_status, 'id_verified_at', p.id_verified_at,
        'closed_at', p.closed_at, 'last_sign_in', u.last_sign_in_at,
        'sent_at', (select min(x.created_at) from public.notifications x where x.kind = 'profile_review' and x.body = p.name and x.user_id in (select user_id from public.admins)),
        'apps', (select count(*) from public.applications a where a.user_id = p.user_id),
        'apps_pending', (select count(*) from public.applications a where a.user_id = p.user_id and a.status = 'pending'),
        'invites_pending', (select count(*) from public.invitations i where i.user_id = p.user_id and i.status = 'pending'),
        'first_app_at', (select min(a.created_at) from public.applications a where a.user_id = p.user_id),
        'contribs', (select count(*) from public.engagements e where e.user_id = p.user_id),
        'reminders', coalesce((select jsonb_agg(jsonb_build_object('kind', x.kind, 'title', x.title, 'at', x.created_at, 'emailed', x.emailed_at is not null) order by x.created_at)
           from public.notifications x where x.user_id = p.user_id and x.kind ~ '^(finish_signup|signup_reminder|profile_unsent|id_check)'), '[]'::jsonb)
      ) order by u.created_at desc) from public.profiles p join auth.users u on u.id = p.user_id), '[]'::jsonb),
    'signups', coalesce((select jsonb_agg(jsonb_build_object('id', u.id, 'email', u.email, 'signed_up_at', u.created_at, 'confirmed', u.email_confirmed_at is not null, 'last_sign_in', u.last_sign_in_at,
        'reminders', coalesce((select jsonb_agg(jsonb_build_object('kind', x.kind, 'title', x.title, 'at', x.created_at, 'emailed', x.emailed_at is not null) order by x.created_at)
           from public.notifications x where x.user_id = u.id and x.kind ~ rem), '[]'::jsonb)) order by u.created_at desc)
      from auth.users u where not exists (select 1 from public.profiles p where p.user_id = u.id)
        and not exists (select 1 from public.organisation_members m where m.user_id = u.id)
        and not exists (select 1 from public.admins a where a.user_id = u.id)), '[]'::jsonb),
    'apps', coalesce((select jsonb_agg(jsonb_build_object(
        'id', a.id, 'need_id', a.need_id, 'need', n.title, 'org', o.name, 'pro_id', a.user_id, 'pro', p.name, 'status', a.status, 'created_at', a.created_at, 'decided_at', a.decided_at
      ) order by a.created_at desc) from public.applications a join public.needs n on n.id = a.need_id join public.organisations o on o.id = n.organisation_id left join public.profiles p on p.user_id = a.user_id), '[]'::jsonb),
    'invites', coalesce((select jsonb_agg(jsonb_build_object(
        'id', i.id, 'need_id', i.need_id, 'need', n.title, 'org', o.name, 'pro_id', i.user_id, 'pro', p.name, 'status', i.status, 'created_at', i.created_at, 'decided_at', i.decided_at
      ) order by i.created_at desc) from public.invitations i join public.needs n on n.id = i.need_id join public.organisations o on o.id = n.organisation_id left join public.profiles p on p.user_id = i.user_id), '[]'::jsonb),
    'contribs', coalesce((select jsonb_agg(jsonb_build_object(
        'id', e.id, 'need_id', e.need_id, 'need', coalesce(n.title, e.scope->>'need_title'), 'org_id', e.organisation_id, 'org', o.name, 'pro_id', e.user_id, 'pro', p.name,
        'status', e.status, 'created_at', e.created_at, 'talent_signed_at', e.talent_signed_at, 'org_signed_at', e.org_signed_at, 'first_call_at', e.first_call_at,
        'hours_first_at', (select min(h.created_at) from public.hours h where h.engagement_id = e.id),
        'hours_logged', (select coalesce(sum(h.hours), 0) from public.hours h where h.engagement_id = e.id),
        'hours_pending', (select coalesce(sum(h.hours), 0) from public.hours h where h.engagement_id = e.id and h.status = 'pending'),
        'hours_approved', (select coalesce(sum(h.hours), 0) from public.hours h where h.engagement_id = e.id and h.status = 'approved'),
        'delivered_at', e.talent_delivered_at, 'completed_at', e.completed_at, 'ended_at', e.ended_at, 'end_reason', e.end_reason,
        'survey_pro', (select r.status || '|' || r.created_at from public.survey_responses r where r.engagement_id = e.id and r.kind = 'professional' order by r.created_at limit 1),
        'survey_org', (select r.status || '|' || r.created_at from public.survey_responses r where r.engagement_id = e.id and r.kind = 'organisation' order by r.created_at limit 1),
        'last_message_at', (select max(mm.created_at) from public.conversations c join public.messages mm on mm.conversation_id = c.id where c.need_id = e.need_id and c.user_id = e.user_id and mm.kind = 'user'),
        'reminders', coalesce((select jsonb_agg(jsonb_build_object('kind', x.kind, 'title', x.title, 'at', x.created_at, 'emailed', x.emailed_at is not null) order by x.created_at)
           from public.notifications x where x.kind ~ rem and (x.ref = e.id or x.link in (select '#conversation/' || c.id from public.conversations c where c.need_id = e.need_id and c.user_id = e.user_id))), '[]'::jsonb)
      ) order by e.created_at desc) from public.engagements e left join public.needs n on n.id = e.need_id left join public.organisations o on o.id = e.organisation_id left join public.profiles p on p.user_id = e.user_id), '[]'::jsonb)
  ) into out;
  return out;
end $function$;
revoke all on function public.admin_progress() from public, anon;
grant execute on function public.admin_progress() to authenticated;
