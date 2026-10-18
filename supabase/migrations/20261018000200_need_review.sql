-- Every need is checked by Handova before it goes live.
-- Organisations save a draft or send the need for review ("pending"). An administrator approves it
-- (it opens) or asks for changes (it returns to draft with a note). A need can only open once its
-- organisation is approved. Editing a live need tells the administrators.

alter table public.needs add column if not exists review_note text check (length(review_note) <= 1000);
alter table public.needs add column if not exists approved_at timestamptz;
-- Needs that are already live count as approved.
update public.needs set approved_at = coalesce(approved_at, updated_at, created_at) where status in ('open', 'closed');

alter table public.needs drop constraint if exists needs_status_check;
alter table public.needs add constraint needs_status_check check (status = any (array['draft', 'pending', 'open', 'closed']));

-- Pending needs stay private: only the organisation and Handova can see them.
drop policy if exists needs_read on public.needs;
create policy needs_read on public.needs for select using (
  (status in ('open', 'closed') and public.org_is_approved(organisation_id)) or public.is_org_member(organisation_id) or public.is_admin()
);
drop policy if exists needs_insert on public.needs;
create policy needs_insert on public.needs for insert with check (
  public.is_org_member(organisation_id) and (status in ('draft', 'pending') or public.org_is_approved(organisation_id))
);
drop policy if exists needs_update on public.needs;
create policy needs_update on public.needs for update using (public.is_org_member(organisation_id)) with check (
  public.is_org_member(organisation_id) and (status in ('draft', 'pending') or public.org_is_approved(organisation_id))
);

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
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status <> 'pending') then
    new.review_note := null;
    perform public.notify_admins('need_submitted', 'A need is waiting for review', new.title, '#admin');
  end if;
  if tg_op = 'UPDATE' and not adm and old.status = 'open' and new.status = 'open'
     and (new.title, new.description, new.output) is distinct from (old.title, old.description, old.output) then
    perform public.notify_admins('need_changed', 'A live need was edited', new.title, '#need/' || new.id);
  end if;
  return new;
end $function$;

create or replace function public.admin_review_need(p_need uuid, p_decision text, p_note text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare n public.needs;
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  select * into n from public.needs where id = p_need for update;
  if not found then raise exception 'Need not found.'; end if;
  if n.status <> 'pending' then raise exception 'This need is not waiting for review.'; end if;
  if p_decision = 'approved' then
    if not public.org_is_approved(n.organisation_id) then
      raise exception 'Approve the organisation first. The need stays pending until then.';
    end if;
    update public.needs set status = 'open' where id = p_need;
    perform public.notify_org(n.organisation_id, 'need_decision', 'Your need is live', coalesce(nullif(trim(p_note), ''), n.title), '#need/' || p_need);
  elsif p_decision = 'changes_requested' then
    if coalesce(trim(p_note), '') = '' then raise exception 'Write a note so the organisation knows what to change.'; end if;
    update public.needs set status = 'draft', review_note = trim(p_note) where id = p_need;
    perform public.notify_org(n.organisation_id, 'need_decision', 'Please update your need', trim(p_note), '#org/need/' || p_need);
  else
    raise exception 'Choose approve or ask for changes.';
  end if;
end $function$;

revoke all on function public.admin_review_need(uuid, text, text) from public, anon;
grant execute on function public.admin_review_need(uuid, text, text) to authenticated;
