-- 11 Nov 2026: review alerts for Handova admins name what is waiting, so each email has its own subject
-- ("Organisation to review: LA RESCOUSSE") and mail apps stop stacking them into one conversation.
create or replace function public.notification_title_with_name()
 returns trigger language plpgsql set search_path to ''
as $function$
begin
  if new.kind in ('org_review', 'need_submitted', 'profile_review')
     and coalesce(trim(new.body), '') <> '' and position(trim(new.body) in new.title) = 0 then
    new.title := new.title || ': ' || left(trim(new.body), 120);
  end if;
  return new;
end $function$;
create or replace trigger notifications_title_with_name before insert on public.notifications
  for each row execute function public.notification_title_with_name();
