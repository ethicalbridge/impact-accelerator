-- Re-audit 20 Oct 2026: L24, L18 (server part), and the retention parts of W8 and L20.
--
-- L24: organisations record when they were suspended (suspended_at, cleared when they are no longer suspended).
--   For organisations with nobody managing them, the 24-month deletion alert counts from that date, and at 23 months
--   admins get a reminder to write to the organisation (one per organisation), as the privacy notice promises.
-- L18: "Download my data": export_my_data() returns everything Handova holds about the signed-in person.
--   Accounts with no profile and no organisation (mostly unfinished sign-ups) get the same rule as closed profiles:
--   a reminder after 23 months without signing in, and an admin alert after 24 months.
-- W8: browser error reports are removed after 90 days.
-- L20: acceptance records of deleted accounts are kept 6 years after the account closed, like signatures.

-- ---------- L24 ----------
alter table public.organisations add column if not exists suspended_at timestamptz;

create or replace function public.org_suspended_at()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if new.status = 'suspended' then
    if tg_op = 'INSERT' or old.status is distinct from 'suspended' then new.suspended_at := now();
    else new.suspended_at := coalesce(old.suspended_at, now()); end if;
  else
    new.suspended_at := null;
  end if;
  return new;
end $function$;
revoke all on function public.org_suspended_at() from public, anon, authenticated;
create or replace trigger organisations_suspended_at before insert or update on public.organisations for each row execute function public.org_suspended_at();

-- Organisations already suspended: the date of Handova's decision, or of the alert that its last member left,
-- otherwise today (which can only delay a deletion, never bring it forward).
update public.organisations o set suspended_at = coalesce(
  (select max(a.created_at) from public.admin_actions a where a.target_id = o.id and a.action = 'org_suspended'),
  (select min(n.created_at) from public.notifications n where n.kind = 'org_without_member' and n.body like o.name || ':%'),
  now())
where o.status = 'suspended' and o.suspended_at is null;

-- ---------- Retention (replaces retention_purge from 20261020110000) ----------
create or replace function public.retention_purge()
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare n_notif bigint; n_admin bigint; n_reports bigint; n_eng bigint; n_remind bigint; n_due bigint; n_orgs bigint;
  n_org_remind bigint; n_acc_remind bigint; n_acc_due bigint; n_errors bigint; n_terms bigint;
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

  -- Records left behind when a need or an account no longer exists.
  delete from public.need_safety_notes x where not exists (select 1 from public.needs n where n.id = x.need_id);
  delete from public.id_consents x where not exists (select 1 from auth.users u where u.id = x.user_id);
  delete from public.id_video_requests x where not exists (select 1 from auth.users u where u.id = x.user_id);
  delete from public.user_suspensions x where not exists (select 1 from auth.users u where u.id = x.user_id);

  -- Terms acceptances of deleted accounts: marked when the account is gone, removed 6 years later.
  update public.terms_acceptances t set account_closed_at = now()
   where t.account_closed_at is null and not exists (select 1 from auth.users u where u.id = t.user_id);
  delete from public.terms_acceptances where account_closed_at < now() - interval '6 years';
  get diagnostics n_terms = row_count;

  -- Browser error reports: 90 days.
  delete from public.client_errors where created_at < now() - interval '90 days';
  get diagnostics n_errors = row_count;

  delete from public.engagements e
  where e.user_id is null and e.status in ('completed', 'ended')
    and coalesce(e.completed_at, e.ended_at, e.created_at) < now() - interval '6 years'
    and not exists (select 1 from public.contribution_signatures cs where cs.engagement_id = e.id);
  get diagnostics n_eng = row_count;

  -- Closed profiles: reminder at 23 months without signing in, admin alert at 24 months.
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

  -- L18: accounts with no profile and no organisation (not admins), by last sign-in.
  select count(*) into n_acc_remind from auth.users u
  where not exists (select 1 from public.profiles p where p.user_id = u.id)
    and not exists (select 1 from public.organisation_members m where m.user_id = u.id)
    and not exists (select 1 from public.admins a where a.user_id = u.id)
    and coalesce(u.last_sign_in_at, u.created_at) between now() - interval '24 months' and now() - interval '23 months'
    and not exists (select 1 from public.notifications n where n.user_id = u.id and n.kind = 'retention_reminder' and n.created_at > now() - interval '60 days');
  perform public.notify(u.id, 'retention_reminder', 'Your Handova account will be deleted in 30 days',
    'You created a Handova account but haven’t signed in for almost two years. Sign in within 30 days to keep it; otherwise we will delete it, as our privacy notice explains.', '#account')
  from auth.users u
  where not exists (select 1 from public.profiles p where p.user_id = u.id)
    and not exists (select 1 from public.organisation_members m where m.user_id = u.id)
    and not exists (select 1 from public.admins a where a.user_id = u.id)
    and coalesce(u.last_sign_in_at, u.created_at) between now() - interval '24 months' and now() - interval '23 months'
    and not exists (select 1 from public.notifications n where n.user_id = u.id and n.kind = 'retention_reminder' and n.created_at > now() - interval '60 days');

  select count(*) into n_acc_due from auth.users u
  where not exists (select 1 from public.profiles p where p.user_id = u.id)
    and not exists (select 1 from public.organisation_members m where m.user_id = u.id)
    and not exists (select 1 from public.admins a where a.user_id = u.id)
    and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '24 months';
  if n_acc_due > 0 and extract(dow from now()) = 1 then
    perform public.notify_admins('retention', n_acc_due || ' unfinished account(s) due for deletion',
      'Accounts with no profile and no organisation, with no sign-in for 24 months after a reminder. Delete them in Supabase › Authentication › Users.', '#admin');
  end if;

  -- L24: organisations with nobody managing them, counted from the day they were suspended.
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select a.user_id, 'retention_org_reminder', 'Remind ' || o.name || ': deletion due in 30 days',
    'Nobody has managed this organisation for 23 months. Write to the person who signed its agreement to say Handova will delete it in 30 days unless someone takes it over, as the privacy notice promises.',
    '#admin-list/organisations', o.id
  from public.organisations o cross join public.admins a
  where o.status = 'suspended' and not exists (select 1 from public.organisation_members m where m.organisation_id = o.id)
    and coalesce(o.suspended_at, o.approved_at, o.created_at) between now() - interval '24 months' and now() - interval '23 months'
    and not exists (select 1 from public.notifications n where n.kind = 'retention_org_reminder' and n.ref = o.id);
  get diagnostics n_org_remind = row_count;

  select count(*) into n_orgs from public.organisations o
  where o.status = 'suspended' and not exists (select 1 from public.organisation_members m where m.organisation_id = o.id)
    and coalesce(o.suspended_at, o.approved_at, o.created_at) < now() - interval '24 months';
  if n_orgs > 0 and extract(dow from now()) = 1 then
    perform public.notify_admins('retention', n_orgs || ' organisation(s) with nobody managing them for 24 months', 'Delete them from Admin › Organisations.', '#admin-list/organisations');
  end if;

  return jsonb_build_object('notifications', n_notif, 'admin_actions', n_admin, 'reports', n_reports, 'engagements', n_eng,
    'reminders', n_remind, 'profiles_due', n_due, 'account_reminders', n_acc_remind, 'accounts_due', n_acc_due,
    'organisation_reminders', n_org_remind, 'organisations_due', n_orgs, 'client_errors', n_errors, 'terms_acceptances', n_terms);
end $function$;
revoke all on function public.retention_purge() from public, anon, authenticated;

-- ---------- L18: Download my data ----------
-- Everything about the signed-in person: account, settings, profile, organisations they belong to, applications,
-- invitations, contributions, hours, signatures (without the internet address), notifications, messages they sent,
-- reports they made, identity check records, questionnaire answers and acceptance records.
create or replace function public.export_my_data()
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare uid uuid := auth.uid(); out jsonb;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  select jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at, 'email_confirmed_at', u.email_confirmed_at,
        'last_sign_in_at', u.last_sign_in_at, 'details_given_at_sign_up', coalesce(u.raw_user_meta_data, '{}'::jsonb)) from auth.users u where u.id = uid),
    'terms_acceptances', coalesce((select jsonb_agg(to_jsonb(t) - 'id' - 'user_id' order by t.accepted_at) from public.terms_acceptances t where t.user_id = uid), '[]'::jsonb),
    'settings', (select to_jsonb(s) - 'user_id' from public.user_settings s where s.user_id = uid),
    'research_answers', (select to_jsonb(x) - 'user_id' from public.user_private x where x.user_id = uid),
    'profile', (select to_jsonb(p) from public.profiles p where p.user_id = uid),
    'organisations', coalesce((select jsonb_agg(jsonb_build_object('your_role', m.role, 'your_name', m.full_name, 'joined_at', m.created_at, 'organisation', to_jsonb(o)) order by m.created_at)
        from public.organisation_members m join public.organisations o on o.id = m.organisation_id where m.user_id = uid), '[]'::jsonb),
    'applications', coalesce((select jsonb_agg(to_jsonb(a) || jsonb_build_object('need_title', n.title) order by a.created_at)
        from public.applications a left join public.needs n on n.id = a.need_id where a.user_id = uid), '[]'::jsonb),
    'invitations_received', coalesce((select jsonb_agg(to_jsonb(i) - 'invited_by' || jsonb_build_object('need_title', n.title) order by i.created_at)
        from public.invitations i left join public.needs n on n.id = i.need_id where i.user_id = uid), '[]'::jsonb),
    'invitations_sent', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'need_title', n.title, 'message', i.message, 'conflict_note', i.conflict_note, 'status', i.status, 'created_at', i.created_at) order by i.created_at)
        from public.invitations i left join public.needs n on n.id = i.need_id where i.invited_by = uid), '[]'::jsonb),
    'contributions', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at) from public.engagements e
        where e.user_id = uid or e.org_signed_by = uid or e.endorsed_by = uid), '[]'::jsonb),
    'hours', coalesce((select jsonb_agg(to_jsonb(h) order by h.work_date, h.created_at) from public.hours h where h.user_id = uid), '[]'::jsonb),
    'agreement_signatures', coalesce((select jsonb_agg(to_jsonb(s) - 'ip' order by s.signed_at) from public.agreement_signatures s where s.user_id = uid), '[]'::jsonb),
    'contribution_signatures', coalesce((select jsonb_agg(to_jsonb(s) - 'ip' order by s.signed_at) from public.contribution_signatures s where s.user_id = uid), '[]'::jsonb),
    'saved_needs', coalesce((select jsonb_agg(jsonb_build_object('need_id', sn.need_id, 'need_title', n.title, 'saved_at', sn.created_at) order by sn.created_at)
        from public.saved_needs sn left join public.needs n on n.id = sn.need_id where sn.user_id = uid), '[]'::jsonb),
    'messages_sent', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'conversation_id', m.conversation_id, 'body', m.body, 'sent_at', m.created_at) order by m.created_at)
        from public.messages m where m.sender_id = uid), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(jsonb_build_object('kind', n.kind, 'title', n.title, 'body', n.body, 'link', n.link, 'created_at', n.created_at, 'read_at', n.read_at, 'emailed_at', n.emailed_at) order by n.created_at)
        from public.notifications n where n.user_id = uid), '[]'::jsonb),
    'reports_made', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'about', r.target_type, 'target_id', r.target_id, 'reason', r.reason, 'details', r.details, 'status', r.status, 'created_at', r.created_at, 'resolved_at', r.resolved_at) order by r.created_at)
        from public.reports r where r.reporter_id = uid), '[]'::jsonb),
    'identity_check', jsonb_build_object(
      'consents', coalesce((select jsonb_agg(to_jsonb(c) - 'user_id' order by c.consented_at) from public.id_consents c where c.user_id = uid), '[]'::jsonb),
      'checks', coalesce((select jsonb_agg(jsonb_build_object('provider', v.provider, 'status', v.status, 'name_on_document', v.document_name, 'created_at', v.created_at, 'updated_at', v.updated_at) order by v.created_at)
          from public.id_verifications v where v.user_id = uid), '[]'::jsonb),
      'video_call_request', (select to_jsonb(r) - 'user_id' - 'decided_by' from public.id_video_requests r where r.user_id = uid)),
    'questionnaire_answers', coalesce((select jsonb_agg(to_jsonb(s) - 'respondent' order by s.created_at) from public.survey_responses s where s.respondent = uid), '[]'::jsonb),
    'suspension', (select jsonb_build_object('removed', s.removed, 'suspended_at', s.suspended_at, 'lifted_at', s.lifted_at) from public.user_suspensions s where s.user_id = uid)
  ) into out;
  return out;
end $function$;
revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
