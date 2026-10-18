-- Completion step v2: no rating; a written endorsement with 1–3 confirmed skills; a private note to the professional;
-- a Handova-only "would you welcome them again?" answer; one correction round; clearer impact CV evidence.

alter table public.engagements add column if not exists delivered_as_agreed text check (delivered_as_agreed in ('all', 'partly'));
alter table public.engagements add column if not exists confirmed_skills text[] not null default '{}';
alter table public.engagements add column if not exists endorsement_language text check (length(endorsement_language) <= 40);
alter table public.engagements add column if not exists endorsed_by uuid references auth.users(id) on delete set null;
alter table public.engagements add column if not exists endorser_name text check (length(endorser_name) <= 120);
alter table public.engagements add column if not exists show_endorser_name boolean not null default true;
alter table public.engagements add column if not exists note_to_professional text check (length(note_to_professional) <= 600);
alter table public.engagements add column if not exists correction_requested_at timestamptz;
alter table public.engagements add column if not exists correction_reason text check (correction_reason in ('fact', 'spelling', 'private', 'other'));
alter table public.engagements add column if not exists correction_note text check (length(correction_note) <= 300);
alter table public.engagements add column if not exists endorsement_edited_at timestamptz;

-- Only Handova sees this.
create table if not exists public.completion_private (
  engagement_id uuid primary key references public.engagements(id) on delete cascade,
  work_again text not null check (work_again in ('yes', 'right_need', 'no')),
  note text check (length(note) <= 600),
  created_at timestamptz not null default now()
);
alter table public.completion_private enable row level security;
drop policy if exists completion_private_admin on public.completion_private;
create policy completion_private_admin on public.completion_private for select using (public.is_admin());
revoke all on public.completion_private from anon;
grant select on public.completion_private to authenticated;

-- Old completion (with a rating): ask people to reload.
create or replace function public.complete_engagement(p_id uuid, p_deliverables text, p_endorsement text, p_role text, p_rating smallint)
 returns void language plpgsql security definer set search_path to ''
as $function$
begin
  raise exception 'Handova was updated. Please reload the page and complete it again.';
end $function$;

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
  if p_delivered = 'all' then
    if length(endorse) < 100 then raise exception 'Write an endorsement of at least 100 characters.'; end if;
    if cardinality(skills) < 1 then raise exception 'Choose at least one skill you saw in this work.'; end if;
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
    (e.scope->>'need_title') || '. Read it and choose whether it appears on your impact CV.', '#workspace');
  if p_work_again = 'no' then
    perform public.notify_admins('work_again_no', 'An organisation would not welcome a professional again', e.scope->>'need_title', '#admin');
  end if;
end $function$;
revoke all on function public.complete_engagement(uuid, text, text, text[], text, text, text, text, boolean, text, text, text, boolean) from public, anon;
grant execute on function public.complete_engagement(uuid, text, text, text[], text, text, text, text, boolean, text, text, text, boolean) to authenticated;

-- The professional can ask for one correction; the organisation can edit once within 14 days.
create or replace function public.request_endorsement_correction(p_id uuid, p_reason text, p_note text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare e record;
begin
  select * into e from public.engagements where id = p_id for update;
  if e.id is null or e.user_id is distinct from auth.uid() then raise exception 'Only the professional can ask for a correction.'; end if;
  if e.status <> 'completed' then raise exception 'You can ask for a correction once the contribution is complete.'; end if;
  if e.correction_requested_at is not null then raise exception 'You have already asked for a correction.'; end if;
  if p_reason not in ('fact', 'spelling', 'private', 'other') then raise exception 'Choose a reason.'; end if;
  if length(trim(coalesce(p_note, ''))) < 5 then raise exception 'Say what should be corrected.'; end if;
  update public.engagements set correction_requested_at = now(), correction_reason = p_reason, correction_note = left(trim(p_note), 300), public = false, published_at = null where id = p_id;
  perform public.notify_org(e.organisation_id, 'correction_requested', (coalesce(e.scope->>'talent', 'The professional')) || ' asked for a correction to your endorsement',
    (e.scope->>'need_title') || ': ' || left(trim(p_note), 200), '#org/needs/' || e.need_id);
end $function$;
revoke all on function public.request_endorsement_correction(uuid, text, text) from public, anon;
grant execute on function public.request_endorsement_correction(uuid, text, text) to authenticated;

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
  if endorse <> '' and (length(endorse) < 100 or length(endorse) > 1200) then raise exception 'The endorsement must be 100 to 1,200 characters.'; end if;
  update public.engagements set deliverables = trim(p_deliverables), endorsement = nullif(endorse, ''), confirmed_skills = skills, endorsement_edited_at = now() where id = p_id;
  perform public.notify(e.user_id, 'endorsement_corrected', 'Your endorsement was corrected', (e.scope->>'need_title') || '. Read it and choose whether it appears on your impact CV.', '#workspace');
end $function$;
revoke all on function public.edit_endorsement(uuid, text, text, text[]) from public, anon;
grant execute on function public.edit_endorsement(uuid, text, text, text[]) to authenticated;

-- The public impact CV: confirmed skills, who endorsed, language, and dates that can be checked.
drop function if exists public.public_contributions(uuid);
create function public.public_contributions(p_user uuid)
 returns table(id uuid, need_title text, organisation text, organisation_country text, need text, output text, skills text[], skills_confirmed boolean,
   deliverables text, endorsement text, endorsed_by_role text, endorser_name text, endorsement_language text, hours numeric, started date, signed date,
   completed date, still_in_use boolean, followup_checked date)
 language sql stable security definer set search_path to ''
as $$
  select e.id, e.scope->>'need_title', e.scope->>'organisation', e.scope->>'organisation_country', e.scope->>'description', e.scope->>'output',
    case when cardinality(e.confirmed_skills) > 0 then e.confirmed_skills else array(select jsonb_array_elements_text(e.scope->'skills')) end,
    cardinality(e.confirmed_skills) > 0,
    e.deliverables, e.endorsement, e.endorsed_by_role, case when e.show_endorser_name then e.endorser_name end, e.endorsement_language,
    coalesce((select sum(h.hours) from public.hours h where h.engagement_id = e.id and h.status = 'approved'), 0),
    e.created_at::date, greatest(e.org_signed_at, e.talent_signed_at)::date, e.completed_at::date, e.followup_in_use, e.followup_answered_at::date
  from public.engagements e
  where e.user_id = p_user and e.status = 'completed' and ((e.public and public.profile_is_public(p_user)) or e.user_id = auth.uid())
  order by e.completed_at desc;
$$;
grant execute on function public.public_contributions(uuid) to anon, authenticated;

-- Concerns can be about a contribution (e.g. an unfair endorsement).
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check check (target_type in ('profile', 'need', 'organisation', 'conversation', 'contribution', 'other'));
