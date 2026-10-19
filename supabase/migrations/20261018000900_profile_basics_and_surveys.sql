-- 1) Team size (public, on the organisation page) and career stage (private, Handova only).
-- 2) Short post-contribution questionnaires for organisations and professionals, plus two six-month questions.
-- Answers are only readable by Handova admins and are reported in totals.

alter table public.organisations add column if not exists staff_size text check (staff_size in ('none', '1-5', '6-20', '21-50', '50+'));
grant update (staff_size) on public.organisations to authenticated;

create table if not exists public.user_private (
  user_id uuid primary key references auth.users(id) on delete cascade,
  career_stage text check (career_stage in ('student', 'early', 'mid', 'senior', 'retired', 'break')),
  research_contact boolean,
  research_contact_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.user_private enable row level security;
drop policy if exists user_private_read on public.user_private;
create policy user_private_read on public.user_private for select using (user_id = (select auth.uid()) or public.is_admin());
revoke all on public.user_private from anon;
grant select on public.user_private to authenticated;

create or replace function public.set_career_stage(p_stage text)
 returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if auth.uid() is null then raise exception 'Please sign in.'; end if;
  if p_stage not in ('student', 'early', 'mid', 'senior', 'retired', 'break') then raise exception 'Choose your career stage.'; end if;
  insert into public.user_private (user_id, career_stage) values (auth.uid(), p_stage)
    on conflict (user_id) do update set career_stage = excluded.career_stage, updated_at = now();
end $function$;
create or replace function public.set_research_contact(p_yes boolean)
 returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if auth.uid() is null then raise exception 'Please sign in.'; end if;
  insert into public.user_private (user_id, research_contact, research_contact_at) values (auth.uid(), p_yes, now())
    on conflict (user_id) do update set research_contact = excluded.research_contact, research_contact_at = now(), updated_at = now();
end $function$;
revoke all on function public.set_career_stage(text) from public, anon;
revoke all on function public.set_research_contact(boolean) from public, anon;
grant execute on function public.set_career_stage(text) to authenticated;
grant execute on function public.set_research_contact(boolean) to authenticated;

-- When a profile is deleted, its private details go too.
create or replace function public.user_private_cleanup()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  delete from public.user_private where user_id = old.user_id;
  return old;
end $function$;
drop trigger if exists profiles_private_cleanup on public.profiles;
create trigger profiles_private_cleanup after delete on public.profiles for each row execute function public.user_private_cleanup();

-- Questionnaire answers: one row per contribution and kind. Only Handova reads them.
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  kind text not null check (kind in ('organisation', 'professional', 'six_months')),
  respondent uuid references auth.users(id) on delete set null,
  status text not null check (status in ('submitted', 'skipped')),
  short_form boolean not null default false,
  q_version text not null,
  lang text check (length(lang) <= 8),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (engagement_id, kind)
);
alter table public.survey_responses enable row level security;
drop policy if exists survey_responses_admin on public.survey_responses;
create policy survey_responses_admin on public.survey_responses for select using (public.is_admin());
revoke all on public.survey_responses from anon;
grant select on public.survey_responses to authenticated;

-- Allowed questions and answer codes (generated from src/survey.js, version 2026-10-v1).
create or replace function public.survey_schema()
 returns jsonb language sql immutable set search_path to ''
as $$ select '{"organisation":{"o_value":{"t":"one","v":["1","2","3","4","5"]},"o_without":{"t":"one","v":["same","later","paid","other_help","not_done","not_sure"]},"o_changed":{"t":"multi","v":["tool","skill","time","funding","comms","organised","nothing_yet","too_early"]},"o_maintain":{"t":"one","v":["yes","little_help","not_yet","not_sure"]},"o_decided":{"t":"one","v":["us","both","professional"]},"o_worth":{"t":"one","v":["1","2","3","4","5"]},"o_hardest":{"t":"one","v":["none","need","choosing","agreement","first_call","working","hours","finishing"]},"o_concern":{"t":"one","v":["no","yes"]},"o_can_now":{"t":"open"},"o_improve":{"t":"open"}},"professional":{"p_match":{"t":"one","v":["1","2","3","4","5"]},"p_support":{"t":"one","v":["1","2","3","4"]},"p_time":{"t":"one","v":["1","2","3","4","5"]},"p_confident":{"t":"one","v":["1","2","3","4"]},"p_gained":{"t":"multi","v":["skills","sector","cv","contacts","purpose","nothing"]},"p_again":{"t":"one","v":["soon","later","not_sure","no"]},"p_hardest":{"t":"one","v":["none","need","choosing","agreement","first_call","working","hours","finishing"]},"p_concern":{"t":"one","v":["no","yes"]},"p_hard_moment":{"t":"open"}},"six_months":{"m_reason":{"t":"one","v":["not_needed","hard_to_use","people_left","never_finished","other"]},"m_helped":{"t":"one","v":["clearly","somewhat","not_yet","not_sure"]}}}'::jsonb $$;

create or replace function public.submit_survey(p_engagement uuid, p_kind text, p_status text, p_answers jsonb, p_short boolean, p_version text, p_lang text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare e record; spec jsonb; k text; v jsonb; def jsonb; clean jsonb := '{}'::jsonb; uid uuid := auth.uid();
begin
  select * into e from public.engagements where id = p_engagement;
  if e.id is null or e.status <> 'completed' then raise exception 'This contribution is not finished.'; end if;
  if p_kind = 'professional' then
    if e.user_id is distinct from uid then raise exception 'You cannot answer for this contribution.'; end if;
  elsif p_kind in ('organisation', 'six_months') then
    if not public.is_org_member(e.organisation_id) then raise exception 'You cannot answer for this contribution.'; end if;
    if p_kind = 'six_months' and e.followup_answered_at is null then raise exception 'Answer the six-month question first.'; end if;
  else raise exception 'Unknown questionnaire.'; end if;
  if p_status not in ('submitted', 'skipped') then raise exception 'Unknown status.'; end if;
  spec := public.survey_schema() -> p_kind;
  if p_status = 'submitted' then
    if jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object' then raise exception 'Invalid answers.'; end if;
    for k, v in select * from jsonb_each(coalesce(p_answers, '{}'::jsonb)) loop
      def := spec -> k;
      if def is null then continue; end if;
      if def->>'t' = 'open' then
        if jsonb_typeof(v) = 'string' and length(trim(v #>> '{}')) > 0 then clean := clean || jsonb_build_object(k, left(trim(v #>> '{}'), 1000)); end if;
      elsif def->>'t' = 'one' then
        if jsonb_typeof(v) = 'string' and (def->'v') ? (v #>> '{}') then clean := clean || jsonb_build_object(k, v); end if;
      elsif def->>'t' = 'multi' then
        if jsonb_typeof(v) = 'array' then
          clean := clean || jsonb_build_object(k, coalesce((select jsonb_agg(distinct x) from jsonb_array_elements_text(v) x where (def->'v') ? x), '[]'::jsonb));
        end if;
      end if;
    end loop;
  end if;
  insert into public.survey_responses (engagement_id, kind, respondent, status, short_form, q_version, lang, answers)
    values (p_engagement, p_kind, uid, p_status, coalesce(p_short, false), left(coalesce(p_version, ''), 20), left(p_lang, 8), clean)
  on conflict (engagement_id, kind) do update set respondent = excluded.respondent, status = excluded.status, short_form = excluded.short_form,
    q_version = excluded.q_version, lang = excluded.lang, answers = excluded.answers, created_at = now()
    where public.survey_responses.status = 'skipped';
  if clean->>'o_concern' = 'yes' or clean->>'p_concern' = 'yes' then
    perform public.notify_admins('survey_concern', 'A questionnaire answer flagged a concern', e.scope->>'need_title', '#admin-responses');
  end if;
end $function$;
revoke all on function public.submit_survey(uuid, text, text, jsonb, boolean, text, text) from public, anon;
grant execute on function public.submit_survey(uuid, text, text, jsonb, boolean, text, text) to authenticated;

-- Questionnaires waiting for the person signed in (contributions finished in the last 60 days, not answered or skipped).
create or replace function public.survey_pending()
 returns table(engagement_id uuid, kind text, short_form boolean, need_title text, other_name text)
 language sql stable security definer set search_path to ''
as $$
  select e.id, 'organisation', exists (select 1 from public.survey_responses r join public.engagements x on x.id = r.engagement_id
      where x.organisation_id = e.organisation_id and r.kind = 'organisation' and r.status = 'submitted' and not r.short_form and r.created_at > now() - interval '90 days'),
    e.scope->>'need_title', e.scope->>'talent'
  from public.engagements e
  where e.status = 'completed' and e.completed_at > now() - interval '60 days' and public.is_org_member(e.organisation_id)
    and not exists (select 1 from public.survey_responses r where r.engagement_id = e.id and r.kind = 'organisation')
  union all
  select e.id, 'professional', false, e.scope->>'need_title', e.scope->>'organisation'
  from public.engagements e
  where e.status = 'completed' and e.completed_at > now() - interval '60 days' and e.user_id = (select auth.uid())
    and not exists (select 1 from public.survey_responses r where r.engagement_id = e.id and r.kind = 'professional');
$$;
revoke all on function public.survey_pending() from public, anon;
grant execute on function public.survey_pending() to authenticated;

-- Everything the responses dashboard needs: one row per finished contribution with both questionnaires and context.
create or replace function public.admin_survey_data()
 returns table(engagement_id uuid, completed_at timestamptz, organisation_id uuid, professional_id uuid, org_country text, org_type text, staff_size text,
   pro_country text, career_stage text, hours_planned numeric, hours_approved numeric, delivered text, still_in_use boolean, followup_answered_at timestamptz,
   work_again text, research_contact_org boolean, research_contact_pro boolean, org_response jsonb, pro_response jsonb, six_months jsonb, need_title text)
 language plpgsql stable security definer set search_path to ''
as $function$
begin
  if not public.is_admin() then raise exception 'Only Handova can see questionnaire answers.'; end if;
  return query
  select e.id, e.completed_at, e.organisation_id, e.user_id, o.country, o.org_type, o.staff_size, p.country, up.career_stage,
    nullif(e.scope->>'hours', '')::numeric,
    coalesce((select sum(h.hours) from public.hours h where h.engagement_id = e.id and h.status = 'approved'), 0),
    e.delivered_as_agreed, e.followup_in_use, e.followup_answered_at, cp.work_again,
    (select bool_or(u.research_contact) from public.user_private u join public.organisation_members m on m.user_id = u.user_id where m.organisation_id = e.organisation_id),
    up.research_contact,
    (select to_jsonb(r) - 'engagement_id' - 'respondent' from public.survey_responses r where r.engagement_id = e.id and r.kind = 'organisation'),
    (select to_jsonb(r) - 'engagement_id' - 'respondent' from public.survey_responses r where r.engagement_id = e.id and r.kind = 'professional'),
    (select to_jsonb(r) - 'engagement_id' - 'respondent' from public.survey_responses r where r.engagement_id = e.id and r.kind = 'six_months'),
    e.scope->>'need_title'
  from public.engagements e
  left join public.organisations o on o.id = e.organisation_id
  left join public.profiles p on p.user_id = e.user_id
  left join public.user_private up on up.user_id = e.user_id
  left join public.completion_private cp on cp.engagement_id = e.id
  where e.status = 'completed'
  order by e.completed_at desc;
end $function$;
revoke all on function public.admin_survey_data() from public, anon;
grant execute on function public.admin_survey_data() to authenticated;

-- Professionals can take any contribution off their public impact CV (including ones recorded before Handova).
alter table public.profiles add column if not exists cv_hidden text[] not null default '{}';
grant select (cv_hidden) on public.profiles to anon, authenticated;
grant update (cv_hidden) on public.profiles to authenticated;

-- Daily reminders, now including the questionnaire reminder.
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
  return n;
end $function$;
