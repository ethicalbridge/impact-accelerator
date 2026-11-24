-- 24 Nov 2026: one need, one professional. Every need has one place: choosing a professional closes it to new
-- applications and it shows as chosen, then in progress. Existing needs with 2 or 3 places move to 1; the funding
-- proposal review need that already has a signed contribution is closed (no pending applications or invitations on it).
-- Run as a Handova admin so the live-need edit guard allows the change.
select set_config('request.jwt.claims', json_build_object('sub', (select user_id from public.admins order by user_id limit 1), 'role', 'authenticated')::text, true);
update public.needs set places = 1 where places is distinct from 1;
update public.needs n set status = 'closed'
 where n.status = 'open' and exists (select 1 from public.engagements e where e.need_id = n.id and e.status in ('awaiting_signatures', 'active', 'completed'));
alter table public.needs alter column places set default 1;
alter table public.needs add constraint needs_one_professional check (places = 1);
