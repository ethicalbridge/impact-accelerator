-- Re-audit 20 Oct 2026, B16: notification emails that failed are retried for up to 24 hours (was 15 minutes),
-- report alerts first. Goes with the notify-email function change (age limit 24 hours, and it records why an email
-- is not sent, so those are not retried).
--   email_tries / email_tried_at: retries so far, spaced out 10, 20, 40, 80 minutes, then every 160 minutes.
--   email_skipped: set by notify-email when an email will never be sent (opted out, no confirmed address,
--   throttled, too old), so the retry job doesn't keep picking it up.
alter table public.notifications add column if not exists email_tries smallint not null default 0;
alter table public.notifications add column if not exists email_tried_at timestamptz;
alter table public.notifications add column if not exists email_skipped text not null default '';

create index if not exists notifications_unsent_idx on public.notifications (created_at) where emailed_at is null and email_skipped = '';

create or replace function public.retry_unsent_emails()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare n record; c integer := 0;
begin
  for n in select x.id from public.notifications x
    where x.emailed_at is null and x.email_skipped = ''
      and x.created_at between now() - interval '24 hours' and now() - interval '2 minutes'
      and (x.email_tried_at is null or x.email_tried_at < now() - interval '5 minutes' * power(2, least(x.email_tries, 5)))
    order by case when x.kind = 'report' then 0 when x.kind in ('id_check', 'account', 'conflict_declared', 'report_received') then 1 else 2 end, x.created_at
    limit 100
  loop
    update public.notifications set email_tries = email_tries + 1, email_tried_at = now() where id = n.id;
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
