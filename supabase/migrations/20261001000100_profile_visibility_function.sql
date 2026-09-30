-- Signed-out visitors cannot read applications or engagements, so the profile rule uses a server function.
create function public.org_can_see_profile(uid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    exists (select 1 from public.applications a join public.needs n on n.id = a.need_id where a.user_id = uid and public.is_org_member(n.organisation_id))
    or exists (select 1 from public.engagements e where e.user_id = uid and public.is_org_member(e.organisation_id)));
$$;
grant execute on function public.org_can_see_profile(uuid) to anon, authenticated;
drop policy profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using ((published and review_status = 'approved') or user_id = (select auth.uid()) or public.is_admin() or public.org_can_see_profile(user_id));
