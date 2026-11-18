-- 18 Nov 2026: the home page hero shows a real handover. Endorsements that are already public on someone's impact CV
-- (completed, shown, public profile), most recent first, without the endorser's name unless they chose to show it.
create or replace function public.public_endorsements()
 returns table(need_title text, organisation text, organisation_country text, endorsement text, endorsed_by_role text, endorsement_language text, user_id uuid, still_in_use boolean, completed date)
 language sql stable security definer set search_path to ''
as $$
  select e.scope->>'need_title', e.scope->>'organisation', e.scope->>'organisation_country', e.endorsement, e.endorsed_by_role, e.endorsement_language,
    e.user_id, e.followup_in_use, e.completed_at::date
  from public.engagements e
  where e.status = 'completed' and e.public and public.profile_is_public(e.user_id) and coalesce(trim(e.endorsement), '') <> ''
  order by e.completed_at desc
  limit 20;
$$;
revoke all on function public.public_endorsements() from public;
grant execute on function public.public_endorsements() to anon, authenticated;
