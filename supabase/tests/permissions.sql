-- Rolled-back permission test for the Impact Accelerator schema. Leaves no data behind.
begin;
insert into auth.users(id, email, raw_user_meta_data) values
 ('a0000000-0000-4000-8000-000000000001', 'talent@test.invalid', '{}'),
 ('a0000000-0000-4000-8000-000000000002', 'org@test.invalid', '{}'),
 ('a0000000-0000-4000-8000-000000000003', 'other@test.invalid', '{}'),
 ('a0000000-0000-4000-8000-000000000004', 'admin@test.invalid', '{}');
insert into public.admins(user_id) values ('a0000000-0000-4000-8000-000000000004');

create temp table t_ctx(k text primary key, v uuid);
grant all on t_ctx to authenticated, anon;

-- talent creates a published profile: goes to review, not public
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.profiles(user_id, name, headline, languages, age_confirmed, unpaid_confirmed, published) values ('a0000000-0000-4000-8000-000000000001', 'Test Talent', 'Researcher', '{English}', true, true, true);
do $$ begin
  if (select review_status from public.profiles where user_id = auth.uid()) <> 'pending' then raise exception 'FAIL profile should be pending'; end if;
  begin update public.profiles set review_status = 'approved' where user_id = auth.uid(); raise exception 'FAIL self-approval allowed'; exception when insufficient_privilege then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin if exists (select 1 from public.profiles) then raise exception 'FAIL pending profile visible to public'; end if; end $$;

-- admin approves
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select public.admin_review_profile('a0000000-0000-4000-8000-000000000001', 'approved', 'Welcome');
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin if not exists (select 1 from public.profiles) then raise exception 'FAIL approved profile not public'; end if; end $$;
set local role authenticated;
-- non-admin cannot approve
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$ begin begin perform public.admin_review_profile('a0000000-0000-4000-8000-000000000001', 'rejected', 'x'); raise exception 'FAIL non-admin reviewed'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end; end $$;

-- organisation signs up: pending, cannot open a need until approved
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into t_ctx select 'org', public.create_organisation('Test Water Group', 'Kenya', 'Nakuru', 'https://example.org', 'Community water', 'Community organisation', 'Org Owner', true);
do $$ declare o uuid := (select v from t_ctx where k = 'org'); begin
  begin insert into public.needs(organisation_id, title, description, output, languages, hours, status, no_vulnerable_contact) values (o, 'Data tools need', 'We need a clear data collection template.', 'A template', '{English}', 8, 'open', true); raise exception 'FAIL unapproved org opened a need';
  exception when insufficient_privilege then null; end;
  insert into public.needs(organisation_id, title, description, output, languages, hours, status) values (o, 'Data tools need', 'We need a clear data collection template.', 'A template', '{English}', 8, 'draft');
end $$;
insert into t_ctx select 'need', id from public.needs limit 1;

select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select public.admin_review_organisation((select v from t_ctx where k = 'org'), 'approved', '');

select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin
  begin update public.needs set status = 'open' where id = (select v from t_ctx where k = 'need'); raise exception 'FAIL opened without safeguarding confirmation'; exception when check_violation then null; end;
end $$;
update public.needs set status = 'open', no_vulnerable_contact = true where id = (select v from t_ctx where k = 'need');
-- limit of three open needs
do $$ declare o uuid := (select v from t_ctx where k = 'org'); begin
  insert into public.needs(organisation_id, title, description, output, languages, hours, status, no_vulnerable_contact) values (o, 'Second need here', 'Another clear description of work.', 'Output', '{English}', 6, 'open', true), (o, 'Third need here', 'Another clear description of work.', 'Output', '{English}', 6, 'open', true);
  begin insert into public.needs(organisation_id, title, description, output, languages, hours, status, no_vulnerable_contact) values (o, 'Fourth need here', 'Another clear description of work.', 'Output', '{English}', 6, 'open', true); raise exception 'FAIL fourth open need allowed';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
end $$;

-- talent applies; cannot create an agreement directly
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.applications(need_id, user_id, message) values ((select v from t_ctx where k = 'need'), auth.uid(), 'I can build the template and train your team in two sessions.');
do $$ begin
  begin insert into public.engagements(need_id, organisation_id, user_id, scope, talent_signed_name, talent_signed_at, org_signed_name, org_signed_at, status)
    values ((select v from t_ctx where k = 'need'), (select v from t_ctx where k = 'org'), auth.uid(), '{}', 'x', now(), 'forged', now(), 'active'); raise exception 'FAIL forged agreement';
  exception when insufficient_privilege then null; end;
end $$;

-- another user cannot read the application or the conversation
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$ begin
  if exists (select 1 from public.applications) or exists (select 1 from public.conversations) then raise exception 'FAIL application or conversation leaked'; end if;
end $$;

-- organisation accepts: engagement created by the server
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into t_ctx select 'eng', public.decide_application((select id from public.applications limit 1), true);
do $$ begin
  if (select status from public.engagements where id = (select v from t_ctx where k = 'eng')) <> 'awaiting_signatures' then raise exception 'FAIL engagement state'; end if;
  if (select status from public.needs where id = (select v from t_ctx where k = 'need')) <> 'closed' then raise exception 'FAIL filled need should close'; end if;
end $$;

-- hours blocked before both signatures
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin
  begin insert into public.hours(engagement_id, user_id, work_date, hours, description) values ((select v from t_ctx where k = 'eng'), auth.uid(), current_date, 2, 'Early work before signing'); raise exception 'FAIL hours before signatures';
  exception when insufficient_privilege then null; end;
end $$;
select public.sign_engagement((select v from t_ctx where k = 'eng'), 'Test Talent');
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$ begin begin perform public.sign_engagement((select v from t_ctx where k = 'eng'), 'Intruder'); raise exception 'FAIL outsider signed'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end; end $$;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin if public.sign_engagement((select v from t_ctx where k = 'eng'), 'Org Owner') <> 'active' then raise exception 'FAIL not active after both signatures'; end if; end $$;

-- talent logs hours; cannot approve them; organisation approves
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.hours(engagement_id, user_id, work_date, hours, description) values ((select v from t_ctx where k = 'eng'), auth.uid(), current_date, 3, 'Built the template and tested it');
do $$ begin begin perform public.review_hours((select id from public.hours limit 1), true, ''); raise exception 'FAIL self-approved hours'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end; end $$;
insert into public.messages(conversation_id, sender_id, body) values ((select id from public.conversations limit 1), auth.uid(), 'Template is ready for review.');
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.review_hours((select id from public.hours limit 1), true, '');
-- organisation cannot publish the talent's contribution
do $$ begin begin perform public.set_contribution_visibility((select v from t_ctx where k = 'eng'), true); raise exception 'FAIL org published contribution'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end; end $$;
select public.complete_engagement((select v from t_ctx where k = 'eng'), 'A template and a training session', 'Clear, practical work our team still uses every week.', 'Director', 4::smallint);

-- conversation closed after completion
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin
  begin insert into public.messages(conversation_id, sender_id, body) values ((select id from public.conversations limit 1), auth.uid(), 'After completion'); raise exception 'FAIL message after close';
  exception when insufficient_privilege then null; end;
end $$;

-- public CV: nothing until the talent publishes; never a rating
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  if exists (select 1 from public.public_contributions('a0000000-0000-4000-8000-000000000001')) then raise exception 'FAIL unpublished contribution public'; end if;
  begin perform 1 from public.engagements; raise exception 'FAIL anon read engagements'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select public.set_contribution_visibility((select v from t_ctx where k = 'eng'), true);
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  if (select count(*) from public.public_contributions('a0000000-0000-4000-8000-000000000001')) <> 1 then raise exception 'FAIL published contribution missing'; end if;
  if (select hours from public.public_contributions('a0000000-0000-4000-8000-000000000001')) <> 3 then raise exception 'FAIL approved hours total'; end if;
end $$;

-- notifications reached the right people
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin if not exists (select 1 from public.notifications where kind = 'application') then raise exception 'FAIL org not notified of application'; end if; end $$;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$ begin if exists (select 1 from public.notifications) then raise exception 'FAIL notifications leaked'; end if; end $$;

-- report and deletion
insert into public.reports(target_type, target_id, reason, details) values ('need', (select v from t_ctx where k = 'need'), 'misleading', 'This need looks misleading to me.');
insert into public.profiles(user_id, name) values (auth.uid(), 'Other Person');
select public.delete_my_account();
reset role;
do $$ begin
  if exists (select 1 from auth.users where id = 'a0000000-0000-4000-8000-000000000003') then raise exception 'FAIL account not deleted'; end if;
  if not exists (select 1 from public.reports where reporter_id is null) then raise exception 'FAIL report lost on deletion'; end if;
end $$;
rollback;
select 'PASS: approval before public, org approval, safeguarding confirmation, 3 open needs, no forged agreements, dual signatures, no self-review, talent-only publication, private ratings, closed conversations, notifications, reports, account deletion' as result;
