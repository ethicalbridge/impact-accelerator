-- Permission and workflow tests for Handova (rewritten 19 Oct 2026 from the audit).
-- Run the whole file in one go (SQL editor or psql). It ends by raising 'RESULTS (rolled back): …' on purpose,
-- so nothing is ever committed. Every step must say pass; any 'FAIL …' error means a rule is broken.
set idle_in_transaction_session_timeout = '5s'; set lock_timeout = '3s'; set statement_timeout = '30s';
begin;
create temp table r(n serial, step text, outcome text); grant all on r to authenticated, anon; grant all on sequence r_n_seq to authenticated, anon;
insert into auth.users(id, email, raw_user_meta_data) values
 ('a0000000-0000-4000-8000-000000000001', 'talent@test.invalid', '{}'),
 ('a0000000-0000-4000-8000-000000000002', 'org@test.invalid', '{}'),
 ('a0000000-0000-4000-8000-000000000003', 'other@test.invalid', '{}'),
 ('a0000000-0000-4000-8000-000000000004', 'admin@test.invalid', '{}');
insert into public.admins(user_id) values ('a0000000-0000-4000-8000-000000000004');
-- PATCH 1: platform agreements are required before publishing a profile / creating an organisation
insert into public.agreement_signatures(user_id, kind, version, full_name, agreement_text, text_sha256) values
 ('a0000000-0000-4000-8000-000000000001','professional',public.current_agreement('professional'),'Test Talent','x','x'),
 ('a0000000-0000-4000-8000-000000000002','organisation',public.current_agreement('organisation'),'Org Owner','x','x');
create temp table t_ctx(k text primary key, v uuid);
grant all on t_ctx to authenticated, anon;

-- talent creates a published profile: goes to review, not public (PATCH 2: LinkedIn + 8 h/month now required)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.profiles(user_id, name, headline, languages, age_confirmed, unpaid_confirmed, published, linkedin, hours_available) values ('a0000000-0000-4000-8000-000000000001', 'Test Talent', 'Researcher', '{English}', true, true, true, 'https://linkedin.com/in/test', 8);
do $$ begin
  if (select review_status from public.profiles where user_id = auth.uid()) <> 'pending' then raise exception 'FAIL profile should be pending'; end if;
  begin update public.profiles set review_status = 'approved' where user_id = auth.uid(); raise exception 'FAIL self-approval allowed'; exception when insufficient_privilege then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin if exists (select 1 from public.profiles where user_id = 'a0000000-0000-4000-8000-000000000001') then raise exception 'FAIL pending profile visible to public'; end if; end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select public.admin_review_profile('a0000000-0000-4000-8000-000000000001', 'approved', 'Welcome');
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin if not exists (select 1 from public.profiles where user_id = 'a0000000-0000-4000-8000-000000000001') then raise exception 'FAIL approved profile not public'; end if; end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$ begin begin perform public.admin_review_profile('a0000000-0000-4000-8000-000000000001', 'rejected', 'x'); raise exception 'FAIL non-admin reviewed'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end; end $$;
insert into r(step, outcome) values ('profile review flow', 'pass');

-- organisation: pending, cannot open a need; drafts need the safeguarding tick too now
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into t_ctx select 'org', public.create_organisation('Test Water Group', 'Kenya', 'Nakuru', 'https://example.org', 'Community water', 'Community organisation', 'Org Owner', true);
do $$ declare o uuid := (select v from t_ctx where k = 'org'); begin
  begin insert into public.needs(organisation_id, title, description, output, languages, hours, status, no_vulnerable_contact) values (o, 'Data tools need', 'We need a clear data collection template.', 'A template', '{English}', 8, 'open', true); raise exception 'FAIL unapproved org opened a need';
  exception when insufficient_privilege or raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin insert into public.needs(organisation_id, title, description, output, languages, hours, status) values (o, 'Data tools need', 'We need a clear data collection template.', 'A template', '{English}', 8, 'draft'); raise exception 'FAIL draft without safeguarding';
  exception when check_violation then null; end;
  insert into public.needs(organisation_id, title, description, output, languages, hours, status, no_vulnerable_contact) values (o, 'Data tools need', 'We need a clear data collection template.', 'A template', '{English}', 8, 'draft', true);
end $$;
insert into t_ctx select 'need', id from public.needs where organisation_id = (select v from t_ctx where k = 'org') limit 1;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select public.admin_review_organisation((select v from t_ctx where k = 'org'), 'approved', '');
-- org cannot open its own need; it sends it for review and Handova opens it
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin
  begin update public.needs set status = 'open' where id = (select v from t_ctx where k = 'need'); raise exception 'FAIL org opened a need without review'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
end $$;
update public.needs set status = 'pending' where id = (select v from t_ctx where k = 'need');
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select public.admin_review_need((select v from t_ctx where k = 'need'), 'approved', '');
-- limit of 3 (open + pending + in progress)
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ declare o uuid := (select v from t_ctx where k = 'org'); begin
  insert into public.needs(organisation_id, title, description, output, languages, hours, status, no_vulnerable_contact) values (o, 'Second need here', 'Another clear description of work.', 'Output', '{English}', 6, 'pending', true), (o, 'Third need here', 'Another clear description of work.', 'Output', '{English}', 6, 'pending', true);
  begin insert into public.needs(organisation_id, title, description, output, languages, hours, status, no_vulnerable_contact) values (o, 'Fourth need here', 'Another clear description of work.', 'Output', '{English}', 6, 'pending', true); raise exception 'FAIL fourth need allowed';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin update public.needs set title = 'Changed live title' where id = (select v from t_ctx where k = 'need'); raise exception 'FAIL live need edited';
  exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
end $$;
insert into r(step, outcome) values ('org + need review + limit 3 + live lock', 'pass');

-- talent applies; cannot forge an agreement
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.applications(need_id, user_id, message) values ((select v from t_ctx where k = 'need'), auth.uid(), 'I can build the template and train your team in two sessions.');
do $$ begin
  begin insert into public.engagements(need_id, organisation_id, user_id, scope, talent_signed_name, talent_signed_at, org_signed_name, org_signed_at, status)
    values ((select v from t_ctx where k = 'need'), (select v from t_ctx where k = 'org'), auth.uid(), '{}', 'x', now(), 'forged', now(), 'active'); raise exception 'FAIL forged agreement';
  exception when insufficient_privilege then null; end;
  begin insert into public.contribution_signatures(party, full_name, version, agreement_text, text_sha256) values ('professional', 'Forged', 'v', 't', 'h'); raise exception 'FAIL forged signature';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$ begin
  if exists (select 1 from public.applications) or exists (select 1 from public.conversations) then raise exception 'FAIL application or conversation leaked'; end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into t_ctx select 'eng', public.decide_application((select id from public.applications limit 1), true);
do $$ begin
  if (select status from public.engagements where id = (select v from t_ctx where k = 'eng')) <> 'awaiting_signatures' then raise exception 'FAIL engagement state'; end if;
  if (select status from public.needs where id = (select v from t_ctx where k = 'need')) <> 'closed' then raise exception 'FAIL filled need should close'; end if;
end $$;
reset role; do $$ begin if public.needs_in_use((select v from t_ctx where k = 'org'), null, true) <> 3 then raise exception 'FAIL in-progress need should still use a place'; end if; end $$; set local role authenticated;
insert into r(step, outcome) values ('apply, no forgery, accept, place still in use', 'pass');

-- hours blocked before both signatures; old signing refused; v2 signing with full record
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin
  begin insert into public.hours(engagement_id, user_id, work_date, hours, description) values ((select v from t_ctx where k = 'eng'), auth.uid(), current_date, 2, 'Early work before signing'); raise exception 'FAIL hours before signatures';
  exception when insufficient_privilege then null; end;
  begin perform public.sign_engagement((select v from t_ctx where k = 'eng'), 'Test Talent'); raise exception 'FAIL old signing accepted'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
end $$;
reset role; update public.profiles set id_status = 'approved' where user_id = 'a0000000-0000-4000-8000-000000000001'; set local role authenticated; -- PATCH 3: ID check is required
create temp table t_txt as select 'Contribution agreement ' || e.terms_version || ' for ' || (e.scope->>'need_title') || '. Full text.' as t, e.terms_version as v from public.engagements e where e.id = (select v from t_ctx where k = 'eng');
grant all on t_txt to authenticated;
select public.sign_engagement((select v from t_ctx where k = 'eng'), 'Test Talent', (select t from t_txt), (select v from t_txt), 'en', '{"scope":true,"confidentiality":true,"read_all":true,"no_conflict":true}'::jsonb);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$ begin begin perform public.sign_engagement((select v from t_ctx where k = 'eng'), 'Intruder', (select t from t_txt), (select v from t_txt), 'en', '{"scope":true,"confidentiality":true,"read_all":true,"no_conflict":true,"authority":true}'::jsonb, 'Boss', 'Someone', 'someone@x.org'); raise exception 'FAIL outsider signed'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end; end $$;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin if public.sign_engagement((select v from t_ctx where k = 'eng'), 'Org Owner', (select t from t_txt), (select v from t_txt), 'en', '{"scope":true,"confidentiality":true,"read_all":true,"no_conflict":true,"authority":true}'::jsonb, 'Director', 'Safe Person', 'safe@example.org') <> 'active' then raise exception 'FAIL not active after both signatures'; end if;
  if (select count(*) from public.contribution_signatures where engagement_id = (select v from t_ctx where k = 'eng')) <> 2 then raise exception 'FAIL signature records'; end if;
  if not exists (select 1 from public.messages where kind = 'system') then raise exception 'FAIL no kick-off agenda'; end if;
  begin perform public.close_conversation((select id from public.conversations limit 1)); raise exception 'FAIL conversation closed while live'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
end $$;
insert into r(step, outcome) values ('signing v2, outsider refused, kick-off posted, messages locked open', 'pass');

-- hours: no self-approval; organisation approves
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.hours(engagement_id, user_id, work_date, hours, description) values ((select v from t_ctx where k = 'eng'), auth.uid(), current_date, 3, 'Built the template and tested it');
do $$ begin begin perform public.review_hours((select id from public.hours limit 1), true, ''); raise exception 'FAIL self-approved hours'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end; end $$;
insert into public.messages(conversation_id, sender_id, body) values ((select id from public.conversations limit 1), auth.uid(), 'Template is ready for review.');
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.review_hours((select id from public.hours limit 1), true, '');
do $$ begin begin perform public.set_contribution_visibility((select v from t_ctx where k = 'eng'), true); raise exception 'FAIL org published contribution'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end; end $$;
do $$ begin begin perform public.complete_engagement((select v from t_ctx where k = 'eng'), 'A template and a training session', 'Clear, practical work.', 'Director', 4::smallint); raise exception 'FAIL old completion with rating accepted'; exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end; end $$;
insert into r(step, outcome) values ('hours review, old rating completion refused', 'pass');

-- NEW: "partly" with the endorsement left empty is allowed by the rules
do $$ declare res text; begin
  begin
    perform public.complete_engagement((select v from t_ctx where k = 'eng'), 'partly', 'A template and a training session', array['Data'], '', 'English', 'Director', 'Org Owner', true, '', 'yes', '', true);
    res := 'ok';
    raise exception 'UNDO';
  exception when others then
    if sqlerrm <> 'UNDO' then res := 'ERROR ' || sqlstate || ': ' || sqlerrm; end if;
  end;
  if res <> 'ok' then raise exception 'FAIL partly delivered without an endorsement: %', res; end if;
  insert into r(step, outcome) values ('complete partly + empty endorsement', 'pass');
end $$;
select public.complete_engagement((select v from t_ctx where k = 'eng'), 'all', 'A template and a training session',
  array['Data collection', 'Training'], repeat('Clear, practical work our team still uses every week. ', 3), 'English', 'Director', 'Org Owner', true, 'Thank you', 'yes', '', true);
-- conversation closed after completion
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin
  begin insert into public.messages(conversation_id, sender_id, body) values ((select id from public.conversations limit 1), auth.uid(), 'After completion'); raise exception 'FAIL message after close';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  if exists (select 1 from public.public_contributions('a0000000-0000-4000-8000-000000000001')) then raise exception 'FAIL unpublished contribution public'; end if;
  begin perform 1 from public.engagements; raise exception 'FAIL anon read engagements'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin if exists (select 1 from public.completion_private) then raise exception 'FAIL professional sees work-again answer'; end if; end $$;
select public.set_contribution_visibility((select v from t_ctx where k = 'eng'), true);
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  if (select count(*) from public.public_contributions('a0000000-0000-4000-8000-000000000001')) <> 1 then raise exception 'FAIL published contribution missing'; end if;
  if (select hours from public.public_contributions('a0000000-0000-4000-8000-000000000001')) <> 3 then raise exception 'FAIL approved hours total'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin if not exists (select 1 from public.notifications where kind = 'application') then raise exception 'FAIL org not notified of application'; end if; end $$;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$ begin if exists (select 1 from public.notifications) then raise exception 'FAIL notifications leaked'; end if; end $$;
insert into r(step, outcome) values ('complete v2, private answers, public CV, notifications', 'pass');

-- report and deletion (PATCH 4: deletion needs a fresh authorization from the account-delete function)
do $$ declare res text := 'insert ok'; begin
  begin insert into public.reports(target_type, target_id, reason, details) values ('need', (select v from t_ctx where k = 'need'), 'misleading', 'This need looks misleading to me.');
  exception when others then res := 'ERROR ' || sqlstate || ': ' || sqlerrm; end;
  if res <> 'insert ok' then raise exception 'FAIL Report a concern: %', res; end if;
  insert into r(step, outcome) values ('member submits a report (Report a concern)', 'pass');
end $$;
reset role; insert into public.reports(reporter_id, target_type, target_id, reason, details) select 'a0000000-0000-4000-8000-000000000003', 'need', (select v from t_ctx where k = 'need'), 'misleading', 'This need looks misleading to me.' where not exists (select 1 from public.reports where target_id = (select v from t_ctx where k = 'need')); set local role authenticated; -- PATCH 5: seed the report as owner so the deletion check can run
insert into public.profiles(user_id, name) values (auth.uid(), 'Other Person');
reset role; insert into public.account_deletion_authorizations(user_id, verified_at) values ('a0000000-0000-4000-8000-000000000003', now()); set local role authenticated;
select public.delete_my_account();
reset role;
do $$ begin
  if exists (select 1 from auth.users where id = 'a0000000-0000-4000-8000-000000000003') then raise exception 'FAIL account not deleted'; end if;
  if not exists (select 1 from public.reports where reporter_id is null and target_id = (select v from t_ctx where k = 'need')) then raise exception 'FAIL report lost on deletion'; end if;
end $$;
insert into r(step, outcome) values ('report kept after reporter deletes account', 'pass');

-- NEW: the professional deletes their account; contribution messages should be kept 6 years as "Former member"
insert into r(step, outcome) select 'before talent deletion: messages in the need''s conversations user/system/former', count(*) filter (where kind='user') || '/' || count(*) filter (where kind='system') || '/' || count(*) filter (where kind='former') from public.messages m join public.conversations c on c.id = m.conversation_id where c.need_id = (select v from t_ctx where k = 'need');
insert into public.account_deletion_authorizations(user_id, verified_at) values ('a0000000-0000-4000-8000-000000000001', now());
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select public.delete_my_account();
reset role;
insert into r(step, outcome) select 'after talent deletion: messages in the need''s conversations user/system/former', count(*) filter (where kind='user') || '/' || count(*) filter (where kind='system') || '/' || count(*) filter (where kind='former') from public.messages m join public.conversations c on c.id = m.conversation_id where c.need_id = (select v from t_ctx where k = 'need');
insert into r(step, outcome) select 'after talent deletion: conversations for the need', count(*)::text from public.conversations where need_id = (select v from t_ctx where k = 'need');
insert into r(step, outcome) select 'after talent deletion: engagement kept / user_id null / scope talent', count(*) || ' / ' || count(*) filter (where user_id is null) || ' / ' || coalesce(max(scope->>'talent'), '-') from public.engagements where id = (select v from t_ctx where k = 'eng');
insert into r(step, outcome) select 'after talent deletion: contribution_signatures kept / closed', count(*) || ' / ' || count(account_closed_at) from public.contribution_signatures where engagement_id = (select v from t_ctx where k = 'eng');
do $$ begin
  if (select count(*) from public.conversations where need_id = (select v from t_ctx where k = 'need')) <> 1 then raise exception 'FAIL contribution conversation deleted with the professional''s account'; end if;
  if not exists (select 1 from public.messages m join public.conversations c on c.id = m.conversation_id where c.need_id = (select v from t_ctx where k = 'need') and m.kind = 'former') then raise exception 'FAIL former member messages not kept'; end if;
end $$;
do $$ begin raise exception 'RESULTS (rolled back): %', (select string_agg(n || ') ' || step || ' => ' || outcome, ' | ' order by n) from r); end $$;
rollback;
