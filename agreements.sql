-- Versioned, dual-signature contribution agreements for accepted matches.
create table public.ia_agreements (
 id uuid primary key default gen_random_uuid(),
 need_id uuid not null references public.ia_needs(id),
 user_id uuid not null references public.ia_profiles(user_id),
 terms_version text not null default '2026-09-22-v1',
 scope_snapshot jsonb not null,
 talent_signed_name text not null default '' check(length(talent_signed_name)<=160),
 talent_signed_at timestamptz,
 organisation_signed_name text not null default '' check(length(organisation_signed_name)<=160),
 organisation_signed_by uuid references auth.users(id),
 organisation_signed_at timestamptz,
 created_at timestamptz not null default now(),
 unique(need_id,user_id),
 check((talent_signed_at is null and talent_signed_name='') or (talent_signed_at is not null and length(trim(talent_signed_name))>=2)),
 check((organisation_signed_at is null and organisation_signed_name='' and organisation_signed_by is null) or (organisation_signed_at is not null and length(trim(organisation_signed_name))>=2 and organisation_signed_by is not null))
);
create index ia_agreements_user on public.ia_agreements(user_id);
create index ia_agreements_need on public.ia_agreements(need_id);
create index ia_agreements_org_signer on public.ia_agreements(organisation_signed_by);
alter table public.ia_agreements enable row level security;
revoke all on public.ia_agreements from anon,authenticated;
grant select,insert on public.ia_agreements to authenticated;
grant update(talent_signed_name,talent_signed_at,organisation_signed_name,organisation_signed_by,organisation_signed_at) on public.ia_agreements to authenticated;

create policy ia_agreements_read on public.ia_agreements for select to authenticated using(
 user_id=(select auth.uid()) or exists(
  select 1 from public.ia_needs n join public.organisation_members m on m.organisation_id=n.organisation_id
  where n.id=ia_agreements.need_id and m.user_id=(select auth.uid())
 )
);
create policy ia_agreements_insert on public.ia_agreements for insert to authenticated with check(
 (user_id=(select auth.uid()) or exists(
  select 1 from public.ia_needs n join public.organisation_members m on m.organisation_id=n.organisation_id
  where n.id=ia_agreements.need_id and m.user_id=(select auth.uid())
 )) and (
  exists(select 1 from public.ia_applications a where a.need_id=ia_agreements.need_id and a.user_id=ia_agreements.user_id and a.status='accepted') or
  exists(select 1 from public.ia_invitations i where i.need_id=ia_agreements.need_id and i.user_id=ia_agreements.user_id and i.status='accepted')
 )
);
create policy ia_agreements_update on public.ia_agreements for update to authenticated using(
 user_id=(select auth.uid()) or exists(
  select 1 from public.ia_needs n join public.organisation_members m on m.organisation_id=n.organisation_id
  where n.id=ia_agreements.need_id and m.user_id=(select auth.uid())
 )
) with check(
 user_id=(select auth.uid()) or exists(
  select 1 from public.ia_needs n join public.organisation_members m on m.organisation_id=n.organisation_id
  where n.id=ia_agreements.need_id and m.user_id=(select auth.uid())
 )
);

create function public.ia_prepare_agreement(p_need_id uuid,p_user_id uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
 if not (
  exists(select 1 from public.ia_applications a where a.need_id=p_need_id and a.user_id=p_user_id and a.status='accepted') or
  exists(select 1 from public.ia_invitations i where i.need_id=p_need_id and i.user_id=p_user_id and i.status='accepted')
 ) then raise exception 'An accepted match is required before preparing an agreement.'; end if;
 insert into public.ia_agreements(need_id,user_id,scope_snapshot)
 select n.id,p.user_id,jsonb_build_object(
  'need_title',n.title,'description',n.description,'output',n.output,'skills',n.skills,
  'languages',n.languages,'estimated_hours',n.hours,'arrangement',n.arrangement,
  'location',n.location,'organisation',coalesce(o.public_name,o.registered_name),
  'talent',p.name
 )
 from public.ia_needs n join public.organisations o on o.id=n.organisation_id
 join public.ia_profiles p on p.user_id=p_user_id where n.id=p_need_id
 on conflict(need_id,user_id) do nothing;
 select id into v_id from public.ia_agreements where need_id=p_need_id and user_id=p_user_id;
 return v_id;
end $$;
revoke all on function public.ia_prepare_agreement(uuid,uuid) from public,anon;
grant execute on function public.ia_prepare_agreement(uuid,uuid) to authenticated;

create function public.ia_agreement_signing_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.need_id<>old.need_id or new.user_id<>old.user_id or new.terms_version<>old.terms_version or new.scope_snapshot<>old.scope_snapshot or new.created_at<>old.created_at then
  raise exception 'Agreement scope and version are immutable.';
 end if;
 if (select auth.uid())=old.user_id then
  if new.organisation_signed_name<>old.organisation_signed_name or new.organisation_signed_at is distinct from old.organisation_signed_at or new.organisation_signed_by is distinct from old.organisation_signed_by then raise exception 'Talent cannot sign for the organisation.'; end if;
  if old.talent_signed_at is not null then raise exception 'Your agreement signature is already recorded.'; end if;
  if length(trim(new.talent_signed_name))<2 then raise exception 'Enter your full name to sign.'; end if;
  new.talent_signed_at=now();
 elsif exists(select 1 from public.ia_needs n join public.organisation_members m on m.organisation_id=n.organisation_id where n.id=old.need_id and m.user_id=(select auth.uid())) then
  if new.talent_signed_name<>old.talent_signed_name or new.talent_signed_at is distinct from old.talent_signed_at then raise exception 'Organisation members cannot sign for talent.'; end if;
  if old.organisation_signed_at is not null then raise exception 'The organisation signature is already recorded.'; end if;
  if length(trim(new.organisation_signed_name))<2 then raise exception 'Enter your full name to sign.'; end if;
  new.organisation_signed_by=(select auth.uid()); new.organisation_signed_at=now();
 else raise exception 'You are not a party to this agreement.';
 end if;
 return new;
end $$;
revoke all on function public.ia_agreement_signing_guard() from public,anon,authenticated;
create trigger ia_agreement_signing before update on public.ia_agreements for each row execute function public.ia_agreement_signing_guard();

drop policy hours_insert on public.ia_hours;
create policy hours_insert on public.ia_hours for insert to authenticated with check(
 user_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null and review_note=''
 and (exists(select 1 from public.ia_applications a where a.need_id=ia_hours.need_id and a.user_id=(select auth.uid()) and a.status='accepted')
      or exists(select 1 from public.ia_invitations i where i.need_id=ia_hours.need_id and i.user_id=(select auth.uid()) and i.status='accepted'))
 and exists(select 1 from public.ia_agreements g where g.need_id=ia_hours.need_id and g.user_id=(select auth.uid()) and g.talent_signed_at is not null and g.organisation_signed_at is not null)
);
