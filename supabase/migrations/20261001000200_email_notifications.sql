-- Email notifications: every in-app notification is also sent by email (title and link only, never message content),
-- through the notify-email Edge Function. Nothing is sent until RESEND_API_KEY and NOTIFY_FROM are set as function secrets.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Per-user email preference (default on).
create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  email_notifications boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
create policy user_settings_own on public.user_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.user_settings from anon;
grant select, insert, update (email_notifications, updated_at) on public.user_settings to authenticated;

-- Link a notification to the record it is about (used to avoid duplicate reminders).
alter table public.notifications add column ref uuid;

create function public.email_notification() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://jcfezemkbseaqbwuojhs.supabase.co/functions/v1/notify-email',
    body := jsonb_build_object('id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 8000
  );
  return new;
exception when others then
  return new; -- never block the action that created the notification
end $$;
revoke all on function public.email_notification() from public, anon, authenticated;
create trigger notifications_email after insert on public.notifications for each row execute function public.email_notification();

-- Six-month check: remind organisation members once when a completed engagement's follow-up is due.
create function public.followup_reminders() returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  insert into public.notifications (user_id, kind, title, body, link, ref)
  select m.user_id, 'followup', 'Six months on: is the work still in use?', coalesce(e.scope->>'need_title', ''), '#org', e.id
  from public.engagements e
  join public.organisation_members m on m.organisation_id = e.organisation_id
  where e.status = 'completed' and e.followup_due <= current_date and e.followup_answered_at is null
    and not exists (select 1 from public.notifications x where x.user_id = m.user_id and x.kind = 'followup' and x.ref = e.id);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.followup_reminders() from public, anon, authenticated;
select cron.schedule('ia-followup-reminders', '20 1 * * *', 'select public.followup_reminders()');
