-- 27 Nov 2026: the admin review cards also show the reminders sent for each round (date, emailed or not), when the
-- next one goes out, whether reminders are off, and when Handova gets the "no reply" alert.
-- (Applied live as a full create or replace of admin_review_rounds(); the whole-day dates were set by the next migration.)
create or replace function public.admin_review_rounds()
 returns jsonb language plpgsql stable security definer set search_path to ''
as $$
declare out jsonb;
begin
  if not public.is_admin() then raise exception 'Only Handova admins can see this.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('target_type', r.target_type, 'target_id', r.target_id, 'asked_at', r.asked_at, 'note', r.note, 'resent_at', r.resent_at,
      'reminders_off', r.reminders_off, 'reminders', rem.list,
      'next_reminder', case when r.resent_at is not null or r.reminders_off or rem.n >= 3 then null
        else greatest(r.asked_at + interval '3 days' + rem.n * interval '4 days', coalesce(rem.last_at + interval '4 days', r.asked_at)) end,
      'alert_at', case when r.resent_at is null and not r.reminders_off and rem.n >= 3 then rem.last_at + interval '4 days' end,
      'changes', (select coalesce(jsonb_agg(jsonb_build_object('field', k, 'before', r.before -> k, 'after', cur.f -> k) order by k), '[]'::jsonb)
                  from jsonb_object_keys(r.before) k where (r.before -> k) is distinct from (cur.f -> k)))), '[]'::jsonb)
    into out
  from (select distinct on (x.target_type, x.target_id) x.* from public.review_rounds x order by x.target_type, x.target_id, x.asked_at desc) r
  cross join lateral (select public.review_fields(r.target_type, case r.target_type
      when 'organisation' then (select to_jsonb(o) from public.organisations o where o.id = r.target_id)
      when 'need' then (select to_jsonb(n) from public.needs n where n.id = r.target_id)
      else (select to_jsonb(p) from public.profiles p where p.user_id = r.target_id) end) f) cur
  cross join lateral (select count(*)::int n, max(s.at) last_at,
      coalesce(jsonb_agg(jsonb_build_object('at', s.at, 'emailed', s.emailed) order by s.at), '[]'::jsonb) list
    from (select date_trunc('minute', x.created_at) at, bool_or(x.emailed_at is not null) emailed from public.notifications x
          where x.kind = 'changes_reminder' and x.ref = r.target_id and x.created_at > r.asked_at group by 1) s) rem
  where not exists (select 1 from public.admin_actions a where a.target_id = r.target_id and a.created_at > coalesce(r.resent_at, r.asked_at)
    and a.action in ('org_approved', 'org_changes_requested', 'org_rejected', 'org_suspended', 'need_open', 'need_draft', 'need_closed', 'profile_approved', 'profile_changes_requested', 'profile_rejected'));
  return out;
end $$;
