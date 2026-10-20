-- Impact Accelerator · independent schema v1 (2026-09-30)
-- Principles: nothing public before approval; agreements created only by the server;
-- only the professional publishes their contribution; ratings never public; every state change goes through a checked function.

create extension if not exists pgcrypto;

-- ---------- helpers ----------
create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- ---------- profiles (professionals) ----------
create type public.review_status as enum ('draft', 'pending', 'approved', 'changes_requested', 'rejected');
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 120),
  headline text not null default '' check (length(headline) <= 160),
  bio text not null default '' check (length(bio) <= 4000),
  experience text not null default '' check (length(experience) <= 8000),
  location text not null default '' check (length(location) <= 160),
  country text not null default '' check (length(country) <= 100),
  skills text[] not null default '{}' check (cardinality(skills) <= 30),
  languages text[] not null default '{}' check (cardinality(languages) <= 20),
  hours_available integer not null default 0 check (hours_available between 0 and 160),
  arrangement text not null default 'Remote' check (arrangement in ('Remote', 'Hybrid', 'In person')),
  website text not null default '' check (website = '' or website ~ '^https?://'),
  age_confirmed boolean not null default false,
  unpaid_confirmed boolean not null default false,
  published boolean not null default false,
  review_status public.review_status not null default 'draft',
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not published or (age_confirmed and unpaid_confirmed))
);
alter table public.profiles enable row level security;

create function public.profile_is_public(uid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.user_id = uid and p.published and p.review_status = 'approved');
$$;

-- ---------- organisations ----------
create type public.org_status as enum ('pending', 'approved', 'changes_requested', 'rejected', 'suspended');
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  country text not null check (length(trim(country)) between 2 and 100),
  city text not null default '' check (length(city) <= 120),
  website text not null default '' check (website = '' or website ~ '^https?://'),
  summary text not null default '' check (length(summary) <= 600),
  org_type text not null default 'Community organisation' check (length(org_type) <= 80),
  locally_led_confirmed boolean not null check (locally_led_confirmed),
  status public.org_status not null default 'pending',
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.organisations enable row level security;

create table public.organisation_members (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  full_name text not null default '' check (length(full_name) <= 120),
  created_at timestamptz not null default now(),
  primary key (organisation_id, user_id)
);
create index organisation_members_user on public.organisation_members(user_id);
alter table public.organisation_members enable row level security;

create function public.is_org_member(org uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organisation_members m where m.organisation_id = org and m.user_id = auth.uid());
$$;
create function public.org_is_approved(org uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organisations o where o.id = org and o.status = 'approved');
$$;

-- ---------- needs ----------
create table public.needs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  title text not null check (length(trim(title)) between 5 and 160),
  description text not null check (length(trim(description)) between 20 and 6000),
  output text not null check (length(trim(output)) between 5 and 2000),
  skills text[] not null default '{}' check (cardinality(skills) <= 30),
  languages text[] not null default '{}' check (cardinality(languages) between 1 and 20),
  hours integer not null check (hours between 1 and 200),
  arrangement text not null default 'Remote' check (arrangement in ('Remote', 'Hybrid', 'In person')),
  location text not null default '' check (length(location) <= 160),
  country text not null default '' check (length(country) <= 100),
  deadline date,
  places integer not null default 1 check (places between 1 and 5),
  no_vulnerable_contact boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'draft' or no_vulnerable_contact)
);
create index needs_org on public.needs(organisation_id);
alter table public.needs enable row level security;

create function public.need_org(n uuid) returns uuid language sql stable security definer set search_path = '' as $$
  select organisation_id from public.needs where id = n;
$$;

-- ---------- applications and invitations ----------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.needs(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  message text not null check (length(trim(message)) between 30 and 4000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (need_id, user_id)
);
create index applications_user on public.applications(user_id);
alter table public.applications enable row level security;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.needs(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  invited_by uuid default auth.uid() references auth.users(id) on delete set null,
  message text not null check (length(trim(message)) between 30 and 4000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (need_id, user_id)
);
create index invitations_user on public.invitations(user_id);
alter table public.invitations enable row level security;

-- ---------- conversations and messages ----------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.needs(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_reason text not null default '',
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (need_id, user_id)
);
alter table public.conversations enable row level security;
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_conv on public.messages(conversation_id, created_at);
alter table public.messages enable row level security;

create function public.is_conversation_party(c uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversations v where v.id = c and (v.user_id = auth.uid() or public.is_org_member(public.need_org(v.need_id))));
$$;

-- ---------- engagements (agreement + completion) ----------
create table public.engagements (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.needs(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid references public.profiles(user_id) on delete set null,
  terms_version text not null default '2026-10-v1',
  scope jsonb not null,
  talent_signed_name text not null default '',
  talent_signed_at timestamptz,
  org_signed_name text not null default '',
  org_signed_by uuid references auth.users(id) on delete set null,
  org_signed_at timestamptz,
  status text not null default 'awaiting_signatures' check (status in ('awaiting_signatures', 'active', 'completed', 'ended')),
  deliverables text not null default '' check (length(deliverables) <= 3000),
  endorsement text not null default '' check (length(endorsement) <= 3000),
  endorsed_by_role text not null default '' check (length(endorsed_by_role) <= 120),
  rating smallint check (rating between 1 and 5),
  completed_at timestamptz,
  public boolean not null default false,
  published_at timestamptz,
  followup_due date,
  followup_in_use boolean,
  followup_note text not null default '' check (length(followup_note) <= 1000),
  followup_answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (need_id, user_id)
);
create index engagements_org on public.engagements(organisation_id);
create index engagements_user on public.engagements(user_id);
alter table public.engagements enable row level security;

-- ---------- hours ----------
create table public.hours (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  user_id uuid references public.profiles(user_id) on delete set null,
  work_date date not null check (work_date <= current_date),
  hours numeric(4,2) not null check (hours > 0 and hours <= 12),
  description text not null check (length(trim(description)) between 10 and 2000),
  evidence text not null default '' check (evidence = '' or evidence ~ '^https://'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested')),
  review_note text not null default '' check (length(review_note) <= 2000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index hours_eng on public.hours(engagement_id);
alter table public.hours enable row level security;

-- ---------- reports, saved, notifications ----------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('profile', 'need', 'organisation', 'conversation', 'other')),
  target_id uuid,
  reason text not null check (reason in ('safety', 'harassment', 'misleading', 'privacy', 'spam', 'other')),
  details text not null check (length(trim(details)) between 10 and 4000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved')),
  admin_note text not null default '' check (length(admin_note) <= 2000),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;

create table public.saved_needs (
  user_id uuid not null references auth.users(id) on delete cascade,
  need_id uuid not null references public.needs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, need_id)
);
alter table public.saved_needs enable row level security;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  link text not null default '',
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;

create function public.notify(uid uuid, k text, t text, b text, l text) returns void language sql security definer set search_path = '' as $$
  insert into public.notifications(user_id, kind, title, body, link) select uid, k, t, b, l where uid is not null;
$$;
create function public.notify_org(org uuid, k text, t text, b text, l text) returns void language sql security definer set search_path = '' as $$
  insert into public.notifications(user_id, kind, title, body, link) select m.user_id, k, t, b, l from public.organisation_members m where m.organisation_id = org;
$$;
create function public.notify_admins(k text, t text, b text, l text) returns void language sql security definer set search_path = '' as $$
  insert into public.notifications(user_id, kind, title, body, link) select a.user_id, k, t, b, l from public.admins a;
$$;

-- ---------- privileges ----------
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.organisations, public.needs to anon, authenticated;
grant insert (user_id, name, headline, bio, experience, location, country, skills, languages, hours_available, arrangement, website, age_confirmed, unpaid_confirmed, published) on public.profiles to authenticated;
grant update (name, headline, bio, experience, location, country, skills, languages, hours_available, arrangement, website, age_confirmed, unpaid_confirmed, published) on public.profiles to authenticated;
grant update (name, country, city, website, summary, org_type) on public.organisations to authenticated;
grant select on public.organisation_members to authenticated;
grant insert (organisation_id, title, description, output, skills, languages, hours, arrangement, location, country, deadline, places, no_vulnerable_contact, status) on public.needs to authenticated;
grant update (title, description, output, skills, languages, hours, arrangement, location, country, deadline, places, no_vulnerable_contact, status) on public.needs to authenticated;
grant select on public.applications, public.invitations, public.conversations, public.messages, public.engagements, public.hours, public.reports, public.saved_needs, public.notifications to authenticated;
grant insert (need_id, user_id, message) on public.applications to authenticated;
grant insert (need_id, user_id, message) on public.invitations to authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;
grant insert (engagement_id, user_id, work_date, hours, description, evidence) on public.hours to authenticated;
grant insert (target_type, target_id, reason, details) on public.reports to authenticated;
grant insert, delete on public.saved_needs to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ---------- row policies ----------
create policy profiles_read on public.profiles for select using ((published and review_status = 'approved') or user_id = (select auth.uid()) or public.is_admin()
  or exists (select 1 from public.applications a join public.needs n on n.id = a.need_id where a.user_id = profiles.user_id and public.is_org_member(n.organisation_id))
  or exists (select 1 from public.engagements e where e.user_id = profiles.user_id and public.is_org_member(e.organisation_id)));
create policy profiles_insert on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy organisations_read on public.organisations for select using (status = 'approved' or public.is_org_member(id) or public.is_admin());
create policy organisations_update on public.organisations for update to authenticated using (public.is_org_member(id)) with check (public.is_org_member(id));
create policy members_read on public.organisation_members for select to authenticated using (user_id = (select auth.uid()) or public.is_org_member(organisation_id) or public.is_admin());

create policy needs_read on public.needs for select using ((status <> 'draft' and public.org_is_approved(organisation_id)) or public.is_org_member(organisation_id) or public.is_admin());
create policy needs_insert on public.needs for insert to authenticated with check (public.is_org_member(organisation_id) and (status = 'draft' or public.org_is_approved(organisation_id)));
create policy needs_update on public.needs for update to authenticated using (public.is_org_member(organisation_id)) with check (public.is_org_member(organisation_id) and (status = 'draft' or public.org_is_approved(organisation_id)));

create policy applications_read on public.applications for select to authenticated using (user_id = (select auth.uid()) or public.is_org_member(public.need_org(need_id)) or public.is_admin());
create policy applications_insert on public.applications for insert to authenticated with check (user_id = (select auth.uid()) and public.profile_is_public(user_id)
  and exists (select 1 from public.needs n where n.id = need_id and n.status = 'open' and (n.deadline is null or n.deadline >= current_date) and public.org_is_approved(n.organisation_id) and not public.is_org_member(n.organisation_id)));

create policy invitations_read on public.invitations for select to authenticated using (user_id = (select auth.uid()) or public.is_org_member(public.need_org(need_id)) or public.is_admin());
create policy invitations_insert on public.invitations for insert to authenticated with check (public.profile_is_public(user_id) and user_id <> (select auth.uid())
  and exists (select 1 from public.needs n where n.id = need_id and n.status = 'open' and (n.deadline is null or n.deadline >= current_date) and public.org_is_approved(n.organisation_id) and public.is_org_member(n.organisation_id)));

create policy conversations_read on public.conversations for select to authenticated using (public.is_conversation_party(id)
  or (public.is_admin() and exists (select 1 from public.reports r where r.target_type = 'conversation' and r.target_id = conversations.id)));
create policy messages_read on public.messages for select to authenticated using (public.is_conversation_party(conversation_id)
  or (public.is_admin() and exists (select 1 from public.reports r where r.target_type = 'conversation' and r.target_id = messages.conversation_id)));
create policy messages_insert on public.messages for insert to authenticated with check (sender_id = (select auth.uid()) and public.is_conversation_party(conversation_id)
  and exists (select 1 from public.conversations v where v.id = conversation_id and v.status = 'open'));

create policy engagements_read on public.engagements for select to authenticated using (user_id = (select auth.uid()) or public.is_org_member(organisation_id) or public.is_admin());
create policy hours_read on public.hours for select to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.engagements e where e.id = engagement_id and public.is_org_member(e.organisation_id)) or public.is_admin());
create policy hours_insert on public.hours for insert to authenticated with check (user_id = (select auth.uid())
  and exists (select 1 from public.engagements e where e.id = engagement_id and e.user_id = (select auth.uid()) and e.status = 'active'));

create policy reports_read on public.reports for select to authenticated using (reporter_id = (select auth.uid()) or public.is_admin());
create policy reports_insert on public.reports for insert to authenticated with check (true);
create policy saved_all on public.saved_needs for select to authenticated using (user_id = (select auth.uid()));
create policy saved_insert on public.saved_needs for insert to authenticated with check (user_id = (select auth.uid()));
create policy saved_delete on public.saved_needs for delete to authenticated using (user_id = (select auth.uid()));
create policy notifications_read on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- triggers ----------
create function public.touch() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch();
create trigger needs_touch before update on public.needs for each row execute function public.touch();

-- publishing a profile for the first time sends it to review
create function public.profile_review_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then new.review_status = case when new.published then 'pending'::public.review_status else 'draft' end; new.approved_at = null;
  elsif new.published and not old.published and old.review_status in ('draft', 'changes_requested') then new.review_status = 'pending';
  end if;
  if new.review_status = 'pending' and (tg_op = 'INSERT' or old.review_status <> 'pending') then
    perform public.notify_admins('profile_review', 'Profile to review', new.name, '#admin');
  end if;
  return new;
end $$;
create trigger profiles_review before insert or update on public.profiles for each row execute function public.profile_review_guard();

-- need rules: limit 3 open, org cannot move needs, no return to draft
create function public.need_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.organisation_id <> old.organisation_id then raise exception 'A need cannot move to another organisation.'; end if;
    if old.status <> 'draft' and new.status = 'draft' then raise exception 'Close a published need instead of returning it to draft.'; end if;
  end if;
  if new.status = 'open' and (tg_op = 'INSERT' or old.status <> 'open') then
    if (select count(*) from public.needs n where n.organisation_id = new.organisation_id and n.status = 'open' and n.id <> new.id) >= 3 then
      raise exception 'An organisation can have up to 3 open needs at a time. Close one first.';
    end if;
    if new.deadline is not null and new.deadline < current_date then raise exception 'Choose a deadline in the future.'; end if;
  end if;
  return new;
end $$;
create trigger needs_guard before insert or update on public.needs for each row execute function public.need_guard();

-- a conversation opens with every application or invitation
create function public.open_conversation() returns trigger language plpgsql security definer set search_path = '' as $$
declare t text; org uuid;
begin
  insert into public.conversations(need_id, user_id) values (new.need_id, new.user_id) on conflict (need_id, user_id) do update set status = 'open', closed_reason = '', closed_at = null;
  select n.title, n.organisation_id into t, org from public.needs n where n.id = new.need_id;
  if tg_table_name = 'applications' then
    perform public.notify_org(org, 'application', 'New application', t, '#org');
  else
    perform public.notify(new.user_id, 'invitation', 'You have been invited to a need', t, '#workspace');
  end if;
  return new;
end $$;
create trigger applications_conversation after insert on public.applications for each row execute function public.open_conversation();
create trigger invitations_conversation after insert on public.invitations for each row execute function public.open_conversation();

-- ---------- functions (the only way to change state) ----------
create function public.create_organisation(p_name text, p_country text, p_city text, p_website text, p_summary text, p_org_type text, p_full_name text, p_locally_led boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if not coalesce(p_locally_led, false) then raise exception 'Impact Accelerator is for locally led organisations.'; end if;
  if (select count(*) from public.organisation_members m where m.user_id = auth.uid()) >= 3 then raise exception 'You can manage up to three organisations.'; end if;
  insert into public.organisations(name, country, city, website, summary, org_type, locally_led_confirmed)
  values (trim(p_name), trim(p_country), trim(coalesce(p_city, '')), trim(coalesce(p_website, '')), trim(coalesce(p_summary, '')), coalesce(nullif(trim(p_org_type), ''), 'Community organisation'), true)
  returning id into v;
  insert into public.organisation_members(organisation_id, user_id, role, full_name) values (v, auth.uid(), 'owner', trim(coalesce(p_full_name, '')));
  perform public.notify_admins('org_review', 'Organisation to review', trim(p_name), '#admin');
  return v;
end $$;

create function public.admin_review_organisation(p_org uuid, p_decision public.org_status, p_note text) returns void language plpgsql security definer set search_path = '' as $$
declare n text;
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  update public.organisations set status = p_decision, approved_at = case when p_decision = 'approved' then coalesce(approved_at, now()) else approved_at end where id = p_org returning name into n;
  if n is null then raise exception 'Organisation not found.'; end if;
  perform public.notify_org(p_org, 'org_decision',
    case p_decision when 'approved' then 'Your organisation is approved' when 'changes_requested' then 'Please update your organisation details' when 'rejected' then 'Your organisation was not approved' else 'Your organisation status changed' end,
    coalesce(p_note, ''), '#org');
end $$;

create function public.admin_review_profile(p_user uuid, p_decision public.review_status, p_note text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  if p_decision not in ('approved', 'changes_requested', 'rejected') then raise exception 'Choose approve, request changes or reject.'; end if;
  update public.profiles set review_status = p_decision, approved_at = case when p_decision = 'approved' then coalesce(approved_at, now()) else approved_at end where user_id = p_user;
  if not found then raise exception 'Profile not found.'; end if;
  perform public.notify(p_user, 'profile_decision',
    case p_decision when 'approved' then 'Your profile is approved and public' when 'changes_requested' then 'Please update your profile' else 'Your profile was not approved' end,
    coalesce(p_note, ''), '#workspace');
end $$;

create function public.create_engagement(p_need uuid, p_user uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid; n record; filled integer;
begin
  select * into n from public.needs where id = p_need for update;
  if n.status <> 'open' then raise exception 'This need is no longer open.'; end if;
  select count(*) into filled from public.engagements e where e.need_id = p_need and e.status <> 'ended';
  if filled >= n.places then raise exception 'All places on this need are already filled.'; end if;
  insert into public.engagements(need_id, organisation_id, user_id, scope)
  select n.id, n.organisation_id, p.user_id, jsonb_build_object('need_title', n.title, 'description', n.description, 'output', n.output, 'skills', n.skills,
    'languages', n.languages, 'hours', n.hours, 'arrangement', n.arrangement, 'location', n.location, 'country', n.country,
    'organisation', o.name, 'organisation_country', o.country, 'talent', p.name)
  from public.profiles p, public.organisations o where p.user_id = p_user and o.id = n.organisation_id
  returning id into v;
  if filled + 1 >= n.places then update public.needs set status = 'closed' where id = p_need; end if;
  perform public.notify(p_user, 'agreement', 'Sign your contribution agreement', n.title, '#agreement/' || v);
  perform public.notify_org(n.organisation_id, 'agreement', 'Sign your contribution agreement', n.title, '#agreement/' || v);
  return v;
end $$;
revoke all on function public.create_engagement(uuid, uuid) from public, anon, authenticated;

create function public.decide_application(p_id uuid, p_accept boolean) returns uuid language plpgsql security definer set search_path = '' as $$
declare a record; v uuid;
begin
  select * into a from public.applications where id = p_id for update;
  if a.id is null or not public.is_org_member(public.need_org(a.need_id)) then raise exception 'You cannot decide on this application.'; end if;
  if a.status <> 'pending' then raise exception 'This application has already been decided.'; end if;
  update public.applications set status = case when p_accept then 'accepted' else 'declined' end, decided_at = now() where id = p_id;
  if p_accept then
    v := public.create_engagement(a.need_id, a.user_id);
  else
    update public.conversations set status = 'closed', closed_reason = 'Application not selected', closed_at = now() where need_id = a.need_id and user_id = a.user_id;
    perform public.notify(a.user_id, 'application_decision', 'Your application was not selected', (select title from public.needs where id = a.need_id), '#workspace');
  end if;
  return v;
end $$;

create function public.withdraw_application(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  select * into a from public.applications where id = p_id and user_id = auth.uid() for update;
  if a.id is null then raise exception 'Application not found.'; end if;
  if a.status <> 'pending' then raise exception 'Only a pending application can be withdrawn.'; end if;
  update public.applications set status = 'withdrawn', decided_at = now() where id = p_id;
  update public.conversations set status = 'closed', closed_reason = 'Application withdrawn', closed_at = now() where need_id = a.need_id and user_id = a.user_id;
  perform public.notify_org(public.need_org(a.need_id), 'application_withdrawn', 'An application was withdrawn', (select title from public.needs where id = a.need_id), '#org');
end $$;

create function public.respond_invitation(p_id uuid, p_accept boolean) returns uuid language plpgsql security definer set search_path = '' as $$
declare i record; v uuid;
begin
  select * into i from public.invitations where id = p_id and user_id = auth.uid() for update;
  if i.id is null then raise exception 'Invitation not found.'; end if;
  if i.status <> 'pending' then raise exception 'You have already responded.'; end if;
  update public.invitations set status = case when p_accept then 'accepted' else 'declined' end, decided_at = now() where id = p_id;
  if p_accept then v := public.create_engagement(i.need_id, i.user_id);
  else
    update public.conversations set status = 'closed', closed_reason = 'Invitation declined', closed_at = now() where need_id = i.need_id and user_id = i.user_id;
    perform public.notify_org(public.need_org(i.need_id), 'invitation_declined', 'An invitation was declined', (select title from public.needs where id = i.need_id), '#org');
  end if;
  return v;
end $$;

create function public.sign_engagement(p_id uuid, p_name text) returns text language plpgsql security definer set search_path = '' as $$
declare e record; s text;
begin
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Type your full name to sign.'; end if;
  select * into e from public.engagements where id = p_id for update;
  if e.id is null then raise exception 'Agreement not found.'; end if;
  if e.status <> 'awaiting_signatures' then raise exception 'This agreement is no longer awaiting signatures.'; end if;
  if e.user_id = auth.uid() then
    if e.talent_signed_at is not null then raise exception 'You have already signed.'; end if;
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
end $$;

create function public.review_hours(p_id uuid, p_approve boolean, p_note text) returns void language plpgsql security definer set search_path = '' as $$
declare h record; e record;
begin
  select * into h from public.hours where id = p_id for update;
  select * into e from public.engagements where id = h.engagement_id;
  if h.id is null or not public.is_org_member(e.organisation_id) or h.user_id = auth.uid() then raise exception 'You cannot review this entry.'; end if;
  if h.status <> 'pending' then raise exception 'This entry has already been reviewed.'; end if;
  if not p_approve and length(trim(coalesce(p_note, ''))) < 5 then raise exception 'Explain what needs to change.'; end if;
  update public.hours set status = case when p_approve then 'approved' else 'changes_requested' end, review_note = trim(coalesce(p_note, '')), reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
  perform public.notify(h.user_id, 'hours_review', case when p_approve then 'Hours approved' else 'Changes requested on your hours' end, e.scope->>'need_title', '#workspace');
end $$;

create function public.complete_engagement(p_id uuid, p_deliverables text, p_endorsement text, p_role text, p_rating smallint) returns void language plpgsql security definer set search_path = '' as $$
declare e record;
begin
  select * into e from public.engagements where id = p_id for update;
  if e.id is null or not public.is_org_member(e.organisation_id) then raise exception 'You cannot complete this engagement.'; end if;
  if e.status <> 'active' then raise exception 'Only an active engagement can be completed.'; end if;
  if length(trim(coalesce(p_deliverables, ''))) < 10 then raise exception 'Describe what was delivered.'; end if;
  if length(trim(coalesce(p_endorsement, ''))) < 20 then raise exception 'Write an endorsement of at least 20 characters.'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'Choose a private rating from 1 to 5.'; end if;
  if exists (select 1 from public.hours h where h.engagement_id = p_id and h.status = 'pending') then raise exception 'Review all pending hours first.'; end if;
  update public.engagements set status = 'completed', completed_at = now(), followup_due = (now() + interval '6 months')::date,
    deliverables = trim(p_deliverables), endorsement = trim(p_endorsement), endorsed_by_role = trim(coalesce(p_role, '')), rating = p_rating where id = p_id;
  update public.conversations set status = 'closed', closed_reason = 'Engagement completed', closed_at = now() where need_id = e.need_id and user_id = e.user_id;
  perform public.notify(e.user_id, 'completed', 'Your contribution is complete and endorsed', e.scope->>'need_title', '#workspace');
end $$;

create function public.end_engagement(p_id uuid, p_reason text) returns void language plpgsql security definer set search_path = '' as $$
declare e record;
begin
  select * into e from public.engagements where id = p_id for update;
  if e.id is null or not (e.user_id = auth.uid() or public.is_org_member(e.organisation_id)) then raise exception 'You are not a party to this engagement.'; end if;
  if e.status not in ('awaiting_signatures', 'active') then raise exception 'This engagement has already finished.'; end if;
  update public.engagements set status = 'ended' where id = p_id;
  update public.conversations set status = 'closed', closed_reason = 'Engagement ended', closed_at = now() where need_id = e.need_id and user_id = e.user_id;
  perform public.notify(e.user_id, 'ended', 'An engagement was ended', e.scope->>'need_title', '#workspace');
  perform public.notify_org(e.organisation_id, 'ended', 'An engagement was ended', e.scope->>'need_title', '#org');
end $$;

create function public.set_contribution_visibility(p_id uuid, p_public boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.engagements set public = p_public, published_at = case when p_public then coalesce(published_at, now()) else null end
  where id = p_id and user_id = auth.uid() and status = 'completed';
  if not found then raise exception 'Only your own completed contributions can be published.'; end if;
end $$;

create function public.answer_followup(p_id uuid, p_in_use boolean, p_note text) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.engagements set followup_in_use = p_in_use, followup_note = trim(coalesce(p_note, '')), followup_answered_at = now()
  where id = p_id and public.is_org_member(organisation_id) and status = 'completed' and followup_due <= current_date;
  if not found then raise exception 'This follow-up is not available yet.'; end if;
end $$;

create function public.close_conversation(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_conversation_party(p_id) then raise exception 'You are not part of this conversation.'; end if;
  update public.conversations set status = 'closed', closed_reason = 'Ended by a participant', closed_at = now() where id = p_id;
end $$;

create function public.admin_update_report(p_id uuid, p_status text, p_note text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required.'; end if;
  update public.reports set status = p_status, admin_note = coalesce(p_note, ''), resolved_at = case when p_status = 'resolved' then now() else null end where id = p_id;
end $$;

create function public.report_notify() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.reporter_id = auth.uid();
  perform public.notify_admins('report', 'New concern reported', new.reason || ' · ' || new.target_type, '#admin');
  return new;
end $$;
create trigger reports_notify before insert on public.reports for each row execute function public.report_notify();

create function public.message_notify() returns trigger language plpgsql security definer set search_path = '' as $$
declare v record;
begin
  select c.*, n.title, n.organisation_id into v from public.conversations c join public.needs n on n.id = c.need_id where c.id = new.conversation_id;
  if new.sender_id = v.user_id then perform public.notify_org(v.organisation_id, 'message', 'New message', v.title, '#conversation/' || new.conversation_id);
  else perform public.notify(v.user_id, 'message', 'New message', v.title, '#conversation/' || new.conversation_id); end if;
  return new;
end $$;
create trigger messages_notify after insert on public.messages for each row execute function public.message_notify();

create function public.hours_notify() returns trigger language plpgsql security definer set search_path = '' as $$
declare e record;
begin
  select * into e from public.engagements where id = new.engagement_id;
  if (select coalesce(sum(h.hours), 0) from public.hours h where h.user_id = new.user_id and h.work_date = new.work_date and h.status <> 'changes_requested') + new.hours > 12 then
    raise exception 'You can log up to 12 hours in one day.';
  end if;
  perform public.notify_org(e.organisation_id, 'hours', 'Hours to review', e.scope->>'need_title', '#org');
  return new;
end $$;
create trigger hours_check before insert on public.hours for each row execute function public.hours_notify();

-- public, safe view of completed contributions on an impact CV (no ratings, no signatures)
create function public.public_contributions(p_user uuid) returns table (id uuid, need_title text, organisation text, organisation_country text, need text, output text, skills text[],
  deliverables text, endorsement text, endorsed_by_role text, hours numeric, started date, completed date, still_in_use boolean)
language sql stable security definer set search_path = '' as $$
  select e.id, e.scope->>'need_title', e.scope->>'organisation', e.scope->>'organisation_country', e.scope->>'description', e.scope->>'output',
    array(select jsonb_array_elements_text(e.scope->'skills')), e.deliverables, e.endorsement, e.endorsed_by_role,
    coalesce((select sum(h.hours) from public.hours h where h.engagement_id = e.id and h.status = 'approved'), 0),
    e.created_at::date, e.completed_at::date, e.followup_in_use
  from public.engagements e
  where e.user_id = p_user and e.status = 'completed' and ((e.public and public.profile_is_public(p_user)) or e.user_id = auth.uid())
  order by e.completed_at desc;
$$;

-- delete my account: removes the person and their personal data; organisations keep an anonymised record of completed work
create function public.delete_my_account() returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  update public.engagements set scope = jsonb_set(scope, '{talent}', '"Former member"'), talent_signed_name = case when talent_signed_name <> '' then 'Former member' else '' end, public = false where user_id = uid;
  delete from public.messages where sender_id = uid;
  update public.organisations o set status = 'suspended' where exists (select 1 from public.organisation_members m where m.organisation_id = o.id and m.user_id = uid)
    and not exists (select 1 from public.organisation_members m where m.organisation_id = o.id and m.user_id <> uid);
  delete from auth.users where id = uid;
end $$;

-- execute permissions
revoke all on function public.notify(uuid, text, text, text, text), public.notify_org(uuid, text, text, text, text), public.notify_admins(text, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_review_organisation(uuid, public.org_status, text), public.admin_review_profile(uuid, public.review_status, text), public.admin_update_report(uuid, text, text),
  public.create_organisation(text, text, text, text, text, text, text, boolean), public.decide_application(uuid, boolean), public.withdraw_application(uuid), public.respond_invitation(uuid, boolean),
  public.sign_engagement(uuid, text), public.review_hours(uuid, boolean, text), public.complete_engagement(uuid, text, text, text, smallint), public.end_engagement(uuid, text),
  public.set_contribution_visibility(uuid, boolean), public.answer_followup(uuid, boolean, text), public.close_conversation(uuid), public.delete_my_account() from public, anon;
grant execute on function public.admin_review_organisation(uuid, public.org_status, text), public.admin_review_profile(uuid, public.review_status, text), public.admin_update_report(uuid, text, text),
  public.create_organisation(text, text, text, text, text, text, text, boolean), public.decide_application(uuid, boolean), public.withdraw_application(uuid), public.respond_invitation(uuid, boolean),
  public.sign_engagement(uuid, text), public.review_hours(uuid, boolean, text), public.complete_engagement(uuid, text, text, text, smallint), public.end_engagement(uuid, text),
  public.set_contribution_visibility(uuid, boolean), public.answer_followup(uuid, boolean, text), public.close_conversation(uuid), public.delete_my_account() to authenticated;
revoke all on function public.touch(), public.profile_review_guard(), public.need_guard(), public.open_conversation(), public.report_notify(), public.message_notify(), public.hours_notify() from public, anon, authenticated;
grant execute on function public.public_contributions(uuid), public.is_admin(), public.is_org_member(uuid), public.org_is_approved(uuid), public.profile_is_public(uuid), public.need_org(uuid), public.is_conversation_party(uuid) to anon, authenticated;
