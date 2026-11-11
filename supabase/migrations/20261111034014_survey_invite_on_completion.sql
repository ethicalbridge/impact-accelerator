-- 11 Nov 2026: when a contribution is finished, both sides get the two-minute questionnaire straight away
-- (in-app and by email), not only the reminder two days later. One invite per person per contribution.
create or replace function public.survey_invite_on_completion()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    insert into public.notifications (user_id, kind, title, body, link, ref)
    select x.uid, 'survey_invite', 'Two minutes: how did it go?',
           coalesce(new.scope->>'need_title', '') || ' · Your answers help Handova improve and are never shown to the other side.',
           x.link, new.id
    from (select new.user_id as uid, '#workspace' as link, 'professional' as k
          union all select m.user_id, '#org', 'organisation' from public.organisation_members m where m.organisation_id = new.organisation_id) x
    where x.uid is not null
      and not exists (select 1 from public.survey_responses r where r.engagement_id = new.id and r.kind = x.k)
      and not exists (select 1 from public.notifications r where r.kind = 'survey_invite' and r.ref = new.id and r.user_id = x.uid);
  end if;
  return new;
end $function$;
revoke all on function public.survey_invite_on_completion() from public, anon, authenticated;
create or replace trigger engagements_survey_invite after update of status on public.engagements
  for each row execute function public.survey_invite_on_completion();
