-- Founder decision (20 Oct 2026): while a report about someone is open, they can't close their account online.
-- They see a neutral message that doesn't reveal the report. Open = status 'open' or 'reviewing'.
create or replace function public.account_deletion_blocker()
 returns text language plpgsql stable security definer set search_path to ''
as $function$
declare uid uuid := auth.uid(); t text; o text;
begin
  if uid is null then return null; end if;
  if exists (
    select 1 from public.reports r
    where r.status <> 'resolved' and (
      (r.target_type = 'profile' and r.target_id = uid)
      or (r.target_type = 'contribution' and exists (select 1 from public.engagements e where e.id = r.target_id and (e.user_id = uid
            or exists (select 1 from public.organisation_members m where m.organisation_id = e.organisation_id and m.user_id = uid))))
      or (r.target_type = 'conversation' and exists (select 1 from public.conversations c join public.needs n on n.id = c.need_id where c.id = r.target_id and (c.user_id = uid
            or exists (select 1 from public.organisation_members m where m.organisation_id = n.organisation_id and m.user_id = uid))))
      or (r.target_type = 'organisation' and exists (select 1 from public.organisation_members m where m.organisation_id = r.target_id and m.user_id = uid))
      or (r.target_type = 'need' and exists (select 1 from public.needs n join public.organisation_members m on m.organisation_id = n.organisation_id where n.id = r.target_id and m.user_id = uid))
    )
  ) then
    return 'Your account can''t be closed online right now. Please write to hello@handova.org and we''ll help you.';
  end if;
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
