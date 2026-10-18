-- Needs that Handova approved can't be edited; organisations post a corrected copy for review instead.
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
    if (select count(*) from public.needs n where n.organisation_id = new.organisation_id and n.status = 'open' and n.id <> new.id) >= 3 then
      raise exception 'An organisation can have up to 3 open needs at a time. Close one first.';
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
