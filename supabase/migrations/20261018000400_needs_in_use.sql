-- In-progress needs count towards the limit of 3 at a time.
-- A need uses one of the organisation's 3 places while it is open or someone is working on it
-- (agreement awaiting signatures or active). Optionally count needs waiting for Handova's review too.
create or replace function public.needs_in_use(p_org uuid, p_except uuid, p_with_pending boolean)
 returns integer
 language sql
 stable
 security definer
 set search_path to ''
as $$
  select count(*)::int from public.needs n
  where n.organisation_id = p_org and n.id is distinct from p_except
    and (n.status = 'open'
      or (p_with_pending and n.status = 'pending')
      or (n.status = 'closed' and exists (select 1 from public.engagements e where e.need_id = n.id and e.status in ('awaiting_signatures', 'active'))));
$$;
revoke all on function public.needs_in_use(uuid, uuid, boolean) from public, anon, authenticated;

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
  if new.status = 'open' and (tg_op = 'INSERT' or old.status <> 'open') then
    -- Only Handova opens a need, except reopening one it already approved.
    if not adm and not (tg_op = 'UPDATE' and old.status = 'closed' and old.approved_at is not null) then
      raise exception 'Send your need for review. Handova checks every need and opens it once it is approved.';
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
  end if;
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status <> 'pending') then
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
