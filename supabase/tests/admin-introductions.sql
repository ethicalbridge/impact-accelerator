-- Rolled-back test for admin introductions. Leaves no data behind.
begin;
insert into auth.users(id, email, raw_user_meta_data) values
 ('e0000000-0000-4000-8000-000000000001', 't@test.invalid', '{}'),
 ('e0000000-0000-4000-8000-000000000002', 'o@test.invalid', '{}'),
 ('e0000000-0000-4000-8000-000000000003', 'a@test.invalid', '{}');
insert into public.admins(user_id) values ('e0000000-0000-4000-8000-000000000003');
insert into public.profiles(user_id, name, headline, languages, age_confirmed, unpaid_confirmed, published) values ('e0000000-0000-4000-8000-000000000001', 'Test Talent', 'Researcher', '{English}', true, true, true);
create temp table t3(k text primary key, v uuid); grant all on t3 to authenticated;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select public.admin_review_profile('e0000000-0000-4000-8000-000000000001','approved','');
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into t3 select 'org', public.create_organisation('Intro Group', 'Kenya', 'Nakuru', 'https://example.org', 'Community water', 'Community organisation', 'Org Owner', true);
reset role;
update public.organisations set status='approved' where id=(select v from t3 where k='org');
insert into public.needs(id, organisation_id, title, description, output, languages, hours, status, no_vulnerable_contact) values ('f0000000-0000-4000-8000-000000000001', (select v from t3 where k='org'), 'Data tools need', 'We need a clear data collection template.', 'A template', '{English}', 8, 'open', true);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin begin perform public.admin_introduce('f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','Hello, I think this person is a great fit for your need.'); raise exception 'FAIL non-admin introduced'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end; end $$;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select public.admin_introduce('f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','Amina has built two similar templates and can start next month.');
do $$ begin begin perform public.admin_introduce('f0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','Second introduction should be refused by the database.'); raise exception 'FAIL duplicate introduction'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end; end $$;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ declare i uuid; begin
  select id into i from public.invitations where user_id = auth.uid();
  if i is null then raise exception 'FAIL talent cannot see introduction'; end if;
  if public.respond_invitation(i, true) is null then raise exception 'FAIL no agreement created'; end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin if not exists (select 1 from public.notifications where kind='introduction') then raise exception 'FAIL org not told'; end if; end $$;
rollback;
select 'PASS: admin-only introductions, no duplicates, talent can accept, organisation notified' as result;
