-- Audit fixes, 19 October 2026.
-- 1. Report a concern: the daily limit no longer reads reports from inside its own policy (it failed for everyone).
-- 2. (see 20261019000600_conversation_retention.sql)
-- 3. "Partly delivered" can be completed without an endorsement; a corrected endorsement waits for the professional again.
-- 4. A need can't go from draft or review straight to closed (closed needs are public).
-- 5. Signature records: organisations and professionals see the signer's name, role, focal point and version,
--    not each other's email, IP address or browser. The professional can now see the organisation's focal point.
-- 6. Tighter table privileges, indexes on foreign keys.

-- 1. Report a concern
create or replace function public.reports_last_day()
 returns integer language sql stable security definer set search_path to ''
as $function$
  select count(*)::int from public.reports r where r.reporter_id = auth.uid() and r.created_at > now() - interval '1 day'
$function$;
revoke all on function public.reports_last_day() from public, anon;
grant execute on function public.reports_last_day() to authenticated;
alter policy reports_insert on public.reports with check (
  (target_type <> 'conversation' or public.is_conversation_party(target_id)) and public.reports_last_day() < 10);

-- 3. Endorsements
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
    endorsement = endorse, endorsement_language = nullif(trim(coalesce(p_language, '')), ''),
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
  if endorse = '' and e.delivered_as_agreed <> 'partly' then raise exception 'Write an endorsement of at least 100 characters.'; end if;
  if endorse <> '' and (length(endorse) < 100 or length(endorse) > 1200) then raise exception 'The endorsement must be 100 to 1,200 characters.'; end if;
  update public.engagements set deliverables = trim(p_deliverables), endorsement = endorse, confirmed_skills = skills, endorsement_edited_at = now(), public = false where id = p_id;
  perform public.notify(e.user_id, 'endorsement_corrected', 'Your endorsement was corrected', (e.scope->>'need_title') || '. Read it and choose whether it appears on your impact CV.', '#workspace');
end $function$;

-- 4. Needs
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

-- 5. Signature records
alter policy contribution_signatures_read on public.contribution_signatures using (
  user_id = (select auth.uid()) or public.is_org_member(organisation_id) or public.is_admin()
  or exists (select 1 from public.engagements e where e.id = engagement_id and e.user_id = (select auth.uid()))
);
revoke select on public.contribution_signatures from authenticated;
grant select (id, engagement_id, organisation_id, party, full_name, signer_role, focal_point_name, focal_point_contact,
  version, text_sha256, language, signed_at) on public.contribution_signatures to authenticated;

-- 6. Privileges and indexes
revoke all on public.admin_actions, public.completion_private, public.survey_responses, public.user_private from anon, authenticated;
grant select on public.admin_actions, public.completion_private, public.survey_responses, public.user_private to authenticated;
do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t);
  end loop;
end $$;
revoke execute on function public.user_private_cleanup() from public, anon, authenticated;

create index if not exists admin_actions_admin_id_idx on public.admin_actions (admin_id);
create index if not exists contribution_signatures_user_id_idx on public.contribution_signatures (user_id);
create index if not exists conversations_user_id_idx on public.conversations (user_id);
create index if not exists engagements_ended_by_idx on public.engagements (ended_by);
create index if not exists engagements_endorsed_by_idx on public.engagements (endorsed_by);
create index if not exists engagements_first_call_by_idx on public.engagements (first_call_by);
create index if not exists engagements_org_signed_by_idx on public.engagements (org_signed_by);
create index if not exists hours_reviewed_by_idx on public.hours (reviewed_by);
create index if not exists hours_user_id_idx on public.hours (user_id);
create index if not exists invitations_invited_by_idx on public.invitations (invited_by);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists reports_reporter_id_idx on public.reports (reporter_id);
create index if not exists saved_needs_need_id_idx on public.saved_needs (need_id);
create index if not exists survey_responses_respondent_idx on public.survey_responses (respondent);
create index if not exists notifications_kind_ref_user_idx on public.notifications (kind, ref, user_id);
