-- 24 Nov 2026: a need with more than one place stays open after a professional is chosen. It then said
-- "Open · no applications yet", which read as if nobody was involved. New state 'open_more': still open, a professional
-- is already chosen or working, more places left. Pending applications still show as 'applications'.
create or replace function public.public_need_progress()
 returns table(need_id uuid, state text, applicants integer)
 language sql stable security definer set search_path to ''
as $function$
  select n.id,
    case
      when n.status = 'open' and n.deadline is not null and n.deadline < current_date then 'deadline_passed'
      when n.status = 'open' and exists (select 1 from public.applications a where a.need_id = n.id and a.status = 'pending') then 'applications'
      when n.status = 'open' and exists (select 1 from public.engagements e where e.need_id = n.id and e.status in ('awaiting_signatures', 'active', 'completed')) then 'open_more'
      when n.status = 'open' then 'open'
      when exists (select 1 from public.engagements e where e.need_id = n.id and e.status = 'completed') then 'handed_over'
      when exists (select 1 from public.engagements e where e.need_id = n.id and e.status = 'active') then 'in_progress'
      when exists (select 1 from public.engagements e where e.need_id = n.id and e.status = 'awaiting_signatures') then 'chosen'
      else 'closed'
    end,
    (select count(*)::integer from public.applications a where a.need_id = n.id and a.status in ('pending', 'accepted'))
  from public.needs n
  where n.status in ('open', 'closed') and n.approved_at is not null and public.org_is_approved(n.organisation_id)
    and coalesce(n.review_note, '') not like 'Taken down by Handova%';
$function$;
