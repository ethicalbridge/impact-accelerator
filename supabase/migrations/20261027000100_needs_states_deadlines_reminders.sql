-- 27 Oct 2026 (founder decisions):
-- 1. The Needs page shows every published need in the state it is in (open, applications coming in, someone chosen,
--    in progress, handed over, apply-by date passed), not only the open ones. public_need_progress() gives that state
--    without revealing who applied or who was chosen.
-- 2. Organisations give professionals at least two weeks to apply: a need sent for review needs an apply-by date at
--    least 14 days ahead, and Handova can't open one with fewer than 7 days left.
-- 3. An organisation can ask for a later apply-by date on a live need. Handova is notified and approves it.
--    Organisations are reminded 3 days before the date.
-- 4. People who signed up but never finished (no profile, or a profile never sent for review) get reminders by
--    notification and email, after 1 day and again after 7 days. Handova sees them in Admin → Unfinished sign-ups.

alter table public.needs add column if not exists requested_deadline date;

-- 1. The public state of each published need (counts only, no names).
create or replace function public.public_need_progress()
 returns table (need_id uuid, state text, applicants integer)
 language sql stable security definer set search_path to ''
as $function$
  select n.id,
    case
      when n.status = 'open' and n.deadline is not null and n.deadline < current_date then 'deadline_passed'
      when n.status = 'open' and exists (select 1 from public.applications a where a.need_id = n.id and a.status = 'pending') then 'applications'
      when n.status = 'open' then 'open'
      when exists (select 1 from public.engagements e where e.need_id = n.id and e.status = 'completed') then 'handed_over'
      when exists (select 1 from public.engagements e where e.need_id = n.id and e.status = 'active') then 'in_progress'
      when exists (select 1 from public.engagements e where e.need_id = n.id and e.status = 'awaiting_signatures') then 'chosen'
      else 'closed'
    end,
    (select count(*)::integer from public.applications a where a.need_id = n.id and a.status in ('pending', 'accepted'))
  from public.needs n
  where n.status in ('open', 'closed') and n.approved_at is not null and public.org_is_approved(n.organisation_id)
    and coalesce(n.review_note, '') not like 'Taken down by Handova%';
$function$;
revoke all on function public.public_need_progress() from public;
grant execute on function public.public_need_progress() to anon, authenticated;

-- 2. Two weeks to apply.
create or replace function public.need_guard()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare adm boolean := public.is_admin();
begin
  if tg_op = 'UPDATE' then
    if new.organisation_id <> old.organisation_id then raise exception 'A need cannot move to another organisation.'; end if;
    if old.status in ('open', 'closed') and new.status in ('draft', 'pending') then raise exception 'Close a published need instead of returning it to draft.'; end if;
  end if;
  -- A need only becomes public through Handova's review: it can't jump from draft or review straight to closed.
  if not adm and new.status = 'closed' and (tg_op = 'INSERT' or old.status in ('draft', 'pending')) then
    raise exception 'Only a need Handova has approved can be closed. Send it for review first.';
  end if;
  if new.status = 'open' and (tg_op = 'INSERT' or old.status <> 'open') then
    -- Only Handova opens a need, except reopening one it already approved.
    if not adm and not (tg_op = 'UPDATE' and old.status = 'closed' and old.approved_at is not null) then
      raise exception 'Send your need for review. Handova checks every need and opens it once it is approved.';
    end if;
    if not adm and public.endorsement_overdue(new.organisation_id) then
      raise exception 'A finished contribution has been waiting for your endorsement for more than 14 days. Finish and endorse it first.';
    end if;
    if not public.org_is_approved(new.organisation_id) then
      raise exception 'The organisation must be approved before its needs can open.';
    end if;
    if public.needs_in_use(new.organisation_id, new.id, false) >= 3 then
      raise exception 'An organisation can have up to 3 needs open or in progress at a time. Finish or close one first.';
    end if;
    if new.deadline is not null and new.deadline < current_date + 7 then
      raise exception 'Fewer than 7 days are left to apply. Ask the organisation for a later apply-by date first: professionals need at least two weeks.';
    end if;
    new.approved_at := coalesce(new.approved_at, now());
    new.review_note := null;
  end if;
  -- When a need stops taking applications (closed by hand or because the places filled),
  -- everyone still waiting gets an answer instead of hanging.
  if tg_op = 'UPDATE' and old.status = 'open' and new.status = 'closed' then
    perform public.notify(a.user_id, 'application_decision', 'The need you applied to is closed',
      new.title || ': it is no longer taking applications. Thank you for applying.', '#workspace')
      from public.applications a where a.need_id = new.id and a.status = 'pending';
    update public.conversations c set status = 'closed', closed_reason = 'Need closed', closed_at = now()
      from public.applications a where a.need_id = new.id and a.status = 'pending' and c.need_id = new.id and c.user_id = a.user_id and c.status = 'open';
    update public.applications set status = 'declined', decided_at = now() where need_id = new.id and status = 'pending';
    -- Invitations nobody answered can no longer be accepted either.
    perform public.notify(i.user_id, 'invitation', 'An invitation is no longer open',
      new.title || ': this need is no longer taking anyone new. Thank you.', '#workspace')
      from public.invitations i where i.need_id = new.id and i.status = 'pending';
    update public.invitations set status = 'declined', decided_at = now() where need_id = new.id and status = 'pending';
    new.requested_deadline := null;
  end if;
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status <> 'pending') then
    if not adm and exists (select 1 from public.organisations o where o.id = new.organisation_id and o.status in ('suspended', 'rejected')) then
      raise exception 'Your organisation can’t send needs for review at the moment. Write to hello@handova.org if you have questions.';
    end if;
    if not adm and public.endorsement_overdue(new.organisation_id) then
      raise exception 'A finished contribution has been waiting for your endorsement for more than 14 days. Finish and endorse it first, then you can send new needs for review.';
    end if;
    if public.needs_in_use(new.organisation_id, new.id, true) >= 3 then
      raise exception 'You already have 3 needs open, waiting for review or in progress. When one is finished or closed, you can send another.';
    end if;
    if not adm and new.deadline is not null and new.deadline < current_date + 14 then
      raise exception 'Choose an apply-by date at least two weeks from today, so professionals have time to apply.';
    end if;
    new.review_note := null;
    perform public.notify_admins('need_submitted', 'A need is waiting for review', new.title, '#admin');
  end if;
  -- A need Handova approved can't be edited: what professionals applied to must stay the same.
  -- To change it, the organisation stops applications and sends a corrected copy for review.
  -- (A later apply-by date goes through request_need_deadline and Handova's approval.)
  if tg_op = 'UPDATE' and not adm and old.status in ('open', 'closed')
     and (new.title, new.description, new.output, new.skills, new.languages, new.hours, new.location, new.country, new.deadline, new.places, new.arrangement)
     is distinct from (old.title, old.description, old.output, old.skills, old.languages, old.hours, old.location, old.country, old.deadline, old.places, old.arrangement) then
    raise exception 'A live need can’t be edited. Stop applications and send a corrected copy for review.';
  end if;
  if tg_op = 'UPDATE' and not adm and new.requested_deadline is not null and new.requested_deadline is distinct from old.requested_deadline
     and coalesce(current_setting('handova.requesting_deadline', true), '') <> 'on' then
    raise exception 'Ask for a new apply-by date from the need’s page.';
  end if;
  return new;
end $function$;

-- 3. A later apply-by date, approved by Handova.
create or replace function public.request_need_deadline(p_need uuid, p_deadline date)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare n public.needs;
begin
  select * into n from public.needs where id = p_need for update;
  if n.id is null or not public.is_org_member(n.organisation_id) then raise exception 'Only the organisation’s team can change this need.'; end if;
  if public.is_suspended((select auth.uid())) then raise exception 'Your account is suspended while Handova looks into a concern.'; end if;
  if n.status <> 'open' then raise exception 'Only an open need can get a new apply-by date.'; end if;
  if p_deadline is null or p_deadline < current_date + 14 then
    raise exception 'Choose an apply-by date at least two weeks from today, so professionals have time to apply.';
  end if;
  if p_deadline > current_date + 180 then raise exception 'Choose a date within the next six months.'; end if;
  perform set_config('handova.requesting_deadline', 'on', true);
  update public.needs set requested_deadline = p_deadline where id = p_need;
  perform set_config('handova.requesting_deadline', '', true);
  perform public.notify_admins('need_deadline', 'A new apply-by date to approve',
    n.title || ': ' || to_char(p_deadline, 'DD Mon YYYY'), '#admin');
end $function$;
revoke all on function public.request_need_deadline(uuid, date) from public, anon;
grant execute on function public.request_need_deadline(uuid, date) to authenticated;

create or replace function public.admin_review_need_deadline(p_need uuid, p_approve boolean, p_note text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare n public.needs;
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  select * into n from public.needs where id = p_need for update;
  if n.id is null or n.requested_deadline is null then raise exception 'There is no new apply-by date waiting for this need.'; end if;
  if p_approve and n.status <> 'open' then raise exception 'This need is no longer open.'; end if;
  if p_approve then
    update public.needs set deadline = n.requested_deadline, requested_deadline = null, updated_at = now() where id = p_need;
  else
    update public.needs set requested_deadline = null where id = p_need;
  end if;
  perform public.notify_org(n.organisation_id, 'need_decision',
    case when p_approve then 'Your new apply-by date is live' else 'Your new apply-by date was not approved' end,
    coalesce(nullif(trim(coalesce(p_note, '')), ''), n.title || case when p_approve then ': professionals can apply until ' || to_char(n.requested_deadline, 'DD Mon YYYY') || '.' else '' end),
    '#org/needs/' || p_need);
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), case when p_approve then 'need_deadline_approved' else 'need_deadline_declined' end, 'need', p_need,
      jsonb_build_object('title', n.title, 'from', n.deadline, 'to', n.requested_deadline, 'note', p_note));
end $function$;
revoke all on function public.admin_review_need_deadline(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_need_deadline(uuid, boolean, text) to authenticated;

-- 3b. Three days before the apply-by date, the organisation is reminded once.
create or replace function public.need_deadline_reminders()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare k integer;
begin
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select m.user_id, 'apply_by_soon', 'Applications close in 3 days',
    nd.title || '. Need more time to find someone? Ask for a later apply-by date on the need’s page.', '#org/needs/' || nd.id, nd.id
  from public.needs nd join public.organisation_members m on m.organisation_id = nd.organisation_id
  where nd.status = 'open' and nd.deadline = current_date + 3 and nd.requested_deadline is null
    and not exists (select 1 from public.notifications x where x.kind = 'apply_by_soon' and x.ref = nd.id and x.user_id = m.user_id);
  get diagnostics k = row_count;
  return k;
end $function$;
revoke all on function public.need_deadline_reminders() from public, anon, authenticated;

-- 4. Reminders for sign-ups that never finished.
create or replace function public.signup_reminders()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare n integer := 0; k integer;
begin
  -- Account but no profile and no organisation.
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select u.id, r.kind,
    case when u.raw_user_meta_data->>'role' = 'organisation' then 'Finish setting up your organisation' else 'Finish your Handova profile' end,
    case when u.raw_user_meta_data->>'role' = 'organisation'
      then 'Your account is ready. Add your organisation’s details so Handova can review it and you can post needs.'
      else 'Your account is ready. Add your profile and send it for review, so organisations can find you and you can apply to needs.' end,
    '#onboarding', u.id
  from auth.users u
  cross join (values ('finish_signup_1', interval '1 day'), ('finish_signup_2', interval '7 days')) r(kind, after)
  where u.email_confirmed_at is not null and u.created_at < now() - r.after and u.created_at > now() - interval '30 days'
    and not exists (select 1 from public.profiles p where p.user_id = u.id)
    and not exists (select 1 from public.organisation_members m where m.user_id = u.id)
    and not exists (select 1 from public.admins a where a.user_id = u.id)
    and not public.is_suspended(u.id)
    and not exists (select 1 from public.notifications x where x.user_id = u.id and x.kind = r.kind)
    -- The second reminder only a week after the first, never both at once.
    and (r.kind = 'finish_signup_1' or exists (select 1 from public.notifications x where x.user_id = u.id and x.kind = 'finish_signup_1' and x.created_at < now() - interval '6 days'));
  get diagnostics k = row_count; n := n + k;
  -- A profile saved but never sent for review.
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select p.user_id, r.kind, 'Your profile is ready to send for review',
    'It is private, so Handova can’t review it and organisations can’t find you yet. Open your profile, tick “Send my profile for review” and save.',
    '#workspace/profile', p.user_id
  from public.profiles p
  cross join (values ('profile_unsent_1', interval '1 day'), ('profile_unsent_2', interval '7 days')) r(kind, after)
  where not p.published and p.review_status = 'draft' and p.closed_at is null
    and p.created_at < now() - r.after and p.created_at > now() - interval '30 days'
    and not public.is_suspended(p.user_id)
    and not exists (select 1 from public.notifications x where x.user_id = p.user_id and x.kind = r.kind)
    and (r.kind = 'profile_unsent_1' or exists (select 1 from public.notifications x where x.user_id = p.user_id and x.kind = 'profile_unsent_1' and x.created_at < now() - interval '6 days'));
  get diagnostics k = row_count; n := n + k;
  return n;
end $function$;
revoke all on function public.signup_reminders() from public, anon, authenticated;

-- Admin → Unfinished sign-ups.
create or replace function public.admin_unfinished_signups()
 returns table (user_id uuid, email text, role text, name text, stage text, signed_up_at timestamptz, email_confirmed boolean, last_reminded_at timestamptz, reminders integer)
 language plpgsql stable security definer set search_path to ''
as $function$
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  return query
  select u.id, u.email::text, coalesce(u.raw_user_meta_data->>'role', ''), coalesce(p.name, u.raw_user_meta_data->>'full_name', ''),
    case when p.user_id is null then 'no_profile' else 'not_sent' end,
    u.created_at, u.email_confirmed_at is not null,
    (select max(x.created_at) from public.notifications x where x.user_id = u.id and (x.kind like 'finish_signup%' or x.kind like 'profile_unsent%' or x.kind = 'signup_reminder')),
    (select count(*)::integer from public.notifications x where x.user_id = u.id and (x.kind like 'finish_signup%' or x.kind like 'profile_unsent%' or x.kind = 'signup_reminder'))
  from auth.users u left join public.profiles p on p.user_id = u.id
  where not exists (select 1 from public.organisation_members m where m.user_id = u.id)
    and not exists (select 1 from public.admins a where a.user_id = u.id)
    and (p.user_id is null or (not p.published and p.review_status = 'draft' and p.closed_at is null))
  order by u.created_at desc;
end $function$;
revoke all on function public.admin_unfinished_signups() from public, anon;
grant execute on function public.admin_unfinished_signups() to authenticated;

create or replace function public.admin_send_signup_reminder(p_user uuid)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare u record; has_profile boolean;
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  select id, raw_user_meta_data->>'role' as role, email_confirmed_at into u from auth.users where id = p_user;
  if u.id is null then raise exception 'Account not found.'; end if;
  if u.email_confirmed_at is null then raise exception 'This person hasn’t confirmed their email yet, so a reminder can’t reach them.'; end if;
  if exists (select 1 from public.notifications x where x.user_id = p_user and x.kind = 'signup_reminder' and x.created_at > now() - interval '1 day') then
    raise exception 'A reminder already went out in the last 24 hours.';
  end if;
  has_profile := exists (select 1 from public.profiles p where p.user_id = p_user);
  insert into public.notifications (user_id, kind, title, body, link, ref)
  values (p_user, 'signup_reminder',
    case when has_profile then 'Your profile is ready to send for review' when u.role = 'organisation' then 'Finish setting up your organisation' else 'Finish your Handova profile' end,
    case when has_profile then 'It is private, so Handova can’t review it and organisations can’t find you yet. Open your profile, tick “Send my profile for review” and save.'
         when u.role = 'organisation' then 'Your account is ready. Add your organisation’s details so Handova can review it and you can post needs.'
         else 'Your account is ready. Add your profile and send it for review, so organisations can find you and you can apply to needs.' end,
    case when has_profile then '#workspace/profile' else '#onboarding' end, p_user);
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), 'signup_reminder_sent', 'profile', p_user, '{}'::jsonb);
end $function$;
revoke all on function public.admin_send_signup_reminder(uuid) from public, anon;
grant execute on function public.admin_send_signup_reminder(uuid) to authenticated;

select cron.schedule('handova-signup-reminders', '50 1 * * *', 'select public.signup_reminders()');
select cron.schedule('handova-deadline-reminders', '25 3 * * *', 'select public.need_deadline_reminders()');
