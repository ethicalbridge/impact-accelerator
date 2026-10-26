-- Handova can suggest changes to an organisation's profile; the organisation accepts or declines them (26 Oct 2026).
-- Suggestions wait in organisation_suggestions (seen only by Handova and the organisation's members). Accepting applies
-- them straight away: they came from Handova, so they don't go back into Handova's own review of organisation changes.
create table if not exists public.organisation_suggestions (
  organisation_id uuid primary key, -- an organisation id; rows for removed organisations are simply ignored
  changes jsonb not null default '{}'::jsonb,
  note text check (length(note) <= 1000),
  proposed_by uuid,
  created_at timestamptz not null default now()
);
alter table public.organisation_suggestions enable row level security;
revoke all on public.organisation_suggestions from anon, authenticated;
grant select on public.organisation_suggestions to authenticated;
create policy organisation_suggestions_read on public.organisation_suggestions for select to authenticated
  using (public.is_admin() or public.is_org_member(organisation_id));

-- Accepted suggestions are applied without being held for review.
create or replace function public.org_change_guard()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare diff jsonb := '{}'::jsonb; k text;
begin
  if coalesce(current_setting('handova.applying_suggestion', true), '') = 'on' then return new; end if;
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

-- Handova suggests changes. Only fields that differ from the current profile are kept.
create or replace function public.admin_suggest_org_changes(p_org uuid, p_changes jsonb, p_note text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare o record; diff jsonb := '{}'::jsonb; k text; v text;
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  select * into o from public.organisations where id = p_org;
  if o.id is null then raise exception 'Organisation not found.'; end if;
  foreach k in array array['name', 'country', 'city', 'website', 'summary', 'org_type', 'ethical_bridge_url', 'staff_size'] loop
    if p_changes ? k then
      v := nullif(trim(coalesce(p_changes->>k, '')), '');
      if v is distinct from nullif(trim(coalesce(to_jsonb(o)->>k, '')), '') then diff := diff || jsonb_build_object(k, v); end if;
    end if;
  end loop;
  if diff = '{}'::jsonb then raise exception 'Nothing to change: the suggestion is the same as the current profile.'; end if;
  if diff ? 'name' and length(coalesce(diff->>'name', '')) < 2 then raise exception 'The organisation needs a name.'; end if;
  if diff ? 'summary' and length(coalesce(diff->>'summary', '')) < 20 then raise exception 'The summary needs at least 20 characters.'; end if;
  if diff ? 'country' and coalesce(diff->>'country', '') = '' then raise exception 'The organisation needs a country.'; end if;
  if diff ? 'website' and coalesce(diff->>'website', '') <> '' and diff->>'website' !~ '^https://' then raise exception 'Use a website address starting with https://'; end if;
  insert into public.organisation_suggestions (organisation_id, changes, note, proposed_by, created_at)
    values (p_org, diff, nullif(trim(coalesce(p_note, '')), ''), auth.uid(), now())
    on conflict (organisation_id) do update set changes = excluded.changes, note = excluded.note, proposed_by = excluded.proposed_by, created_at = now();
  perform public.notify_org(p_org, 'org_suggestion', 'Handova suggests changes to your organisation profile',
    coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Review them and accept or decline. Nothing changes until you accept.'), '#org/details');
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), 'org_changes_suggested', 'organisation', p_org, jsonb_build_object('changes', diff, 'note', p_note, 'name', o.name));
end $function$;
revoke all on function public.admin_suggest_org_changes(uuid, jsonb, text) from public, anon;
grant execute on function public.admin_suggest_org_changes(uuid, jsonb, text) to authenticated;

-- Handova withdraws a suggestion it made.
create or replace function public.admin_withdraw_org_suggestion(p_org uuid)
 returns void language plpgsql security definer set search_path to ''
as $function$
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  update public.organisation_suggestions set changes = '{}'::jsonb, note = null where organisation_id = p_org;
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), 'org_suggestion_withdrawn', 'organisation', p_org, '{}'::jsonb);
end $function$;
revoke all on function public.admin_withdraw_org_suggestion(uuid) from public, anon;
grant execute on function public.admin_withdraw_org_suggestion(uuid) to authenticated;

-- The organisation accepts (applies) or declines Handova's suggestion. Handova is told either way.
create or replace function public.respond_org_suggestion(p_org uuid, p_accept boolean, p_note text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare o record; pc jsonb;
begin
  if not public.is_org_member(p_org) then raise exception 'Only members of this organisation can answer.'; end if;
  select * into o from public.organisations where id = p_org for update;
  select changes into pc from public.organisation_suggestions where organisation_id = p_org for update;
  if o.id is null or pc is null or pc = '{}'::jsonb then raise exception 'There are no suggested changes waiting.'; end if;
  if p_accept then
    perform set_config('handova.applying_suggestion', 'on', true);
    update public.organisations set
      name = coalesce(pc->>'name', name), country = coalesce(pc->>'country', country),
      city = case when pc ? 'city' then coalesce(pc->>'city', '') else city end,
      website = case when pc ? 'website' then coalesce(pc->>'website', '') else website end,
      summary = coalesce(pc->>'summary', summary), org_type = coalesce(pc->>'org_type', org_type),
      ethical_bridge_url = case when pc ? 'ethical_bridge_url' then coalesce(pc->>'ethical_bridge_url', '') else ethical_bridge_url end,
      staff_size = case when pc ? 'staff_size' then pc->>'staff_size' else staff_size end
    where id = p_org;
    perform set_config('handova.applying_suggestion', '', true);
  end if;
  update public.organisation_suggestions set changes = '{}'::jsonb where organisation_id = p_org;
  perform public.notify_admins('org_suggestion_answer',
    case when p_accept then 'An organisation accepted your suggested changes' else 'An organisation declined your suggested changes' end,
    o.name || coalesce(': ' || nullif(trim(coalesce(p_note, '')), ''), ''), '#admin-org/' || p_org);
end $function$;
revoke all on function public.respond_org_suggestion(uuid, boolean, text) from public, anon;
grant execute on function public.respond_org_suggestion(uuid, boolean, text) to authenticated;
