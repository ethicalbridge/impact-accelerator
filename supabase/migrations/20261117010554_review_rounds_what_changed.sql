-- 17 Nov 2026: when Handova asks an organisation, a need or a profile for changes, keep what was asked and a snapshot
-- of the details at that moment; when they send it back, note when. The admin review cards then show what was asked,
-- when it came back, and each field that changed (before and after). Admins only.
create table if not exists public.review_rounds (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('organisation', 'need', 'profile')),
  target_id uuid not null,
  asked_at timestamptz not null default now(),
  note text,
  before jsonb not null default '{}'::jsonb,
  resent_at timestamptz
);
create index if not exists review_rounds_target on public.review_rounds (target_type, target_id, asked_at desc);
alter table public.review_rounds enable row level security;
create policy review_rounds_admin_read on public.review_rounds for select to authenticated using (public.is_admin());
revoke all on public.review_rounds from anon, authenticated;
grant select on public.review_rounds to authenticated;

-- The details someone can change and Handova reviews, per kind.
create or replace function public.review_fields(p_type text, p_row jsonb)
 returns jsonb language sql immutable set search_path to ''
as $$
  select coalesce(jsonb_object_agg(k, p_row -> k), '{}'::jsonb) from unnest(case p_type
    when 'organisation' then array['name', 'country', 'city', 'website', 'summary', 'org_type', 'staff_size', 'locally_led_confirmed', 'ethical_bridge_url', 'logo_url']
    when 'need' then array['title', 'description', 'output', 'skills', 'languages', 'hours', 'places', 'deadline', 'arrangement', 'location', 'country', 'no_vulnerable_contact', 'safeguarding']
    else array['name', 'headline', 'bio', 'experience', 'experience_level', 'location', 'country', 'skills', 'languages', 'hours_available', 'arrangement', 'website', 'linkedin', 'photo_url', 'experience_items', 'education_items', 'study_label'] end) k
$$;

-- Opens a round when an admin asks for changes (the admin action is written in the same transaction as the decision).
create or replace function public.review_round_open()
 returns trigger language plpgsql security definer set search_path to ''
as $$
declare t text; r jsonb; note text := nullif(trim(coalesce(new.detail ->> 'note', '')), '');
begin
  if new.action = 'org_changes_requested' then t := 'organisation'; select to_jsonb(o) into r from public.organisations o where o.id = new.target_id;
  elsif new.action = 'need_draft' then t := 'need'; select to_jsonb(n) into r from public.needs n where n.id = new.target_id;
  elsif new.action = 'profile_changes_requested' then t := 'profile'; select to_jsonb(p) into r from public.profiles p where p.user_id = new.target_id;
    -- The profile decision does not log its note; it is the message the person was sent.
    if note is null then
      select x.body into note from public.notifications x where x.user_id = new.target_id and x.kind = 'profile_decision' and x.created_at >= now() - interval '1 minute' order by x.created_at desc limit 1;
    end if;
  else return new; end if;
  if r is null then return new; end if;
  insert into public.review_rounds (target_type, target_id, asked_at, note, before) values (t, new.target_id, new.created_at, note, public.review_fields(t, r));
  return new;
end $$;
create trigger admin_actions_review_round after insert on public.admin_actions for each row execute function public.review_round_open();

-- Marks the round as sent back when they send it for review again.
create or replace function public.review_round_resent()
 returns trigger language plpgsql security definer set search_path to ''
as $$
declare t text := tg_argv[0]; o jsonb := to_jsonb(old); n jsonb := to_jsonb(new);
begin
  if (t = 'organisation' and o ->> 'status' = 'changes_requested' and n ->> 'status' = 'pending')
    or (t = 'need' and o ->> 'status' = 'draft' and n ->> 'status' = 'pending')
    or (t = 'profile' and o ->> 'review_status' = 'changes_requested' and n ->> 'review_status' = 'pending') then
    update public.review_rounds set resent_at = now()
      where target_type = t and target_id = (case t when 'profile' then n ->> 'user_id' else n ->> 'id' end)::uuid and resent_at is null;
  end if;
  return new;
end $$;
create trigger organisations_review_round_resent after update on public.organisations for each row execute function public.review_round_resent('organisation');
create trigger needs_review_round_resent after update on public.needs for each row execute function public.review_round_resent('need');
create trigger profiles_review_round_resent after update on public.profiles for each row execute function public.review_round_resent('profile');

-- For the admin review cards: the latest round per item that Handova has not decided on since, with what changed.
create or replace function public.admin_review_rounds()
 returns jsonb language plpgsql stable security definer set search_path to ''
as $$
declare out jsonb;
begin
  if not public.is_admin() then raise exception 'Only Handova admins can see this.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('target_type', r.target_type, 'target_id', r.target_id, 'asked_at', r.asked_at, 'note', r.note, 'resent_at', r.resent_at,
      'changes', (select coalesce(jsonb_agg(jsonb_build_object('field', k, 'before', r.before -> k, 'after', cur.f -> k) order by k), '[]'::jsonb)
                  from jsonb_object_keys(r.before) k where (r.before -> k) is distinct from (cur.f -> k)))), '[]'::jsonb)
    into out
  from (select distinct on (x.target_type, x.target_id) x.* from public.review_rounds x order by x.target_type, x.target_id, x.asked_at desc) r
  cross join lateral (select public.review_fields(r.target_type, case r.target_type
      when 'organisation' then (select to_jsonb(o) from public.organisations o where o.id = r.target_id)
      when 'need' then (select to_jsonb(n) from public.needs n where n.id = r.target_id)
      else (select to_jsonb(p) from public.profiles p where p.user_id = r.target_id) end) f) cur
  where not exists (select 1 from public.admin_actions a where a.target_id = r.target_id and a.created_at > coalesce(r.resent_at, r.asked_at)
    and a.action in ('org_approved', 'org_changes_requested', 'org_rejected', 'org_suspended', 'need_open', 'need_draft', 'need_closed', 'profile_approved', 'profile_changes_requested', 'profile_rejected'));
  return out;
end $$;
revoke all on function public.admin_review_rounds() from public, anon;
grant execute on function public.admin_review_rounds() to authenticated;

-- The rounds still open today (asked before this existed): the details have not changed since, so today's values are the snapshot.
insert into public.review_rounds (target_type, target_id, asked_at, note, before)
select distinct on (a.target_id) case a.action when 'org_changes_requested' then 'organisation' when 'need_draft' then 'need' else 'profile' end, a.target_id, a.created_at,
  coalesce(nullif(trim(coalesce(a.detail ->> 'note', '')), ''), (select x.body from public.notifications x where x.user_id = a.target_id and x.kind = 'profile_decision' and x.created_at between a.created_at - interval '1 minute' and a.created_at + interval '1 minute' order by x.created_at desc limit 1)),
  case a.action
    when 'org_changes_requested' then public.review_fields('organisation', (select to_jsonb(o) from public.organisations o where o.id = a.target_id))
    when 'need_draft' then public.review_fields('need', (select to_jsonb(n) from public.needs n where n.id = a.target_id))
    else public.review_fields('profile', (select to_jsonb(p) from public.profiles p where p.user_id = a.target_id)) end
from public.admin_actions a
where (a.action = 'org_changes_requested' and exists (select 1 from public.organisations o where o.id = a.target_id and o.status = 'changes_requested'))
   or (a.action = 'need_draft' and exists (select 1 from public.needs n where n.id = a.target_id and n.status = 'draft'))
   or (a.action = 'profile_changes_requested' and exists (select 1 from public.profiles p where p.user_id = a.target_id and p.review_status = 'changes_requested'))
order by a.target_id, a.created_at desc;
