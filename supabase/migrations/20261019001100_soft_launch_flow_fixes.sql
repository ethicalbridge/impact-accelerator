-- Soft-launch flow fixes (19 October 2026, specialist panel audit).
-- 1. A profile sent back with "Ask for changes" returns to review when its owner saves it, and Handova is told.
-- 2. account_deletion_blocker(): the site checks it before deleting an account, so work isn't left stranded while
--    the person has a contribution that is still open, or is the only person managing an organisation with one.
--    The server-side backstop in delete_my_account is in 20261019001200_account_deletion_guard.sql.
-- 3. Handova can close a contribution when the organisation stops responding: the hours the organisation already
--    approved stay on the professional's record, marked "Closed by Handova".

-- 1. Profile review ----------------------------------------------------------------------------------------------
create or replace function public.profile_review_guard()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if new.published and (tg_op = 'INSERT' or not old.published) and not exists (
    select 1 from public.agreement_signatures s where s.user_id = new.user_id and s.kind = 'professional' and s.version = public.current_agreement('professional')
  ) then raise exception 'Please read and sign the Handova professional agreement before publishing your profile.'; end if;
  if new.published then new.closed_at = null; new.closed_reason = ''; end if;
  if tg_op = 'INSERT' then new.review_status = case when new.published then 'pending'::public.review_status else 'draft' end; new.approved_at = null;
  elsif new.published and not old.published and old.review_status in ('draft', 'changes_requested') then new.review_status = 'pending';
  -- The owner saves after Handova asked for changes: back into review (an admin decision changes review_status itself, so it is left alone).
  elsif new.published and old.review_status = 'changes_requested' and new.review_status = old.review_status
    and (select auth.uid()) = new.user_id then new.review_status = 'pending';
  end if;
  if new.review_status = 'pending' and (tg_op = 'INSERT' or old.review_status <> 'pending') then
    perform public.notify_admins('profile_review', case when tg_op = 'UPDATE' and old.review_status = 'changes_requested' then 'Profile updated after your request' else 'Profile to review' end, new.name, '#admin');
  end if;
  return new;
end $function$;

-- 2. Account deletion -------------------------------------------------------------------------------------------
-- The reason the signed-in person can't delete their account yet, or null. The site asks before starting deletion.
create or replace function public.account_deletion_blocker()
 returns text language plpgsql stable security definer set search_path to ''
as $function$
declare uid uuid := auth.uid(); t text; o text;
begin
  if uid is null then return null; end if;
  select e.scope->>'need_title' into t from public.engagements e
    where e.user_id = uid and e.status in ('awaiting_signatures', 'active') order by e.created_at limit 1;
  if t is not null then
    return 'You have a contribution that is still open (' || coalesce(t, 'a contribution') || '). Finish it or end it from its agreement page first, so the organisation is not left waiting.';
  end if;
  select org.name into o from public.organisations org
    where exists (select 1 from public.organisation_members m where m.organisation_id = org.id and m.user_id = uid)
      and not exists (select 1 from public.organisation_members m where m.organisation_id = org.id and m.user_id <> uid)
      and exists (select 1 from public.engagements e where e.organisation_id = org.id and e.status in ('awaiting_signatures', 'active'))
    limit 1;
  if o is not null then
    return 'You are the only person managing ' || o || ', and it has a contribution that is still open. Finish or end it first, or write to hello@handova.org so we can help hand the organisation over.';
  end if;
  return null;
end $function$;
revoke all on function public.account_deletion_blocker() from public, anon;
grant execute on function public.account_deletion_blocker() to authenticated;

-- 3. Handova closes a contribution the organisation abandoned ------------------------------------------------------
alter table public.engagements add column if not exists closed_by_handova timestamptz;

create or replace function public.admin_close_engagement(p_id uuid, p_reason text)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare e record; approved numeric; reason text := left(trim(coalesce(p_reason, '')), 1000);
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  select * into e from public.engagements where id = p_id for update;
  if e.id is null then raise exception 'Contribution not found.'; end if;
  if e.status <> 'active' then raise exception 'Only a contribution in progress can be closed this way.'; end if;
  if length(reason) < 5 then raise exception 'Give a short reason. Both sides will see it.'; end if;
  select coalesce(sum(h.hours), 0) into approved from public.hours h where h.engagement_id = p_id and h.status = 'approved';
  if approved > 0 then
    -- Approved hours stay on the record; there is no endorsement and no six-month check.
    update public.engagements set status = 'completed', completed_at = now(), closed_by_handova = now(), end_reason = reason, followup_due = null where id = p_id;
  else
    update public.engagements set status = 'ended', ended_at = now(), ended_by = auth.uid(), closed_by_handova = now(), end_reason = reason where id = p_id;
  end if;
  update public.conversations set status = 'closed', closed_reason = 'Closed by Handova', closed_at = now() where need_id = e.need_id and user_id = e.user_id and status <> 'closed';
  perform public.notify(e.user_id, 'ended', 'Handova closed a contribution', (e.scope->>'need_title') || case when approved > 0
    then '. The ' || approved || ' hours the organisation approved stay on your record, and you can choose to show it on your impact CV.' else '. No hours had been approved, so it was ended.' end, '#workspace');
  perform public.notify_org(e.organisation_id, 'ended', 'Handova closed a contribution', (e.scope->>'need_title') || ': ' || left(reason, 300), '#org');
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), case when approved > 0 then 'contribution_closed' else 'contribution_ended' end, 'engagement', p_id, jsonb_build_object('reason', reason, 'approved_hours', approved));
  return case when approved > 0 then 'completed' else 'ended' end;
end $function$;
revoke all on function public.admin_close_engagement(uuid, text) from public, anon;
grant execute on function public.admin_close_engagement(uuid, text) to authenticated;

-- The public record says when Handova closed it, so the missing endorsement is explained.
-- A new name (rather than changing public_contributions) so the site in use keeps working until the new version is live.
create or replace function public.public_contributions_v2(p_user uuid)
 returns table(id uuid, need_title text, organisation text, organisation_country text, need text, output text, skills text[], skills_confirmed boolean, deliverables text, endorsement text, endorsed_by_role text, endorser_name text, endorsement_language text, hours numeric, started date, signed date, completed date, still_in_use boolean, followup_checked date, closed_by_handova boolean)
 language sql stable security definer set search_path to ''
as $function$
  select e.id, e.scope->>'need_title', e.scope->>'organisation', e.scope->>'organisation_country', e.scope->>'description', e.scope->>'output',
    case when cardinality(e.confirmed_skills) > 0 then e.confirmed_skills else array(select jsonb_array_elements_text(e.scope->'skills')) end,
    cardinality(e.confirmed_skills) > 0,
    e.deliverables, e.endorsement, e.endorsed_by_role, case when e.show_endorser_name then e.endorser_name end, e.endorsement_language,
    coalesce((select sum(h.hours) from public.hours h where h.engagement_id = e.id and h.status = 'approved'), 0),
    e.created_at::date, greatest(e.org_signed_at, e.talent_signed_at)::date, e.completed_at::date, e.followup_in_use, e.followup_answered_at::date,
    e.closed_by_handova is not null
  from public.engagements e
  where e.user_id = p_user and e.status = 'completed' and ((e.public and public.profile_is_public(p_user)) or e.user_id = auth.uid())
  order by e.completed_at desc;
$function$;
grant execute on function public.public_contributions_v2(uuid) to anon, authenticated;
