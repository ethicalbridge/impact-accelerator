-- Retention jobs from the Handova Data Protection Policy v1.0 (approved 20 Oct 2026).
-- Runs every night at 02:30 UTC. What it does:
-- 1. Email notification log: notifications older than 12 months are removed.
-- 2. Records of Handova decisions (admin_actions): removed after 6 years.
-- 3. Reports of concern: resolved reports and their case records are removed 6 years after closure, except cases
--    marked as involving a child, which stay until Handova reviews them (until the child turns 25 or 6 years,
--    whichever is later).
-- 4. Contribution records: engagements whose professional has closed their account, that ended more than 6 years
--    ago and whose signature records have already gone (so the account closed more than 6 years ago), are removed
--    with their hours, completion notes and questionnaire answers.
-- 5. Profiles closed for inactivity: a reminder after 23 months without signing in; after 24 months Handova's
--    admins are told, so they can delete the account with its identity checks through the normal deletion flow.
-- 6. Organisations suspended because nobody manages them: admins are told after 24 months.

create or replace function public.retention_purge()
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare n_notif bigint; n_admin bigint; n_reports bigint; n_eng bigint; n_remind bigint; n_due bigint; n_orgs bigint;
begin
  delete from public.notifications where created_at < now() - interval '12 months';
  get diagnostics n_notif = row_count;

  delete from public.admin_actions where created_at < now() - interval '6 years';
  get diagnostics n_admin = row_count;

  delete from public.report_cases rc using public.reports r
   where rc.report_id = r.id and r.status = 'resolved' and r.resolved_at < now() - interval '6 years' and not rc.child_case;
  delete from public.reports r
   where r.status = 'resolved' and r.resolved_at < now() - interval '6 years'
     and not exists (select 1 from public.report_cases rc where rc.report_id = r.id and rc.child_case);
  get diagnostics n_reports = row_count;

  -- Hours, completion notes and questionnaire answers go with the engagement (on delete cascade).
  delete from public.engagements e
  where e.user_id is null and e.status in ('completed', 'ended')
    and coalesce(e.completed_at, e.ended_at, e.created_at) < now() - interval '6 years'
    and not exists (select 1 from public.contribution_signatures cs where cs.engagement_id = e.id);
  get diagnostics n_eng = row_count;

  -- Reminders and admin alerts for long-closed profiles (no automatic account deletion: Didit sessions and photos
  -- are removed by the account deletion flow).
  select count(*) into n_remind from public.profiles p join auth.users u on u.id = p.user_id
  where p.closed_at is not null and not p.published
    and coalesce(u.last_sign_in_at, p.closed_at) between now() - interval '24 months' and now() - interval '23 months'
    and not exists (select 1 from public.notifications n where n.user_id = p.user_id and n.kind = 'retention_reminder' and n.created_at > now() - interval '60 days');
  perform public.notify(p.user_id, 'retention_reminder', 'Your Handova profile will be deleted in 30 days',
    'You haven’t signed in for almost two years. Sign in within 30 days to keep your profile; otherwise we will delete your account, as our privacy notice explains.', '#workspace')
  from public.profiles p join auth.users u on u.id = p.user_id
  where p.closed_at is not null and not p.published
    and coalesce(u.last_sign_in_at, p.closed_at) between now() - interval '24 months' and now() - interval '23 months'
    and not exists (select 1 from public.notifications n where n.user_id = p.user_id and n.kind = 'retention_reminder' and n.created_at > now() - interval '60 days');

  select count(*) into n_due from public.profiles p join auth.users u on u.id = p.user_id
  where p.closed_at is not null and not p.published and coalesce(u.last_sign_in_at, p.closed_at) < now() - interval '24 months';
  if n_due > 0 and extract(dow from now()) = 1 then
    perform public.notify_admins('retention', n_due || ' closed profile(s) due for deletion', 'No sign-in for 24 months after a reminder. Delete them from Admin › Professionals.', '#admin-list/professionals');
  end if;

  select count(*) into n_orgs from public.organisations o
  where o.status = 'suspended' and not exists (select 1 from public.organisation_members m where m.organisation_id = o.id)
    and coalesce(o.approved_at, o.created_at) < now() - interval '24 months';
  if n_orgs > 0 and extract(dow from now()) = 1 then
    perform public.notify_admins('retention', n_orgs || ' organisation(s) with nobody managing them for 24 months', 'Delete them from Admin › Organisations.', '#admin-list/organisations');
  end if;

  return jsonb_build_object('notifications', n_notif, 'admin_actions', n_admin, 'reports', n_reports, 'engagements', n_eng, 'reminders', n_remind, 'profiles_due', n_due, 'organisations_due', n_orgs);
end $function$;
revoke all on function public.retention_purge() from public, anon, authenticated;

select cron.schedule('handova-retention', '30 2 * * *', 'select public.retention_purge()');
