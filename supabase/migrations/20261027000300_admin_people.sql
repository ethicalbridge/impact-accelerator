-- Admin → Everyone (27 Oct 2026): every account and the stage it is at, from sign-up to contributing,
-- so Handova sees who submitted, who started and who stopped half-way.
create or replace function public.admin_people()
 returns table (user_id uuid, email text, role text, name text, signed_up_at timestamptz, last_sign_in_at timestamptz,
   email_confirmed boolean, stage text, organisation_id uuid, organisation_name text, id_status text, agreement_signed boolean,
   applications_waiting integer, contributions_active integer, contributions_done integer, reminders integer)
 language plpgsql stable security definer set search_path to ''
as $function$
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  return query
  select u.id, u.email::text, coalesce(u.raw_user_meta_data->>'role', ''),
    coalesce(nullif(p.name, ''), nullif(m.full_name, ''), u.raw_user_meta_data->>'full_name', ''),
    u.created_at, u.last_sign_in_at, u.email_confirmed_at is not null,
    case
      when exists (select 1 from public.admins a where a.user_id = u.id) then 'admin'
      when public.is_suspended(u.id) then 'suspended'
      when u.email_confirmed_at is null then 'unconfirmed'
      when o.id is not null then case o.status when 'pending' then 'org_pending' when 'changes_requested' then 'org_changes' when 'approved' then 'org_approved' when 'suspended' then 'org_suspended' else 'org_rejected' end
      when p.user_id is null and u.raw_user_meta_data->>'role' = 'organisation' then 'org_not_started'
      when p.user_id is null then 'no_profile'
      when p.closed_at is not null then 'closed'
      when not p.published and p.review_status = 'draft' then 'not_sent'
      when p.review_status = 'pending' then 'pending'
      when p.review_status = 'changes_requested' then 'changes'
      when p.review_status = 'rejected' then 'rejected'
      when p.published then 'public'
      else 'unpublished'
    end,
    o.id, o.name, coalesce(p.id_status, ''),
    exists (select 1 from public.agreement_signatures s where s.user_id = u.id),
    (select count(*)::integer from public.applications a where a.user_id = u.id and a.status = 'pending'),
    (select count(*)::integer from public.engagements e where (e.user_id = u.id or e.organisation_id = o.id) and e.status in ('awaiting_signatures', 'active')),
    (select count(*)::integer from public.engagements e where (e.user_id = u.id or e.organisation_id = o.id) and e.status = 'completed'),
    (select count(*)::integer from public.notifications x where x.user_id = u.id and (x.kind like 'finish_signup%' or x.kind like 'profile_unsent%' or x.kind = 'signup_reminder'))
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  left join lateral (select om.organisation_id, om.full_name from public.organisation_members om where om.user_id = u.id order by om.created_at limit 1) m on true
  left join public.organisations o on o.id = m.organisation_id
  order by u.created_at desc;
end $function$;
revoke all on function public.admin_people() from public, anon;
grant execute on function public.admin_people() to authenticated;
