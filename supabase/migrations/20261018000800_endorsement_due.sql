-- Nobody keeps the work without giving something back.
-- 1) The professional can say "I've delivered everything". 2) Once the work is delivered (all agreed hours approved, or the
-- professional said so), the organisation is reminded after 7 and 14 days and Handova is told after 30. 3) More than 14 days
-- overdue: no new needs can be sent for review until the endorsement is done. 4) Once all agreed hours are approved, the
-- organisation can no longer end the contribution early; Handova is told about every early end. 5) "Partly" still needs a skill.

alter table public.engagements add column if not exists talent_delivered_at timestamptz;

-- When all the agreed hours were approved (and none are waiting), or null.
create or replace function public.hours_ready_at(p_id uuid)
 returns timestamptz language sql stable security definer set search_path to ''
as $$
  select max(h.reviewed_at) from public.hours h join public.engagements e on e.id = h.engagement_id
  where h.engagement_id = p_id and h.status = 'approved'
    and not exists (select 1 from public.hours p where p.engagement_id = p_id and p.status = 'pending')
  having coalesce(sum(h.hours), 0) >= max(nullif((e.scope->>'hours')::numeric, 0));
$$;
-- Since when an active contribution has been waiting for the organisation to finish and endorse it, or null.
create or replace function public.endorsement_due_since(p_id uuid)
 returns timestamptz language sql stable security definer set search_path to ''
as $$
  select case when e.status = 'active' then least(e.talent_delivered_at, public.hours_ready_at(e.id)) end
  from public.engagements e where e.id = p_id;
$$;
create or replace function public.endorsement_overdue(p_org uuid)
 returns boolean language sql stable security definer set search_path to ''
as $$
  select exists (select 1 from public.engagements e where e.organisation_id = p_org and e.status = 'active'
    and public.endorsement_due_since(e.id) < now() - interval '14 days');
$$;
revoke all on function public.hours_ready_at(uuid) from public, anon, authenticated;
revoke all on function public.endorsement_due_since(uuid) from public, anon, authenticated;
revoke all on function public.endorsement_overdue(uuid) from public, anon, authenticated;

-- The professional says the work is delivered.
create or replace function public.mark_delivered(p_id uuid)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare e record;
begin
  select * into e from public.engagements where id = p_id for update;
  if e.id is null or e.user_id is distinct from auth.uid() then raise exception 'Only the professional can say the work is delivered.'; end if;
  if e.status <> 'active' then raise exception 'This contribution is not in progress.'; end if;
  if e.talent_delivered_at is not null then raise exception 'You have already told the organisation.'; end if;
  update public.engagements set talent_delivered_at = now() where id = p_id;
  perform public.notify_org(e.organisation_id, 'delivered', coalesce(e.scope->>'talent', 'The professional') || ' has delivered everything',
    (e.scope->>'need_title') || ': please check the work, then finish and write the endorsement.', '#org/needs/' || e.need_id);
end $function$;
revoke all on function public.mark_delivered(uuid) from public, anon;
grant execute on function public.mark_delivered(uuid) to authenticated;

-- Ending early: not for the organisation once all agreed hours are approved; Handova is always told.
create or replace function public.end_engagement(p_id uuid, p_reason text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare e record;
begin
  select * into e from public.engagements where id = p_id for update;
  if e.id is null or not (e.user_id = auth.uid() or public.is_org_member(e.organisation_id)) then raise exception 'You are not a party to this contribution.'; end if;
  if e.status not in ('awaiting_signatures', 'active') then raise exception 'This contribution has already finished.'; end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'Give a short reason for ending the contribution.'; end if;
  if e.user_id is distinct from auth.uid() and e.status = 'active' and public.hours_ready_at(e.id) is not null then
    raise exception 'All the agreed hours are approved, so the work is finished. Complete it and write the endorsement instead. If something is wrong, contact Handova.';
  end if;
  update public.engagements set status = 'ended', end_reason = left(trim(p_reason), 1000), ended_at = now(), ended_by = auth.uid() where id = p_id;
  update public.conversations set status = 'closed', closed_reason = 'Contribution ended', closed_at = now() where need_id = e.need_id and user_id = e.user_id;
  perform public.notify(e.user_id, 'ended', 'A contribution was ended', (e.scope->>'need_title') || ': ' || left(trim(p_reason), 300), '#workspace');
  perform public.notify_org(e.organisation_id, 'ended', 'A contribution was ended', (e.scope->>'need_title') || ': ' || left(trim(p_reason), 300), '#org');
  perform public.notify_admins('ended', 'A contribution was ended early', (e.scope->>'need_title') || ': ' || left(trim(p_reason), 300), '#admin');
end $function$;

-- Daily reminders (first call, unanswered messages, and now: endorsements waiting).
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
  return n;
end $function$;

-- "Partly" still confirms at least one skill; the professional is told how to respond if it feels unfair.
create or replace function public.complete_engagement(p_id uuid, p_delivered text, p_deliverables text, p_skills text[], p_endorsement text,
  p_language text, p_role text, p_name text, p_show_name boolean, p_note text, p_work_again text, p_work_again_note text, p_confirm boolean)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare e record; skills text[]; endorse text := trim(coalesce(p_endorsement, ''));
begin
  select * into e from public.engagements where id = p_id for update;
  if e.id is null or not public.is_org_member(e.organisation_id) then raise exception 'You cannot complete this contribution.'; end if;
  if e.status <> 'active' then raise exception 'Only an active contribution can be completed.'; end if;
  if p_delivered not in ('all', 'partly') then raise exception 'Say whether the agreed work was delivered.'; end if;
  if length(trim(coalesce(p_deliverables, ''))) < 10 then raise exception 'Describe what was handed over.'; end if;
  skills := array(select distinct trim(s) from unnest(coalesce(p_skills, '{}')) s where trim(s) <> '');
  if cardinality(skills) > 3 then raise exception 'Choose up to 3 skills.'; end if;
  if cardinality(skills) < 1 then raise exception 'Choose at least one skill you saw in this work.'; end if;
  if p_delivered = 'all' then
    if length(endorse) < 100 then raise exception 'Write an endorsement of at least 100 characters.'; end if;
  elsif endorse <> '' and length(endorse) < 100 then
    raise exception 'Write at least 100 characters, or leave the endorsement empty.';
  end if;
  if length(endorse) > 1200 then raise exception 'Keep the endorsement under 1,200 characters.'; end if;
  if length(trim(coalesce(p_role, ''))) < 2 then raise exception 'Add your role.'; end if;
  if p_work_again not in ('yes', 'right_need', 'no') then raise exception 'Answer the question for Handova.'; end if;
  if p_confirm is not true then raise exception 'Confirm the endorsement is accurate and private details are left out.'; end if;
  if exists (select 1 from public.hours h where h.engagement_id = p_id and h.status = 'pending') then raise exception 'Review all pending hours first.'; end if;

  update public.engagements set status = 'completed', completed_at = now(), followup_due = (now() + interval '6 months')::date,
    delivered_as_agreed = p_delivered, deliverables = trim(p_deliverables), confirmed_skills = skills,
    endorsement = nullif(endorse, ''), endorsement_language = nullif(trim(coalesce(p_language, '')), ''),
    endorsed_by_role = trim(p_role), endorsed_by = auth.uid(), endorser_name = nullif(trim(coalesce(p_name, '')), ''),
    show_endorser_name = coalesce(p_show_name, true), note_to_professional = nullif(left(trim(coalesce(p_note, '')), 600), ''), rating = null
  where id = p_id;
  insert into public.completion_private (engagement_id, work_again, note) values (p_id, p_work_again, nullif(left(trim(coalesce(p_work_again_note, '')), 600), ''))
    on conflict (engagement_id) do update set work_again = excluded.work_again, note = excluded.note;
  update public.conversations set status = 'closed', closed_reason = 'Contribution completed', closed_at = now() where need_id = e.need_id and user_id = e.user_id;
  perform public.notify(e.user_id, 'completed', 'Your endorsement from ' || coalesce(e.scope->>'organisation', 'the organisation') || ' is ready',
    (e.scope->>'need_title') || case when p_delivered = 'partly' then '. The organisation marked the work as partly delivered. If that feels unfair, you can ask for a correction or report a concern.' else '. Read it and choose whether it appears on your impact CV.' end, '#workspace');
  if p_work_again = 'no' then
    perform public.notify_admins('work_again_no', 'An organisation would not welcome a professional again', e.scope->>'need_title', '#admin');
  end if;
end $function$;
revoke all on function public.complete_engagement(uuid, text, text, text[], text, text, text, text, boolean, text, text, text, boolean) from public, anon;
grant execute on function public.complete_engagement(uuid, text, text, text[], text, text, text, text, boolean, text, text, text, boolean) to authenticated;


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

-- Handova's list of finished work still waiting for an endorsement.
create or replace function public.admin_endorsements_waiting()
 returns table(id uuid, organisation text, talent text, need_title text, since timestamptz, talent_delivered boolean)
 language plpgsql stable security definer set search_path to ''
as $function$
begin
  if not public.is_admin() then raise exception 'Only Handova can see this list.'; end if;
  return query select e.id, e.scope->>'organisation', e.scope->>'talent', e.scope->>'need_title', public.endorsement_due_since(e.id), e.talent_delivered_at is not null
    from public.engagements e where e.status = 'active' and public.endorsement_due_since(e.id) is not null order by 5;
end $function$;
revoke all on function public.admin_endorsements_waiting() from public, anon;
grant execute on function public.admin_endorsements_waiting() to authenticated;
