-- B5 (founder decision, 20 Oct 2026): nothing an approved organisation changes in its public details goes live
-- without Handova's approval. The change waits in organisation_changes (seen only by the organisation and Handova),
-- the current version stays public, and Handova approves or declines it. Staff size (private) still saves directly.
create table if not exists public.organisation_changes (
  organisation_id uuid primary key, -- an organisation id; rows for removed organisations are simply ignored
  changes jsonb not null,
  since timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.organisation_changes enable row level security;
revoke all on public.organisation_changes from anon, authenticated;
grant select on public.organisation_changes to authenticated;
create policy organisation_changes_read on public.organisation_changes for select to authenticated
  using (public.is_admin() or exists (select 1 from public.organisation_members m where m.organisation_id = organisation_changes.organisation_id and m.user_id = (select auth.uid())));

create or replace function public.org_change_guard()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare diff jsonb := '{}'::jsonb; k text;
begin
  if old.status = 'approved' and not public.is_admin() then
    foreach k in array array['name', 'country', 'city', 'website', 'summary', 'org_type', 'ethical_bridge_url', 'logo_url'] loop
      if (to_jsonb(new) -> k) is distinct from (to_jsonb(old) -> k) then diff := diff || jsonb_build_object(k, to_jsonb(new) -> k); end if;
    end loop;
    if diff <> '{}'::jsonb then
      -- Keep the approved version public; hold the change for review.
      new.name := old.name; new.country := old.country; new.city := old.city; new.website := old.website; new.summary := old.summary;
      new.org_type := old.org_type; new.ethical_bridge_url := old.ethical_bridge_url; new.logo_url := old.logo_url;
      insert into public.organisation_changes (organisation_id, changes) values (old.id, diff)
        on conflict (organisation_id) do update set changes = public.organisation_changes.changes || excluded.changes, updated_at = now();
      perform public.notify_admins('org_changed', 'Organisation changes to review', old.name, '#admin');
    end if;
  end if;
  -- Asked for more details: saving the profile sends it back to Handova.
  if old.status = 'changes_requested' and new.status = 'changes_requested' and not public.is_admin() then
    new.status := 'pending';
    perform public.notify_admins('org_review', 'Organisation updated and ready for review', new.name, '#admin');
  end if;
  return new;
end $function$;

-- Handova approves (applies) or declines pending changes; the organisation is told; the decision is logged.
create or replace function public.admin_review_org_changes(p_id uuid, p_approve boolean, p_note text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare o record; pc jsonb;
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  select * into o from public.organisations where id = p_id for update;
  select changes into pc from public.organisation_changes where organisation_id = p_id for update;
  if o.id is null or pc is null then raise exception 'There are no changes waiting for this organisation.'; end if;
  if p_approve then
    update public.organisations set
      name = coalesce(pc->>'name', name), country = coalesce(pc->>'country', country), city = case when pc ? 'city' then pc->>'city' else city end,
      website = case when pc ? 'website' then pc->>'website' else website end, summary = coalesce(pc->>'summary', summary),
      org_type = coalesce(pc->>'org_type', org_type), ethical_bridge_url = coalesce(pc->>'ethical_bridge_url', ethical_bridge_url),
      logo_url = case when pc ? 'logo_url' then pc->>'logo_url' else logo_url end
    where id = p_id;
  end if;
  update public.organisation_changes set changes = '{}'::jsonb where organisation_id = p_id;
  perform public.notify_org(p_id, 'org_decision', case when p_approve then 'Your organisation changes are live' else 'Your organisation changes were not approved' end,
    coalesce(nullif(trim(coalesce(p_note, '')), ''), case when p_approve then 'Thank you. Your updated details are now public.' else 'Your current details stay as they were. Reply to us if you have questions.' end), '#org');
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), case when p_approve then 'org_changes_approved' else 'org_changes_declined' end, 'organisation', p_id, jsonb_build_object('changes', pc, 'note', p_note, 'name', o.name));
end $function$;
revoke all on function public.admin_review_org_changes(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_org_changes(uuid, boolean, text) to authenticated;
