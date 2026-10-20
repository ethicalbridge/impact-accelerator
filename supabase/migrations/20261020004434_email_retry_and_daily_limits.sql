-- B12 (20 Oct 2026).
-- 1. Notification emails that failed to send are tried again: every 5 minutes, unsent notifications created 2 to 14
--    minutes ago are passed to notify-email again (it only sends notifications under 15 minutes old, once each).
-- 2. Daily limits per person against spam: 100 messages, 20 invitations and 10 applications in 24 hours.
--    Handova admins are not limited.
create or replace function public.retry_unsent_emails()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare n record; c integer := 0;
begin
  for n in select id from public.notifications
    where emailed_at is null and created_at between now() - interval '14 minutes' and now() - interval '2 minutes'
    order by created_at limit 100
  loop
    perform net.http_post(
      url := 'https://jcfezemkbseaqbwuojhs.supabase.co/functions/v1/notify-email',
      body := jsonb_build_object('id', n.id),
      headers := jsonb_build_object('Content-Type', 'application/json'),
      timeout_milliseconds := 8000);
    c := c + 1;
  end loop;
  return c;
end $function$;
revoke all on function public.retry_unsent_emails() from public, anon, authenticated;
select cron.schedule('handova-email-retry', '*/5 * * * *', $$select public.retry_unsent_emails()$$);

create or replace function public.daily_limit_guard()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare u uuid := auth.uid(); n integer;
begin
  if u is null or exists (select 1 from public.admins a where a.user_id = u) then return new; end if;
  if tg_table_name = 'messages' then
    if new.sender_id is distinct from u then return new; end if;
    select count(*) into n from public.messages where sender_id = u and created_at > now() - interval '24 hours';
    if n >= 100 then raise exception 'You have sent 100 messages in the last 24 hours, the daily limit. Please try again tomorrow, or write to hello@handova.org if you need more.'; end if;
  elsif tg_table_name = 'invitations' then
    select count(*) into n from public.invitations where invited_by = u and created_at > now() - interval '24 hours';
    if n >= 20 then raise exception 'You have sent 20 invitations in the last 24 hours, the daily limit. Please try again tomorrow.'; end if;
  elsif tg_table_name = 'applications' then
    select count(*) into n from public.applications where user_id = u and created_at > now() - interval '24 hours';
    if n >= 10 then raise exception 'You have applied to 10 needs in the last 24 hours, the daily limit. Please try again tomorrow.'; end if;
  end if;
  return new;
end $function$;
revoke all on function public.daily_limit_guard() from public, anon, authenticated;
create or replace trigger messages_daily_limit before insert on public.messages for each row execute function public.daily_limit_guard();
create or replace trigger invitations_daily_limit before insert on public.invitations for each row execute function public.daily_limit_guard();
create or replace trigger applications_daily_limit before insert on public.applications for each row execute function public.daily_limit_guard();
