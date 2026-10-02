-- Two stages instead of closing straight away:
--   3 months without activity -> marked inactive (still visible, labelled "Inactive")
--   6 months without activity -> closed (unpublished; needs review to come back)
-- Activity = approval, applying to a need, accepting an invitation, starting an engagement, or endorsed work.
-- An engagement in progress always counts as active. Reminders go out two weeks before each stage.
alter table public.profiles add column inactive_since timestamptz;

create or replace function public.last_activity(uid uuid) returns timestamptz language sql stable security definer set search_path = '' as $$
  select greatest(
    (select approved_at from public.profiles where user_id = uid),
    (select max(created_at) from public.applications where user_id = uid),
    (select max(decided_at) from public.invitations where user_id = uid and status::text = 'accepted'),
    (select max(created_at) from public.engagements where user_id = uid),
    (select max(completed_at) from public.engagements where user_id = uid and status = 'completed' and coalesce(endorsement, '') <> '')
  )
$$;
revoke all on function public.last_activity(uuid) from public, anon, authenticated;

-- Applying or accepting an invitation makes an inactive profile active again straight away.
create or replace function public.mark_active() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set inactive_since = null where user_id = new.user_id and inactive_since is not null;
  return new;
end $$;
create trigger applications_mark_active after insert on public.applications for each row execute function public.mark_active();
create trigger invitations_mark_active after update of status on public.invitations for each row when (new.status::text = 'accepted') execute function public.mark_active();
create trigger engagements_mark_active after insert on public.engagements for each row execute function public.mark_active();

create or replace function public.profile_activity_check() returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  create temporary table _act on commit drop as
    select pr.user_id, pr.inactive_since, public.last_activity(pr.user_id) as since
    from public.profiles pr
    where pr.published and pr.review_status = 'approved'
      and not exists (select 1 from public.engagements e where e.user_id = pr.user_id and e.status = 'active');

  -- Active again (safety net for the triggers)
  update public.profiles p set inactive_since = null from _act a
  where p.user_id = a.user_id and p.inactive_since is not null and a.since > p.inactive_since;
  update public.profiles p set inactive_since = null
  where p.inactive_since is not null and exists (select 1 from public.engagements e where e.user_id = p.user_id and e.status = 'active');

  -- Two weeks before "inactive"
  insert into public.notifications (user_id, kind, title, body, link)
  select a.user_id, 'inactive_soon', 'Your profile will be marked inactive in two weeks',
    'It has been almost three months without activity. Apply to a need or accept an invitation to stay active, so organisations know you are available.', '#needs'
  from _act a
  where a.inactive_since is null and a.since <= now() - interval '3 months' + interval '14 days' and a.since > now() - interval '3 months'
    and not exists (select 1 from public.notifications x where x.user_id = a.user_id and x.kind = 'inactive_soon' and x.created_at >= a.since);

  -- Three months: inactive
  with m as (
    update public.profiles p set inactive_since = now() from _act a
    where p.user_id = a.user_id and p.inactive_since is null and a.since <= now() - interval '3 months'
    returning p.user_id
  )
  insert into public.notifications (user_id, kind, title, body, link)
  select m.user_id, 'profile_inactive', 'Your profile is now marked inactive',
    'There has been no activity for three months, so organisations see your profile as inactive. Apply to a need to become active again. Profiles are closed after six months without activity.', '#needs'
  from m;

  -- Two weeks before closing
  insert into public.notifications (user_id, kind, title, body, link)
  select a.user_id, 'closing_soon', 'Your profile will close in two weeks',
    'It has been almost six months without activity. Apply to a need or accept an invitation to keep your profile open.', '#needs'
  from _act a
  where a.since <= now() - interval '6 months' + interval '14 days' and a.since > now() - interval '6 months'
    and not exists (select 1 from public.notifications x where x.user_id = a.user_id and x.kind = 'closing_soon' and x.created_at >= a.since);

  -- Six months: closed
  with c as (
    update public.profiles p set published = false, review_status = 'draft', approved_at = null, inactive_since = null, closed_at = now(), closed_reason = 'inactive'
    from _act a where p.user_id = a.user_id and a.since <= now() - interval '6 months'
    returning p.user_id
  )
  insert into public.notifications (user_id, kind, title, body, link)
  select c.user_id, 'profile_closed', 'Your profile has been closed for now',
    'There was no activity for six months. Publish your profile again whenever you are ready and we will review it.', '#workspace/profile'
  from c;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.profile_activity_check() from public, anon, authenticated;
