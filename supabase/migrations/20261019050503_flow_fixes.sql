-- Flow fixes from the 19 October 2026 audit.
-- 1. An organisation asked for more details goes back into review when it saves its profile, and Handova is told.
-- 2. Suspended or rejected organisations can't send needs for review.
-- 3. A professional can correct a time entry the organisation returned; it goes back for review.
-- 4. A corrected endorsement keeps 1 to 3 confirmed skills.
-- 5. Daily reminders: unsigned agreements (3 days, Handova at 14) and open needs past their apply-by date.
-- 6. Report a concern: the person who reported gets an acknowledgement; sexual exploitation and abuse reports are flagged urgent.

create or replace function public.org_change_guard()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if old.status = 'approved' and (new.name, new.website, new.summary, new.ethical_bridge_url, new.country, new.org_type, new.logo_url)
     is distinct from (old.name, old.website, old.summary, old.ethical_bridge_url, old.country, old.org_type, old.logo_url) then
    perform public.notify_admins('org_changed', 'Approved organisation updated', new.name, '#organisations/' || new.id);
  end if;
  -- Asked for more details: saving the profile sends it back to Handova.
  if old.status = 'changes_requested' and new.status = 'changes_requested' and not public.is_admin() then
    new.status := 'pending';
    perform public.notify_admins('org_review', 'Organisation updated and ready for review', new.name, '#admin');
  end if;
  return new;
end $function$;

create or replace function public.need_guard()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
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
    if new.deadline is not null and new.deadline < current_date then raise exception 'Choose a deadline in the future.'; end if;
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
    new.review_note := null;
    perform public.notify_admins('need_submitted', 'A need is waiting for review', new.title, '#admin');
  end if;
  -- A need Handova approved can't be edited: what professionals applied to must stay the same.
  -- To change it, the organisation stops applications and sends a corrected copy for review.
  if tg_op = 'UPDATE' and not adm and old.status in ('open', 'closed')
     and (new.title, new.description, new.output, new.skills, new.languages, new.hours, new.location, new.country, new.deadline, new.places, new.arrangement)
     is distinct from (old.title, old.description, old.output, old.skills, old.languages, old.hours, old.location, old.country, old.deadline, old.places, old.arrangement) then
    raise exception 'A live need can’t be edited. Stop applications and send a corrected copy for review.';
  end if;
  return new;
end $function$;

create or replace function public.amend_hours(p_id uuid, p_date date, p_hours numeric, p_description text, p_evidence text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare h record; e record;
begin
  select * into h from public.hours where id = p_id for update;
  if h.id is null or h.user_id is distinct from auth.uid() then raise exception 'You cannot change this entry.'; end if;
  if h.status <> 'changes_requested' then raise exception 'Only entries the organisation returned can be corrected.'; end if;
  select * into e from public.engagements where id = h.engagement_id;
  if e.status <> 'active' then raise exception 'This contribution is no longer active.'; end if;
  if p_date is null or p_date > current_date then raise exception 'Choose a date that is not in the future.'; end if;
  if p_hours is null or p_hours <= 0 or p_hours > 12 then raise exception 'Log between 0.5 and 12 hours.'; end if;
  if length(trim(coalesce(p_description, ''))) < 10 then raise exception 'Describe the work in at least 10 characters.'; end if;
  if coalesce(p_evidence, '') <> '' and p_evidence !~ '^https://' then raise exception 'Links must start with https://'; end if;
  if (select coalesce(sum(x.hours), 0) from public.hours x where x.user_id = h.user_id and x.work_date = p_date and x.status <> 'changes_requested' and x.id <> p_id) + p_hours > 12 then
    raise exception 'You can log up to 12 hours in one day.';
  end if;
  update public.hours set work_date = p_date, hours = p_hours, description = trim(p_description), evidence = coalesce(p_evidence, ''),
    status = 'pending', reviewed_by = null, reviewed_at = null where id = p_id;
  perform public.notify_org(e.organisation_id, 'hours', 'Corrected hours to review', e.scope->>'need_title', '#org');
end $function$;
revoke all on function public.amend_hours(uuid, date, numeric, text, text) from public, anon;
grant execute on function public.amend_hours(uuid, date, numeric, text, text) to authenticated;

create or replace function public.edit_endorsement(p_id uuid, p_deliverables text, p_endorsement text, p_skills text[])
 returns void language plpgsql security definer set search_path to ''
as $function$
declare e record; skills text[]; endorse text := trim(coalesce(p_endorsement, ''));
begin
  select * into e from public.engagements where id = p_id for update;
  if e.id is null or not public.is_org_member(e.organisation_id) then raise exception 'You cannot edit this endorsement.'; end if;
  if e.correction_requested_at is null then raise exception 'Endorsements can be edited only when the professional asks for a correction.'; end if;
  if e.endorsement_edited_at is not null then raise exception 'This endorsement has already been corrected.'; end if;
  if now() > e.correction_requested_at + interval '14 days' then raise exception 'The 14 days to correct this endorsement have passed.'; end if;
  if length(trim(coalesce(p_deliverables, ''))) < 10 then raise exception 'Describe what was handed over.'; end if;
  skills := array(select distinct trim(s) from unnest(coalesce(p_skills, '{}')) s where trim(s) <> '');
  if cardinality(skills) > 3 then raise exception 'Choose up to 3 skills.'; end if;
  if cardinality(skills) < 1 then raise exception 'Choose at least one skill you saw in this work.'; end if;
  if endorse = '' and e.delivered_as_agreed <> 'partly' then raise exception 'Write an endorsement of at least 100 characters.'; end if;
  if endorse <> '' and (length(endorse) < 100 or length(endorse) > 1200) then raise exception 'The endorsement must be 100 to 1,200 characters.'; end if;
  update public.engagements set deliverables = trim(p_deliverables), endorsement = endorse, confirmed_skills = skills, endorsement_edited_at = now(), public = false where id = p_id;
  perform public.notify(e.user_id, 'endorsement_corrected', 'Your endorsement was corrected', (e.scope->>'need_title') || '. Read it and choose whether it appears on your impact CV.', '#workspace');
end $function$;

create or replace function public.kickoff_reminders()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare n integer := 0; k integer;
begin
  -- No first call recorded a week after both signed (once per contribution).
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select x.uid, 'first_call_reminder', 'Have you had your first call yet?', e.scope->>'need_title', '#agreement/' || e.id, e.id
  from public.engagements e
  cross join lateral (select e.user_id as uid union select m.user_id from public.organisation_members m where m.organisation_id = e.organisation_id) x
  where e.status = 'active' and e.first_call_at is null and greatest(e.org_signed_at, e.talent_signed_at) < now() - interval '7 days'
    and x.uid is not null
    and not exists (select 1 from public.notifications r where r.kind = 'first_call_reminder' and r.ref = e.id and r.user_id = x.uid);
  get diagnostics k = row_count; n := n + k;
  -- A message unanswered for 5 days, in a live contribution (once per message).
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select x.uid, 'reply_reminder', 'Someone is waiting for your reply', nd.title, '#conversation/' || c.id, lm.id
  from public.conversations c
  join public.needs nd on nd.id = c.need_id
  join public.engagements e on e.need_id = c.need_id and e.user_id = c.user_id and e.status in ('awaiting_signatures', 'active')
  cross join lateral (select m.id, m.sender_id, m.created_at from public.messages m where m.conversation_id = c.id and m.kind = 'user' order by m.created_at desc limit 1) lm
  cross join lateral (
    select c.user_id as uid where lm.sender_id is distinct from c.user_id
    union select om.user_id from public.organisation_members om where om.organisation_id = nd.organisation_id and lm.sender_id = c.user_id
  ) x
  where c.status = 'open' and lm.created_at < now() - interval '5 days'
    and not exists (select 1 from public.notifications r where r.kind = 'reply_reminder' and r.ref = lm.id and r.user_id = x.uid);
  get diagnostics k = row_count; n := n + k;
  -- Work delivered but not endorsed: the organisation after 7 and 14 days (once each), Handova after 30.
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select m.user_id, r.kind, r.title, (e.scope->>'talent') || ' · ' || (e.scope->>'need_title'), '#org/needs/' || e.need_id, e.id
  from public.engagements e
  cross join lateral (select public.endorsement_due_since(e.id) as since) d
  cross join lateral (values
    ('endorse_reminder_7', 'Please finish and endorse the work', interval '7 days'),
    ('endorse_reminder_14', 'Finish and endorse the work to keep posting needs', interval '14 days')) r(kind, title, after)
  join public.organisation_members m on m.organisation_id = e.organisation_id
  where e.status = 'active' and d.since < now() - r.after
    and not exists (select 1 from public.notifications x where x.kind = r.kind and x.ref = e.id and x.user_id = m.user_id);
  get diagnostics k = row_count; n := n + k;
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select a.user_id, 'endorse_overdue', 'An endorsement is 30 days overdue', (e.scope->>'organisation') || ' · ' || (e.scope->>'need_title'), '#admin', e.id
  from public.engagements e cross join public.admins a
  where e.status = 'active' and public.endorsement_due_since(e.id) < now() - interval '30 days'
    and not exists (select 1 from public.notifications x where x.kind = 'endorse_overdue' and x.ref = e.id and x.user_id = a.user_id);
  get diagnostics k = row_count; n := n + k;
  -- Two days after a contribution is finished: a reminder of the two-minute questionnaire, once, if not answered or skipped.
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select x.uid, 'survey_reminder', 'Two minutes: how did it go?', e.scope->>'need_title', x.link, e.id
  from public.engagements e
  cross join lateral (
    select e.user_id as uid, '#workspace' as link, 'professional' as k
    union all select m.user_id, '#org', 'organisation' from public.organisation_members m where m.organisation_id = e.organisation_id
  ) x
  where e.status = 'completed' and e.completed_at < now() - interval '2 days' and e.completed_at > now() - interval '30 days' and x.uid is not null
    and not exists (select 1 from public.survey_responses r where r.engagement_id = e.id and r.kind = x.k)
    and not exists (select 1 from public.notifications r where r.kind = 'survey_reminder' and r.ref = e.id and r.user_id = x.uid);
  get diagnostics k = row_count; n := n + k;
  -- An agreement waiting for a signature for 3 days: a reminder to whoever hasn't signed (once). Handova after 14 days.
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select x.uid, 'sign_reminder', 'Your contribution agreement is waiting for your signature', e.scope->>'need_title', '#agreement/' || e.id, e.id
  from public.engagements e
  cross join lateral (
    select e.user_id as uid where e.talent_signed_at is null
    union select m.user_id from public.organisation_members m where m.organisation_id = e.organisation_id and e.org_signed_at is null
  ) x
  where e.status = 'awaiting_signatures' and e.created_at < now() - interval '3 days' and x.uid is not null
    and not exists (select 1 from public.notifications r where r.kind = 'sign_reminder' and r.ref = e.id and r.user_id = x.uid);
  get diagnostics k = row_count; n := n + k;
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select a.user_id, 'sign_overdue', 'An agreement has waited 14 days for a signature', (e.scope->>'organisation') || ' · ' || (e.scope->>'need_title'), '#admin', e.id
  from public.engagements e cross join public.admins a
  where e.status = 'awaiting_signatures' and e.created_at < now() - interval '14 days'
    and not exists (select 1 from public.notifications x where x.kind = 'sign_overdue' and x.ref = e.id and x.user_id = a.user_id);
  get diagnostics k = row_count; n := n + k;
  -- An open need past its apply-by date: tell the organisation once, so it can choose someone or stop applications.
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select m.user_id, 'apply_by_passed', 'The apply-by date has passed', nd.title || '. Choose someone from the applications, or stop applications so the place is free again.', '#org/needs/' || nd.id, nd.id
  from public.needs nd join public.organisation_members m on m.organisation_id = nd.organisation_id
  where nd.status = 'open' and nd.deadline is not null and nd.deadline < current_date
    and not exists (select 1 from public.notifications x where x.kind = 'apply_by_passed' and x.ref = nd.id and x.user_id = m.user_id);
  get diagnostics k = row_count; n := n + k;
  return n;
end $function$;

create or replace function public.report_notify()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  new.reporter_id = auth.uid();
  perform public.notify_admins('report',
    case when new.reason = 'exploitation' then 'Urgent: sexual exploitation or abuse reported' else 'New concern reported' end,
    new.reason || ' · ' || new.target_type, '#admin');
  if new.reporter_id is not null then
    perform public.notify(new.reporter_id, 'report_received', 'We received your report',
      'Thank you. Our safeguarding lead reads every report and will contact you if we need more information. Reference ' || upper(left(new.id::text, 8)) || '.', '#report');
  end if;
  return new;
end $function$;
