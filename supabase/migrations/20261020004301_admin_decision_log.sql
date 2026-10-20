-- Admin decision log (B9, 20 Oct 2026): every admin decision on a profile (review, identity), a need or a report is
-- written to admin_actions with the time, the change and the note. Organisation decisions, deletions and
-- "Close for them" were already logged by their own functions.
create or replace function public.log_admin_change()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare a uuid := auth.uid();
begin
  if a is null or not exists (select 1 from public.admins ad where ad.user_id = a) then return new; end if;
  if tg_table_name = 'profiles' then
    if new.review_status is distinct from old.review_status then
      insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
      values (a, 'profile_' || new.review_status::text, 'profile', new.user_id, jsonb_build_object('from', old.review_status::text, 'to', new.review_status::text, 'name', new.name));
    end if;
    if new.id_status is distinct from old.id_status then
      insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
      values (a, 'identity_' || coalesce(new.id_status::text, 'none'), 'profile', new.user_id, jsonb_build_object('from', old.id_status::text, 'to', new.id_status::text, 'name', new.name));
    end if;
  elsif tg_table_name = 'needs' then
    if new.status is distinct from old.status then
      insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
      values (a, 'need_' || new.status::text, 'need', new.id, jsonb_build_object('from', old.status::text, 'to', new.status::text, 'title', new.title, 'note', new.review_note));
    end if;
  elsif tg_table_name = 'reports' then
    if new.status is distinct from old.status or new.admin_note is distinct from old.admin_note then
      insert into public.admin_actions (admin_id, action, target_type, target_id, detail)
      values (a, 'report_' || new.status, 'report', new.id, jsonb_build_object('from', old.status, 'to', new.status, 'reason', new.reason, 'note', new.admin_note));
    end if;
  end if;
  return new;
end $function$;
revoke all on function public.log_admin_change() from public, anon, authenticated;

create or replace trigger profiles_admin_log after update on public.profiles for each row execute function public.log_admin_change();
create or replace trigger needs_admin_log after update on public.needs for each row execute function public.log_admin_change();
create or replace trigger reports_admin_log after update on public.reports for each row execute function public.log_admin_change();
