-- Round-3 audit B18: deleting a suspended or removed person's account was refused halfway, because the database
-- clears references to the deleted account (hours, invitations, needs are set to null), and the suspension check
-- treated that as the suspended person changing those rows. An update whose only change is clearing a reference to the
-- caller's own account is now let through; everything else stays blocked while suspended.
create or replace function public.suspension_guard()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare u uuid := auth.uid();
begin
  if u is null or exists (select 1 from public.admins a where a.user_id = u) then return new; end if;
  if not public.is_suspended(u) then return new; end if;
  if tg_op = 'UPDATE' and not exists (
    select 1 from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and not (n.value = 'null'::jsonb and o.value = to_jsonb(u::text))
  ) then
    return new;
  end if;
  raise exception 'Your account is suspended while Handova looks into a concern. Write to safeguarding@handova.org if you have questions.';
end $function$;
revoke all on function public.suspension_guard() from public, anon, authenticated;

-- B20: the site only reads contribution signatures (signing goes through sign_engagement).
revoke insert, update, truncate, references, trigger on public.contribution_signatures from anon, authenticated;
