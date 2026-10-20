-- Video-call identity checks (audit 20 Oct 2026: A21).
-- 1. admin_user_emails(): admins see the email of the people they need to write to (video-call requests, accounts
--    to delete). Emails stay in auth.users; nothing is copied.
-- 2. admin_decline_id_video(): "Couldn't verify", with a reason the person sees in their notification (and email).
--    The request's status becomes 'declined' (already allowed by the table) and the reason is kept on the request.
--    Asking again (request_id_video_call) sets the status back to 'requested'.

alter table public.id_video_requests add column if not exists decline_reason text not null default '';

create or replace function public.admin_user_emails(p_users uuid[])
 returns table(user_id uuid, email text)
 language plpgsql stable security definer set search_path to ''
as $function$
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  return query select u.id, u.email::text from auth.users u where u.id = any(p_users);
end $function$;
revoke all on function public.admin_user_emails(uuid[]) from public, anon;
grant execute on function public.admin_user_emails(uuid[]) to authenticated;

create or replace function public.admin_decline_id_video(p_user uuid, p_reason text)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare v_reason text := left(trim(coalesce(p_reason, '')), 600);
begin
  if not public.is_admin() then raise exception 'Only Handova admins can do this.'; end if;
  if length(v_reason) < 10 then raise exception 'Explain briefly why the identity couldn’t be verified. The person sees this.'; end if;
  update public.id_video_requests set status = 'declined', decided_at = now(), decided_by = auth.uid(), decline_reason = v_reason
  where user_id = p_user and status = 'requested';
  if not found then raise exception 'There is no open video-call request for this person.'; end if;
  insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
  values (auth.uid(), 'id_video_not_verified', 'profile', p_user, jsonb_build_object('reason', v_reason,
    'name', (select p.name from public.profiles p where p.user_id = p_user)));
  perform public.notify(p_user, 'id_check', 'We couldn’t verify your identity on the video call',
    v_reason || ' You can try the online identity check from your profile, or ask for another video call.', '#workspace');
end $function$;
revoke all on function public.admin_decline_id_video(uuid, text) from public, anon;
grant execute on function public.admin_decline_id_video(uuid, text) to authenticated;
