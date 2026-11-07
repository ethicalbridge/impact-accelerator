-- Newsletter (M9): people who tick "Send me the Ethical Bridge and Handova newsletter" at sign-up are added to the
-- Brevo list once their email is confirmed. The consent (time and wording) is in the account metadata; this table tracks
-- the hand-over to Brevo. Only the server reads or writes it.
create table if not exists public.newsletter_signups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  consent_at timestamptz not null default now(),
  wording text,
  subscribed_at timestamptz,
  tries int not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);
alter table public.newsletter_signups enable row level security;
revoke all on public.newsletter_signups from anon, authenticated;

create or replace function public.newsletter_queue(uid uuid)
 returns void language plpgsql security definer set search_path to ''
as $$
begin
  perform net.http_post(
    url := 'https://jcfezemkbseaqbwuojhs.supabase.co/functions/v1/newsletter-subscribe',
    body := jsonb_build_object('user_id', uid),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 8000);
end $$;
revoke all on function public.newsletter_queue(uuid) from public, anon, authenticated;

-- When an account that ticked the box confirms its email (or is created already confirmed), queue it for Brevo.
create or replace function public.newsletter_on_confirm()
 returns trigger language plpgsql security definer set search_path to ''
as $$
begin
  if new.email_confirmed_at is not null
     and (tg_op = 'INSERT' or old.email_confirmed_at is null)
     and coalesce(new.raw_user_meta_data->>'newsletter', '') = 'true' then
    insert into public.newsletter_signups (user_id, consent_at, wording)
      values (new.id, coalesce((new.raw_user_meta_data->>'newsletter_consent_at')::timestamptz, now()), new.raw_user_meta_data->>'newsletter_wording')
      on conflict (user_id) do nothing;
    perform public.newsletter_queue(new.id);
  end if;
  return new;
exception when others then
  return new; -- never block a sign-up or a confirmation because of the newsletter
end $$;
drop trigger if exists on_auth_user_newsletter on auth.users;
create trigger on_auth_user_newsletter after insert or update of email_confirmed_at on auth.users
  for each row execute function public.newsletter_on_confirm();

-- Retry anyone not yet added (for example before the Brevo key was set), every hour, for up to 3 days of tries.
create or replace function public.newsletter_retry()
 returns int language plpgsql security definer set search_path to ''
as $$
declare r record; c int := 0;
begin
  for r in select user_id from public.newsletter_signups where subscribed_at is null and tries < 72 order by created_at limit 100 loop
    perform public.newsletter_queue(r.user_id); c := c + 1;
  end loop;
  return c;
end $$;
revoke all on function public.newsletter_retry() from public, anon, authenticated;
select cron.unschedule('handova-newsletter-retry') where exists (select 1 from cron.job where jobname = 'handova-newsletter-retry');
select cron.schedule('handova-newsletter-retry', '15 * * * *', 'select public.newsletter_retry()');

-- Privacy notice version 5 (7 Nov 2026): newsletter through Brevo. Keep in step with src/config.js privacyVersion.
create or replace function public.current_policy_version(k text)
 returns text language sql immutable set search_path to ''
as $$ select case k when 'terms' then 'terms-2026-10-20-2' when 'privacy' then 'privacy-2026-11-07-5' else null end $$;
