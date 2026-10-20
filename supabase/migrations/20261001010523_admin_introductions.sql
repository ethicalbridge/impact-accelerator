-- Founder decision 14: the administrator can introduce an approved professional to an open need by hand.
-- The introduction is an invitation the professional accepts or declines; the organisation is told.
create function public.admin_introduce(p_need uuid, p_user uuid, p_message text) returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid; n record;
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  select * into n from public.needs where id = p_need;
  if n.id is null or n.status <> 'open' or not public.org_is_approved(n.organisation_id) then raise exception 'This need is not open.'; end if;
  if not public.profile_is_public(p_user) then raise exception 'Only approved, published profiles can be introduced.'; end if;
  if exists (select 1 from public.invitations where need_id = p_need and user_id = p_user) or exists (select 1 from public.applications where need_id = p_need and user_id = p_user and status in ('pending', 'accepted'))
    then raise exception 'This person is already connected to this need.'; end if;
  if length(trim(coalesce(p_message, ''))) < 30 then raise exception 'Write a short introduction of at least 30 characters.'; end if;
  insert into public.invitations(need_id, user_id, invited_by, message) values (p_need, p_user, auth.uid(), '[Introduced by Impact Accelerator] ' || left(trim(p_message), 3900)) returning id into v;
  perform public.notify_org(n.organisation_id, 'introduction', 'Impact Accelerator introduced a professional', n.title, '#org');
  return v;
end $$;
revoke all on function public.admin_introduce(uuid, uuid, text) from public, anon;
grant execute on function public.admin_introduce(uuid, uuid, text) to authenticated;
