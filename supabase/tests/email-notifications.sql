-- Rolled-back test for email settings and six-month follow-up reminders. Leaves no data behind.
begin;
insert into auth.users(id, email, raw_user_meta_data) values
 ('b0000000-0000-4000-8000-000000000001', 't@test.invalid', '{}'),
 ('b0000000-0000-4000-8000-000000000002', 'o@test.invalid', '{}');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.user_settings(email_notifications) values (false);
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin
  if exists (select 1 from public.user_settings) then raise exception 'FAIL email settings leaked'; end if;
  begin insert into public.user_settings(user_id, email_notifications) values ('b0000000-0000-4000-8000-000000000001', true); raise exception 'FAIL wrote another person''s settings'; exception when insufficient_privilege or check_violation then null; end;
end $$;
create temp table t2(k text primary key, v uuid);
grant all on t2 to authenticated;
insert into t2 select 'org', public.create_organisation('Follow Group', 'Kenya', 'Nakuru', 'https://example.org', 'Community water', 'Community organisation', 'Org Owner', true);
reset role;
insert into public.profiles(user_id, name) values ('b0000000-0000-4000-8000-000000000001', 'Test Talent');
update public.organisations set status = 'approved' where id = (select v from t2 where k='org');
insert into public.needs(id, organisation_id, title, description, output, languages, hours, status, no_vulnerable_contact) values ('c0000000-0000-4000-8000-000000000001', (select v from t2 where k='org'), 'Data tools need', 'We need a clear data collection template.', 'A template', '{English}', 8, 'closed', true);
insert into public.engagements(id, need_id, organisation_id, user_id, scope, status, completed_at, followup_due)
values ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', (select v from t2 where k='org'), 'b0000000-0000-4000-8000-000000000001', '{"need_title":"Data tools need"}', 'completed', now() - interval '7 months', current_date - 1);
do $$ begin
  if public.followup_reminders() <> 1 then raise exception 'FAIL expected one reminder'; end if;
  if public.followup_reminders() <> 0 then raise exception 'FAIL duplicate reminder'; end if;
  if exists (select 1 from public.notifications where kind='followup' and user_id='b0000000-0000-4000-8000-000000000001') then raise exception 'FAIL talent got org reminder'; end if;
end $$;
rollback;
select 'PASS: private email settings, one follow-up reminder per member, no duplicates' as result;
