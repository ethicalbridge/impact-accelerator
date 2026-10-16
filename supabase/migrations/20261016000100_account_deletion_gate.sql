-- Only the server-side deletion workflow may authorize the final account RPC.
-- This prevents direct RPC calls from bypassing Didit and Storage deletion.
create table public.account_deletion_authorizations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now()
);
alter table public.account_deletion_authorizations enable row level security;
revoke all on public.account_deletion_authorizations from public, anon, authenticated;
grant select, insert, update, delete on public.account_deletion_authorizations to service_role;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if not exists (
    select 1 from public.account_deletion_authorizations a
    where a.user_id = uid and a.verified_at > now() - interval '5 minutes'
  ) then
    raise exception 'Please use Account and privacy to delete your account.';
  end if;
  delete from public.account_deletion_authorizations where user_id = uid;

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
