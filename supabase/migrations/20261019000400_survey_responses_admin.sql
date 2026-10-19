-- Handova can see who answered each questionnaire and delete a response (for example a test).
drop function if exists public.admin_survey_data();
create or replace function public.admin_survey_data()
 returns table(engagement_id uuid, completed_at timestamptz, organisation_id uuid, professional_id uuid, org_country text, org_type text, staff_size text,
   pro_country text, career_stage text, hours_planned numeric, hours_approved numeric, delivered text, still_in_use boolean, followup_answered_at timestamptz,
   work_again text, research_contact_org boolean, research_contact_pro boolean, org_response jsonb, pro_response jsonb, six_months jsonb, need_title text, org_name text, pro_name text)
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
    e.scope->>'need_title', coalesce(o.name, e.scope->>'organisation'), coalesce(p.name, e.scope->>'talent')
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

create or replace function public.admin_delete_survey_response(p_id uuid, p_ask_again boolean)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare r record;
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  select * into r from public.survey_responses where id = p_id;
  if r.id is null then raise exception 'Response not found.'; end if;
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), 'survey_response_deleted', 'survey_response', p_id, jsonb_build_object('engagement_id', r.engagement_id, 'kind', r.kind, 'status', r.status, 'ask_again', coalesce(p_ask_again, false)));
  if coalesce(p_ask_again, false) then
    delete from public.survey_responses where id = p_id;
  else
    update public.survey_responses set status = 'skipped', answers = '{}'::jsonb where id = p_id;
  end if;
end $function$;
revoke all on function public.admin_delete_survey_response(uuid, boolean) from public, anon;
grant execute on function public.admin_delete_survey_response(uuid, boolean) to authenticated;
