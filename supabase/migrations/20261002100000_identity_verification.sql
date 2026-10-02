-- Identity verification through Didit (hosted passport/ID + selfie check).
-- Handova stores only the outcome and the name on the document: never images, document numbers or dates of birth.
alter table public.profiles
  add column id_status text not null default '' check (id_status in ('', 'started', 'in_review', 'approved', 'declined', 'name_mismatch')),
  add column id_verified_at timestamptz,
  add column id_document_name text not null default '';
-- Users cannot write these columns (no column grants); only the id-verify edge function and admins can.

create table public.id_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'didit',
  session_id text not null unique,
  status text not null default 'Not Started',
  document_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index id_verifications_user on public.id_verifications (user_id, created_at desc);
alter table public.id_verifications enable row level security;
revoke all on public.id_verifications from anon, authenticated;
grant select on public.id_verifications to authenticated;
create policy id_verifications_read on public.id_verifications for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- Switch: identity checks are required before a professional signs their first contribution agreement
-- only once the Didit account is connected. Admins turn it on with: update public.app_settings set value = 'true' where key = 'require_id_verification';
create table public.app_settings (key text primary key, value text not null default '');
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to anon, authenticated;
create policy app_settings_read on public.app_settings for select using (true);
insert into public.app_settings (key, value) values ('require_id_verification', 'false');

create or replace function public.id_check_required() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select value = 'true' from public.app_settings where key = 'require_id_verification'), false)
$$;

-- Admin: confirm a check by hand (for example when the document uses a different form of the person's name).
create or replace function public.admin_confirm_identity(p_user uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  update public.profiles set id_status = case when p_approve then 'approved' else 'declined' end,
    id_verified_at = case when p_approve then now() else null end where user_id = p_user;
  perform public.notify(p_user, 'id_check', case when p_approve then 'Your identity is verified' else 'We could not confirm your identity' end,
    case when p_approve then 'Thank you. Your profile now shows ID verified.' else 'Please try the identity check again, or write to hello@handova.org.' end, '#workspace/profile');
end $$;
revoke all on function public.admin_confirm_identity(uuid, boolean) from public, anon;
grant execute on function public.admin_confirm_identity(uuid, boolean) to authenticated;

-- A professional must have a verified identity before signing a contribution agreement (when the switch is on).
create or replace function public.sign_engagement(p_id uuid, p_name text)
 returns text language plpgsql security definer set search_path to '' as $function$
declare e record; s text;
begin
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Type your full name to sign.'; end if;
  select * into e from public.engagements where id = p_id for update;
  if e.id is null then raise exception 'Agreement not found.'; end if;
  if e.status <> 'awaiting_signatures' then raise exception 'This agreement is no longer awaiting signatures.'; end if;
  if e.user_id = auth.uid() then
    if e.talent_signed_at is not null then raise exception 'You have already signed.'; end if;
    if public.id_check_required() and not exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.id_status = 'approved') then
      raise exception 'Please verify your identity before signing your first contribution agreement. You can do it from your profile in a few minutes.';
    end if;
    update public.engagements set talent_signed_name = trim(p_name), talent_signed_at = now() where id = p_id;
    perform public.notify_org(e.organisation_id, 'signed', 'The professional signed the agreement', e.scope->>'need_title', '#agreement/' || p_id);
  elsif public.is_org_member(e.organisation_id) then
    if e.org_signed_at is not null then raise exception 'Your organisation has already signed.'; end if;
    update public.engagements set org_signed_name = trim(p_name), org_signed_by = auth.uid(), org_signed_at = now() where id = p_id;
    perform public.notify(e.user_id, 'signed', 'The organisation signed the agreement', e.scope->>'need_title', '#agreement/' || p_id);
  else raise exception 'You are not a party to this agreement.';
  end if;
  update public.engagements set status = 'active' where id = p_id and talent_signed_at is not null and org_signed_at is not null returning status into s;
  return coalesce(s, 'awaiting_signatures');
end $function$;
