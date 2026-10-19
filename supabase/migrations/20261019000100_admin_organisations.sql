-- Handova can suspend or delete organisations. Every such action is logged.
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_actions enable row level security;
drop policy if exists admin_actions_read on public.admin_actions;
create policy admin_actions_read on public.admin_actions for select using (public.is_admin());
revoke all on public.admin_actions from anon;
grant select on public.admin_actions to authenticated;

-- Decisions on an organisation. Suspending or rejecting also stops its open needs (applicants are told).
create or replace function public.admin_review_organisation(p_org uuid, p_decision public.org_status, p_note text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare n text;
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  update public.organisations set status = p_decision, approved_at = case when p_decision = 'approved' then coalesce(approved_at, now()) else approved_at end where id = p_org returning name into n;
  if n is null then raise exception 'Organisation not found.'; end if;
  if p_decision in ('suspended', 'rejected') then
    update public.needs set status = 'closed' where organisation_id = p_org and status = 'open';
  end if;
  perform public.notify_org(p_org, 'org_decision',
    case p_decision when 'approved' then 'Your organisation is approved' when 'changes_requested' then 'Please update your organisation details'
      when 'rejected' then 'Your organisation was not approved' when 'suspended' then 'Your organisation is suspended on Handova' else 'Your organisation status changed' end,
    coalesce(p_note, ''), '#org');
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), 'org_' || p_decision, 'organisation', p_org, jsonb_build_object('name', n, 'note', coalesce(p_note, '')));
end $function$;

-- Delete an organisation. Only possible when no contribution was ever started with it: contribution records belong to
-- professionals' impact CVs and the signed agreements must be kept, so those organisations are suspended instead.
create or replace function public.admin_delete_organisation(p_org uuid, p_confirm text, p_reason text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare o record;
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  select * into o from public.organisations where id = p_org for update;
  if o.id is null then raise exception 'Organisation not found.'; end if;
  if trim(coalesce(p_confirm, '')) <> o.name then raise exception 'Type the organisation’s name exactly to confirm.'; end if;
  if exists (select 1 from public.engagements e where e.organisation_id = p_org) then
    raise exception 'This organisation has contribution records. Professionals rely on them for their impact CVs and the signed agreements must be kept, so suspend it instead.';
  end if;
  -- Close open needs first, so anyone who applied is told.
  update public.needs set status = 'closed' where organisation_id = p_org and status = 'open';
  perform public.notify_org(p_org, 'org_decision', 'Your organisation was removed from Handova', coalesce(nullif(trim(p_reason), ''), 'Contact hello@handova.org if you have questions.'), '#onboarding');
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), 'org_deleted', 'organisation', p_org, jsonb_build_object('name', o.name, 'country', o.country, 'reason', coalesce(p_reason, ''),
      'needs', (select count(*) from public.needs where organisation_id = p_org)));
  delete from public.organisations where id = p_org;
end $function$;
revoke all on function public.admin_delete_organisation(uuid, text, text) from public, anon;
grant execute on function public.admin_delete_organisation(uuid, text, text) to authenticated;
