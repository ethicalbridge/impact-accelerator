-- 13 Nov 2026: when a need was last opened for applications. It is set when a need goes live, and again when it is
-- reopened (back to open, or a new apply-by date approved after the old one had passed). Public pages show it as the
-- posting date and the admin Progress page counts waits from it.
alter table public.needs add column if not exists published_at timestamptz;
grant select (published_at) on public.needs to anon, authenticated;

create or replace function public.need_published_at()
 returns trigger language plpgsql set search_path to ''
as $function$
begin
  if tg_op = 'INSERT' then
    if new.status = 'open' then new.published_at := coalesce(new.published_at, now()); end if;
  elsif new.status = 'open' and old.status is distinct from 'open' then
    new.published_at := now();
  elsif new.status = 'open' and old.requested_deadline is not null and new.requested_deadline is null
        and new.deadline is distinct from old.deadline and old.deadline < current_date then
    new.published_at := now();
  end if;
  return new;
end $function$;
create or replace trigger needs_published_at before insert or update on public.needs
  for each row execute function public.need_published_at();

-- Backfill: first time live, or the last time a passed apply-by date was replaced.
update public.needs n set published_at = coalesce((
    select max(a.created_at) from public.admin_actions a
     where a.target_id = n.id and a.action = 'need_deadline_approved'
       and nullif(a.detail->>'from', '')::date < a.created_at::date), n.approved_at)
 where n.published_at is null and n.approved_at is not null;
