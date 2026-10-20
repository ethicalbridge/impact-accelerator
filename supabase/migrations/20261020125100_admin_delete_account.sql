-- Admins can delete an account through the normal deletion flow (audit 20 Oct 2026: A24, retention alert).
-- The weekly retention alert says "Delete them from Admin › Professionals". This adds that Delete action.
-- The account-delete edge function, called by an admin with { user_id }, removes the person's identity-check
-- sessions and photos exactly as for a self-deletion, records the 5-minute authorisation, then calls
-- admin_delete_account(). That function runs the person's own delete_my_account() as them, so the same rules apply:
-- the same blockers (open reports about them, open contributions), signature records kept for six years, kept
-- conversations marked "Former member", organisations left without a member suspended. The deletion is logged.

-- What would stop this person deleting their own account (null when nothing does).
create or replace function public.admin_account_deletion_blocker(p_user uuid)
 returns text language plpgsql volatile security definer set search_path to ''
as $function$
declare old_claims text := current_setting('request.jwt.claims', true); old_sub text := current_setting('request.jwt.claim.sub', true); res text;
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  if p_user is null or p_user = auth.uid() then return 'Use Account and privacy to delete your own account.'; end if;
  if exists (select 1 from public.admins a where a.user_id = p_user) then return 'An admin account can’t be deleted here.'; end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then return 'This account no longer exists.'; end if;
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  res := public.account_deletion_blocker();
  perform set_config('request.jwt.claim.sub', coalesce(old_sub, ''), true);
  perform set_config('request.jwt.claims', coalesce(old_claims, ''), true);
  return res;
end $function$;
revoke all on function public.admin_account_deletion_blocker(uuid) from public, anon;
grant execute on function public.admin_account_deletion_blocker(uuid) to authenticated;

create or replace function public.admin_delete_account(p_user uuid, p_reason text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare
  me uuid := auth.uid();
  old_claims text := current_setting('request.jwt.claims', true);
  old_sub text := current_setting('request.jwt.claim.sub', true);
  blocker text; nm text;
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  blocker := public.admin_account_deletion_blocker(p_user);
  if blocker is not null then raise exception '%', blocker; end if;
  select coalesce(p.name, nullif(u.raw_user_meta_data->>'full_name', ''), '') into nm
  from auth.users u left join public.profiles p on p.user_id = u.id where u.id = p_user;
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform public.delete_my_account();
  perform set_config('request.jwt.claim.sub', coalesce(old_sub, ''), true);
  perform set_config('request.jwt.claims', coalesce(old_claims, ''), true);
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
  values (me, 'account_deleted', 'profile', p_user, jsonb_build_object('name', nm, 'reason', left(trim(coalesce(p_reason, '')), 600)));
end $function$;
revoke all on function public.admin_delete_account(uuid, text) from public, anon;
grant execute on function public.admin_delete_account(uuid, text) to authenticated;
