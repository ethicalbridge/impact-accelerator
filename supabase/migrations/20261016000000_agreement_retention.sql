-- Retain signed platform agreements for six years after account closure, then purge.
-- Identity verification rows already cascade when auth.users is deleted.
alter table public.agreement_signatures
  add column account_closed_at timestamptz;

create index agreement_signatures_account_closed_at
  on public.agreement_signatures (account_closed_at)
  where account_closed_at is not null;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Please sign in first.'; end if;

  update public.agreement_signatures
    set account_closed_at = now()
    where user_id = uid and account_closed_at is null;

  update public.engagements
    set scope = jsonb_set(scope, '{talent}', '"Former member"'),
        talent_signed_name = case when talent_signed_name <> '' then 'Former member' else '' end,
        public = false
    where user_id = uid;
  delete from public.messages where sender_id = uid;
  update public.organisations o set status = 'suspended'
    where exists (select 1 from public.organisation_members m where m.organisation_id = o.id and m.user_id = uid)
      and not exists (select 1 from public.organisation_members m where m.organisation_id = o.id and m.user_id <> uid);
  delete from auth.users where id = uid;
end $$;

create function public.purge_closed_account_signatures() returns bigint
language plpgsql security definer set search_path = '' as $$
declare removed bigint;
begin
  delete from public.agreement_signatures
    where account_closed_at is not null
      and account_closed_at + interval '6 years' <= now();
  get diagnostics removed = row_count;
  return removed;
end $$;

revoke all on function public.purge_closed_account_signatures() from public, anon, authenticated;

select cron.schedule(
  'handova-signature-retention',
  '10 2 * * *',
  'select public.purge_closed_account_signatures()'
);
