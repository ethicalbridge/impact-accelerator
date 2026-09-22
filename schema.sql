-- Accelerator owns only ia_* tables. Existing Ethical Bridge records are referenced, never copied.
create table public.ia_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 2 and 120),
 headline text not null default '' check(length(headline)<=160),
 bio text not null default '' check(length(bio)<=4000),
 location text not null default '' check(length(location)<=160),
 skills text[] not null default '{}' check(cardinality(skills)<=30),
 languages text[] not null default '{}' check(cardinality(languages)<=20),
 experience text not null default '' check(length(experience)<=8000),
 hours_available integer not null default 0 check(hours_available between 0 and 160),
 arrangement text not null default 'Remote' check(arrangement in ('Remote','Hybrid','In person')),
 website text not null default '' check(website='' or website ~ '^https?://'),
 published boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.ia_portfolio (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.ia_profiles(user_id) on delete cascade,
 title text not null check(length(trim(title)) between 2 and 160),
 description text not null default '' check(length(description)<=6000),
 role text not null default '' check(length(role)<=1000),
 outcome text not null default '' check(length(outcome)<=2000),
 client text not null default '' check(length(client)<=160),
 work_date date,
 work_type text not null check(work_type in ('Research','Report','Publication','Campaign','Design','Website','Video','Training','Strategy','Data & technology','Other')),
 skills text[] not null default '{}' check(cardinality(skills)<=30),
 link text not null default '' check(link='' or link ~ '^https?://'),
 image text not null default '' check(image='' or image ~ '^https://'),
 featured boolean not null default false,
 published boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.ia_needs (
 id uuid primary key default gen_random_uuid(),
 organisation_id uuid not null references public.organisations(id),
 title text not null check(length(trim(title)) between 5 and 160),
 description text not null check(length(trim(description)) between 20 and 6000),
 output text not null check(length(trim(output)) between 5 and 2000),
 skills text[] not null default '{}' check(cardinality(skills)<=30),
 hours integer not null check(hours between 1 and 500),
 arrangement text not null check(arrangement in ('Remote','Hybrid','In person')),
 location text not null default '' check(length(location)<=160),
 deadline date,
 status text not null default 'draft' check(status in ('draft','open','closed')),
 created_at timestamptz not null default now()
);
create table public.ia_applications (
 id uuid primary key default gen_random_uuid(),
 need_id uuid not null references public.ia_needs(id),
 user_id uuid not null references public.ia_profiles(user_id),
 message text not null check(length(trim(message)) between 20 and 4000),
 status text not null default 'pending' check(status in ('pending','accepted','declined','withdrawn')),
 created_at timestamptz not null default now(),
 unique(need_id,user_id)
);
create table public.ia_invitations (
 id uuid primary key default gen_random_uuid(),
 need_id uuid not null references public.ia_needs(id),
 user_id uuid not null references public.ia_profiles(user_id),
 message text not null check(length(trim(message)) between 20 and 4000),
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 unique(need_id,user_id)
);
create table public.ia_hours (
 id uuid primary key default gen_random_uuid(),
 need_id uuid not null references public.ia_needs(id),
 user_id uuid not null references public.ia_profiles(user_id),
 work_date date not null check(work_date<=current_date),
 hours numeric(4,2) not null check(hours>0 and hours<=24),
 description text not null check(length(trim(description)) between 10 and 2000),
 evidence text not null default '' check(evidence='' or evidence ~ '^https?://'),
 status text not null default 'pending' check(status in ('pending','approved','changes_requested')),
 review_note text not null default '' check(length(review_note)<=2000),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.ia_saved (
 user_id uuid not null references auth.users(id) on delete cascade,
 need_id uuid not null references public.ia_needs(id),
 primary key(user_id,need_id)
);
create index ia_portfolio_owner on public.ia_portfolio(user_id);
create index ia_needs_org on public.ia_needs(organisation_id);
create index ia_applications_user on public.ia_applications(user_id);
create index ia_invitations_user on public.ia_invitations(user_id);
create index ia_hours_user on public.ia_hours(user_id);
create index ia_hours_need on public.ia_hours(need_id);
create index ia_hours_reviewer on public.ia_hours(reviewed_by);
create index ia_saved_need on public.ia_saved(need_id);

alter table public.ia_profiles enable row level security;
alter table public.ia_portfolio enable row level security;
alter table public.ia_needs enable row level security;
alter table public.ia_applications enable row level security;
alter table public.ia_invitations enable row level security;
alter table public.ia_hours enable row level security;
alter table public.ia_saved enable row level security;
revoke all on public.ia_profiles,public.ia_portfolio,public.ia_needs,public.ia_applications,public.ia_invitations,public.ia_hours,public.ia_saved from anon,authenticated;
grant select on public.ia_profiles,public.ia_portfolio,public.ia_needs to anon;
grant select,insert,update on public.ia_profiles,public.ia_portfolio,public.ia_needs to authenticated;
grant delete on public.ia_portfolio to authenticated;
grant select,insert on public.ia_applications,public.ia_invitations,public.ia_hours to authenticated;
grant update(status) on public.ia_applications,public.ia_invitations to authenticated;
grant update(status,review_note) on public.ia_hours to authenticated;
grant select,insert,delete on public.ia_saved to authenticated;

create policy profiles_read on public.ia_profiles for select using(published or user_id=(select auth.uid()));
create policy profiles_insert on public.ia_profiles for insert to authenticated with check(user_id=(select auth.uid()));
create policy profiles_update on public.ia_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy portfolio_read on public.ia_portfolio for select using(user_id=(select auth.uid()) or (published and exists(select 1 from public.ia_profiles p where p.user_id=ia_portfolio.user_id and p.published)));
create policy portfolio_insert on public.ia_portfolio for insert to authenticated with check(user_id=(select auth.uid()));
create policy portfolio_update on public.ia_portfolio for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy portfolio_delete on public.ia_portfolio for delete to authenticated using(user_id=(select auth.uid()));
create policy needs_read on public.ia_needs for select using(status in ('open','closed') or exists(select 1 from public.organisation_members m where m.organisation_id=ia_needs.organisation_id and m.user_id=(select auth.uid())));
create policy needs_insert on public.ia_needs for insert to authenticated with check(exists(select 1 from public.organisation_members m where m.organisation_id=ia_needs.organisation_id and m.user_id=(select auth.uid())) and (status='draft' or exists(select 1 from public.organisations o where o.id=ia_needs.organisation_id and o.status='published')));
create policy needs_update on public.ia_needs for update to authenticated using(exists(select 1 from public.organisation_members m where m.organisation_id=ia_needs.organisation_id and m.user_id=(select auth.uid()))) with check(exists(select 1 from public.organisation_members m where m.organisation_id=ia_needs.organisation_id and m.user_id=(select auth.uid())) and (status='draft' or exists(select 1 from public.organisations o where o.id=ia_needs.organisation_id and o.status='published')));
create policy applications_read on public.ia_applications for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.ia_needs n join public.organisation_members m on m.organisation_id=n.organisation_id where n.id=ia_applications.need_id and m.user_id=(select auth.uid())));
create policy applications_insert on public.ia_applications for insert to authenticated with check(user_id=(select auth.uid()) and status='pending' and exists(select 1 from public.ia_profiles p where p.user_id=(select auth.uid()) and p.published) and exists(select 1 from public.ia_needs n where n.id=ia_applications.need_id and n.status='open' and (n.deadline is null or n.deadline>=current_date)));
create policy applications_update on public.ia_applications for update to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.ia_needs n join public.organisation_members m on m.organisation_id=n.organisation_id where n.id=ia_applications.need_id and m.user_id=(select auth.uid()))) with check(user_id=(select auth.uid()) or exists(select 1 from public.ia_needs n join public.organisation_members m on m.organisation_id=n.organisation_id where n.id=ia_applications.need_id and m.user_id=(select auth.uid())));
create policy invitations_read on public.ia_invitations for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.ia_needs n join public.organisation_members m on m.organisation_id=n.organisation_id where n.id=ia_invitations.need_id and m.user_id=(select auth.uid())));
create policy invitations_insert on public.ia_invitations for insert to authenticated with check(status='pending' and exists(select 1 from public.ia_needs n join public.organisation_members m on m.organisation_id=n.organisation_id where n.id=ia_invitations.need_id and n.status='open' and (n.deadline is null or n.deadline>=current_date) and m.user_id=(select auth.uid())) and exists(select 1 from public.ia_profiles p where p.user_id=ia_invitations.user_id and p.published));
create policy invitations_update on public.ia_invitations for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy hours_read on public.ia_hours for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.ia_needs n join public.organisation_members m on m.organisation_id=n.organisation_id where n.id=ia_hours.need_id and m.user_id=(select auth.uid())));
create policy hours_insert on public.ia_hours for insert to authenticated with check(user_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null and review_note='' and (exists(select 1 from public.ia_applications a where a.need_id=ia_hours.need_id and a.user_id=(select auth.uid()) and a.status='accepted') or exists(select 1 from public.ia_invitations i where i.need_id=ia_hours.need_id and i.user_id=(select auth.uid()) and i.status='accepted')));
create policy hours_update on public.ia_hours for update to authenticated using(user_id<>(select auth.uid()) and exists(select 1 from public.ia_needs n join public.organisation_members m on m.organisation_id=n.organisation_id where n.id=ia_hours.need_id and m.user_id=(select auth.uid()))) with check(user_id<>(select auth.uid()) and exists(select 1 from public.ia_needs n join public.organisation_members m on m.organisation_id=n.organisation_id where n.id=ia_hours.need_id and m.user_id=(select auth.uid())));
create policy saved_read on public.ia_saved for select to authenticated using(user_id=(select auth.uid()));
create policy saved_insert on public.ia_saved for insert to authenticated with check(user_id=(select auth.uid()));
create policy saved_delete on public.ia_saved for delete to authenticated using(user_id=(select auth.uid()));

create function public.ia_transition_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.status<>'pending' then raise exception 'This decision has already been recorded. Refresh to see its current status.'; end if;
 if tg_table_name='ia_applications' then
  if new.user_id=auth.uid() then
   if new.status<>'withdrawn' then raise exception 'Applicants may only withdraw their own application.'; end if;
  elsif new.status not in ('accepted','declined') then raise exception 'Choose accept or decline.'; end if;
 elsif tg_table_name='ia_invitations' then
  if new.status not in ('accepted','declined') then raise exception 'Choose accept or decline.'; end if;
 elsif tg_table_name='ia_hours' then
  if new.status not in ('approved','changes_requested') then raise exception 'Choose approve or request changes.'; end if;
  if new.status='changes_requested' and length(trim(new.review_note))<5 then raise exception 'Explain the changes needed.'; end if;
  new.reviewed_by=auth.uid(); new.reviewed_at=now();
 end if;
 return new;
end; $$;
revoke all on function public.ia_transition_guard() from public,anon,authenticated;
create trigger ia_application_transition before update on public.ia_applications for each row execute function public.ia_transition_guard();
create trigger ia_invitation_transition before update on public.ia_invitations for each row execute function public.ia_transition_guard();
create trigger ia_hours_transition before update on public.ia_hours for each row execute function public.ia_transition_guard();
