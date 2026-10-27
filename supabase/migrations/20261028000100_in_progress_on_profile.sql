-- 28 Oct 2026 (founder decision): once both sides have signed, a contribution shows on the professional's public
-- profile as "In progress" (organisation, need, start month; no hours, no endorsement), unless the professional hides it.
-- Completed work still waits for the professional to read the endorsement and choose to publish it.
alter table public.engagements add column if not exists show_in_progress boolean not null default true;

create or replace function public.public_in_progress(p_user uuid)
 returns table (id uuid, need_id uuid, need_title text, organisation_id uuid, organisation text, organisation_country text, logo_url text, started timestamptz)
 language sql stable security definer set search_path to ''
as $function$
  select e.id, e.need_id, coalesce(e.scope->>'need_title', n.title), o.id, o.name, o.country, o.logo_url,
    greatest(e.talent_signed_at, e.org_signed_at)
  from public.engagements e
  join public.profiles p on p.user_id = e.user_id
  join public.organisations o on o.id = e.organisation_id
  left join public.needs n on n.id = e.need_id
  where e.user_id = p_user and e.status = 'active' and e.show_in_progress and e.hidden_by_handova is null
    and p.published and p.review_status = 'approved' and p.closed_at is null and not public.is_suspended(p.user_id)
    and o.status = 'approved'
  order by greatest(e.talent_signed_at, e.org_signed_at) desc;
$function$;
revoke all on function public.public_in_progress(uuid) from public;
grant execute on function public.public_in_progress(uuid) to anon, authenticated;

-- The professional shows or hides an ongoing contribution on their profile.
create or replace function public.set_in_progress_visibility(p_id uuid, p_show boolean)
 returns void language plpgsql security definer set search_path to ''
as $function$
begin
  update public.engagements set show_in_progress = coalesce(p_show, true)
  where id = p_id and user_id = (select auth.uid());
  if not found then raise exception 'Only the professional on this contribution can change this.'; end if;
end $function$;
revoke all on function public.set_in_progress_visibility(uuid, boolean) from public, anon;
grant execute on function public.set_in_progress_visibility(uuid, boolean) to authenticated;
