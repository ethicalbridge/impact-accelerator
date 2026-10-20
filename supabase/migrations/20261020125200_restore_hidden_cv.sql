-- Lifting a removal: restore the impact CV entries the removal hid, if the admin chooses to (audit 20 Oct 2026: A24).
-- admin_suspend_user(..., p_remove => true) hides every completed contribution (hidden_by_handova). Lifting the
-- removal used to leave them hidden. This makes them available again; the person chooses which to show (nothing is
-- made public automatically) and is told once. Kept apart from admin_lift_suspension so it can be asked separately.

create or replace function public.admin_restore_user_cv(p_user uuid, p_note text)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare n integer;
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  update public.engagements set hidden_by_handova = null where user_id = p_user and hidden_by_handova is not null;
  get diagnostics n = row_count;
  if n > 0 then
    insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), 'cv_entries_restored', 'profile', p_user, jsonb_build_object('count', n, 'note', left(coalesce(p_note, ''), 600),
      'name', (select p.name from public.profiles p where p.user_id = p_user)));
    perform public.notify(p_user, 'cv', 'Your impact CV entries are available again',
      'You can choose which contributions to show on your impact CV again from your workspace.', '#workspace');
  end if;
  return n;
end $function$;
revoke all on function public.admin_restore_user_cv(uuid, text) from public, anon;
grant execute on function public.admin_restore_user_cv(uuid, text) to authenticated;
