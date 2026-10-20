-- Re-audit 20 Oct 2026: A15 (database part) and A20 (server part).

-- ---------- A15: a suspended or removed person can't undo it or act for an organisation ----------
-- (Already blocked: messages, applications, invitations, logging hours, signing.)
-- Now also blocked while a suspension or removal is active: publishing their profile, reviewing hours, completing or
-- correcting an endorsement, and saving needs or their safety notes. Handova admins and scheduled jobs are not affected.

-- Publishing: checked against the profile's owner.
create or replace function public.profile_suspension_guard()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if new.published and (tg_op = 'INSERT' or not old.published) and public.is_suspended(new.user_id) and not public.is_admin() then
    raise exception 'Your account is suspended while Handova looks into a concern, so your profile can’t be published. Write to safeguarding@handova.org if you have questions.';
  end if;
  return new;
end $function$;
revoke all on function public.profile_suspension_guard() from public, anon, authenticated;
-- Triggers named "<table>_a_…" run before the other checks (BEFORE triggers run in name order), so a suspended
-- person sees why they are blocked.
create or replace trigger profiles_a_suspension_guard before insert or update on public.profiles for each row execute function public.profile_suspension_guard();

-- Reviewing or correcting hours (review_hours, amend_hours).
create or replace trigger hours_update_suspension_guard before update on public.hours for each row execute function public.suspension_guard();

-- Completing a contribution with its endorsement, or correcting the endorsement (complete_engagement, edit_endorsement).
create or replace trigger engagements_endorsement_suspension_guard before update on public.engagements for each row
  when ((old.status is distinct from 'completed' and new.status = 'completed')
    or new.endorsement is distinct from old.endorsement
    or new.deliverables is distinct from old.deliverables
    or new.confirmed_skills is distinct from old.confirmed_skills)
  execute function public.suspension_guard();

-- Saving needs and their safety notes.
create or replace trigger needs_a_suspension_guard before insert or update on public.needs for each row execute function public.suspension_guard();
create or replace trigger need_safety_notes_suspension_guard before insert or update on public.need_safety_notes for each row execute function public.suspension_guard();

-- Lifting a suspension: the profile goes back through review. It stays offline (it was taken offline when the
-- suspension started) and returns to draft, so the next "Send my profile for review and publish it" puts it in
-- Handova's review queue instead of straight back online.
create or replace function public.admin_lift_suspension(p_user uuid, p_note text)
 returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  update public.user_suspensions set lifted_at = now() where user_id = p_user and lifted_at is null;
  if not found then raise exception 'This person is not suspended.'; end if;
  update public.profiles set published = false, review_status = 'draft'
    where user_id = p_user and (published or review_status in ('approved', 'pending'));
  insert into public.admin_actions(admin_id, action, target_type, target_id, detail)
  values (auth.uid(), 'suspension_lifted', 'profile', p_user, jsonb_build_object('note', left(coalesce(p_note, ''), 1000)));
  perform public.notify(p_user, 'account', 'Your Handova account is active again',
    'Thank you for your patience. If you have a professional profile, send it for review from your workspace; Handova checks it before it goes back online.', '#workspace');
end $function$;
revoke all on function public.admin_lift_suspension(uuid, text) from public, anon;
grant execute on function public.admin_lift_suspension(uuid, text) to authenticated;

-- ---------- A20: admin deletions keep the evidence of an open report ----------
create or replace function public.admin_delete_organisation(p_org uuid, p_confirm text, p_reason text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare o record;
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  select * into o from public.organisations where id = p_org for update;
  if o.id is null then raise exception 'Organisation not found.'; end if;
  if trim(coalesce(p_confirm, '')) <> o.name then raise exception 'Type the organisation’s name exactly to confirm.'; end if;
  if exists (select 1 from public.reports r where r.status <> 'resolved' and (
       (r.target_type = 'organisation' and r.target_id = p_org)
    or (r.target_type = 'need' and exists (select 1 from public.needs n where n.id = r.target_id and n.organisation_id = p_org))
    or (r.target_type = 'conversation' and exists (select 1 from public.conversations c join public.needs n on n.id = c.need_id where c.id = r.target_id and n.organisation_id = p_org))
    or (r.target_type = 'contribution' and exists (select 1 from public.engagements e where e.id = r.target_id and e.organisation_id = p_org)))) then
    raise exception 'A report about this organisation, one of its needs or one of its conversations is still open. Resolve the report first, so the evidence is kept.';
  end if;
  if exists (select 1 from public.engagements e where e.organisation_id = p_org) then
    raise exception 'This organisation has contribution records. Professionals rely on them for their impact CVs and the signed agreements must be kept, so suspend it instead.';
  end if;
  -- Close open needs first, so anyone who applied is told.
  update public.needs set status = 'closed' where organisation_id = p_org and status = 'open';
  perform public.notify_org(p_org, 'org_decision', 'Your organisation was removed from Handova', coalesce(nullif(trim(p_reason), ''), 'Contact hello@handova.org if you have questions.'), '#onboarding');
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), 'org_deleted', 'organisation', p_org, jsonb_build_object('name', o.name, 'country', o.country, 'reason', coalesce(p_reason, ''),
      'needs', (select count(*) from public.needs where organisation_id = p_org)));
  delete from public.organisations where id = p_org;
end $function$;
revoke all on function public.admin_delete_organisation(uuid, text, text) from public, anon;
grant execute on function public.admin_delete_organisation(uuid, text, text) to authenticated;

create or replace function public.admin_delete_contribution(p_id uuid, p_confirm text, p_reason text, p_test boolean)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare e record;
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  if upper(trim(coalesce(p_confirm, ''))) <> 'DELETE' then raise exception 'Type DELETE to confirm.'; end if;
  select * into e from public.engagements where id = p_id for update;
  if e.id is null then raise exception 'Contribution not found.'; end if;
  if exists (select 1 from public.reports r where r.status <> 'resolved' and (
       (r.target_type = 'contribution' and r.target_id = p_id)
    or (r.target_type = 'conversation' and exists (select 1 from public.conversations c where c.id = r.target_id and c.need_id = e.need_id and c.user_id = e.user_id)))) then
    raise exception 'A report about this contribution or its conversation is still open. Resolve the report first, so the evidence is kept.';
  end if;
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), 'contribution_deleted', 'contribution', p_id, jsonb_build_object('need_title', e.scope->>'need_title', 'organisation', e.scope->>'organisation',
      'professional', e.scope->>'talent', 'status', e.status, 'created_at', e.created_at, 'completed_at', e.completed_at, 'reason', coalesce(p_reason, ''), 'test', coalesce(p_test, false)));
  if coalesce(p_test, false) then delete from public.contribution_signatures where engagement_id = p_id; end if;
  delete from public.notifications where ref = p_id;
  delete from public.engagements where id = p_id;
  if not coalesce(p_test, false) then
    perform public.notify(e.user_id, 'contribution_removed', 'A contribution was removed by Handova', (e.scope->>'need_title') || coalesce(': ' || nullif(trim(p_reason), ''), ''), '#workspace');
    perform public.notify_org(e.organisation_id, 'contribution_removed', 'A contribution was removed by Handova', (e.scope->>'need_title') || coalesce(': ' || nullif(trim(p_reason), ''), ''), '#org');
  end if;
end $function$;
revoke all on function public.admin_delete_contribution(uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_delete_contribution(uuid, text, text, boolean) to authenticated;
