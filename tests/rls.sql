-- All fixtures are transaction-local and rolled back. No emails or real users are touched.
begin;
insert into auth.users(id,raw_user_meta_data) values
 ('10000000-0000-4000-8000-000000000001','{}'),
 ('10000000-0000-4000-8000-000000000002','{}'),
 ('10000000-0000-4000-8000-000000000003','{}');
insert into public.organisations(id,registered_name,public_name,status) values ('20000000-0000-4000-8000-000000000001','Accelerator transaction test','Accelerator transaction test','published');
insert into public.organisation_members(organisation_id,user_id,role) values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','owner');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.ia_profiles(user_id,name,published) values ('10000000-0000-4000-8000-000000000001','Transaction talent',false);
insert into public.ia_portfolio(id,user_id,title,work_type,published) values ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Private work','Report',true);
update public.ia_portfolio set image='storage:10000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001.png' where id='30000000-0000-4000-8000-000000000001';
insert into storage.objects(bucket_id,name) values ('accelerator-portfolio','10000000-0000-4000-8000-000000000001/30000000-0000-4000-8000-000000000001.png');
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='accelerator-portfolio') then raise exception 'FAIL draft image leaked';end if;
 if exists(select 1 from public.ia_profiles where name='Transaction talent') then raise exception 'FAIL private profile leaked';end if;
 if exists(select 1 from public.ia_portfolio where title='Private work') then raise exception 'FAIL portfolio on private profile leaked';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
update public.ia_profiles set published=true where user_id='10000000-0000-4000-8000-000000000001';
do $$ begin begin update public.ia_portfolio set image='storage:10000000-0000-4000-8000-000000000003/30000000-0000-4000-8000-000000000001.png' where id='30000000-0000-4000-8000-000000000001';raise exception 'FAIL referenced another users private image';exception when check_violation then null;end;end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into public.ia_needs(id,organisation_id,title,description,output,hours,arrangement,status) values ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Test support need','A detailed test support request for review.','A research report',8,'Remote','open');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.ia_applications(id,need_id,user_id,message) values ('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','I can contribute research and data analysis.');
do $$ begin
 begin
 update public.ia_applications set status='accepted' where id='50000000-0000-4000-8000-000000000001';
 raise exception 'FAIL applicant accepted own application';
 exception when raise_exception then if sqlerrm like 'FAIL%' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ declare n integer; begin
 begin insert into public.ia_messages(need_id,user_id,sender_id,body) values ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','Unauthorised message');raise exception 'FAIL other user can send messages';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.ia_applications where id='50000000-0000-4000-8000-000000000001') then raise exception 'FAIL application leaked to another user';end if;
 update public.ia_profiles set name='Hijacked' where user_id='10000000-0000-4000-8000-000000000001';get diagnostics n=row_count;if n<>0 then raise exception 'FAIL profile edited by other user';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
update public.ia_applications set status='accepted' where id='50000000-0000-4000-8000-000000000001';
insert into public.ia_invitations(id,need_id,user_id,message) values ('70000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Please help our team with research and reporting.');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
update public.ia_invitations set status='accepted' where id='70000000-0000-4000-8000-000000000001';
select public.ia_prepare_agreement('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');
do $$ begin
 begin insert into public.ia_hours(need_id,user_id,work_date,hours,description) values ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',current_date,1,'Work before both signatures');raise exception 'FAIL unsigned agreement allowed time';exception when insufficient_privilege then null;end;
end $$;
update public.ia_agreements set talent_signed_name='Transaction talent',talent_signed_at=now() where need_id='40000000-0000-4000-8000-000000000001' and user_id='10000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ begin if exists(select 1 from public.ia_agreements where need_id='40000000-0000-4000-8000-000000000001') then raise exception 'FAIL agreement leaked to another user';end if;end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
update public.ia_agreements set organisation_signed_name='Organisation owner',organisation_signed_at=now(),organisation_signed_by='10000000-0000-4000-8000-000000000002' where need_id='40000000-0000-4000-8000-000000000001' and user_id='10000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.ia_saved(user_id,need_id) values ('10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001');
insert into public.ia_messages(need_id,user_id,sender_id,body) values ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Can we agree on the handover?');
insert into public.ia_hours(id,need_id,user_id,work_date,hours,description) values ('60000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',current_date,2,'Research and analysis completed');
do $$ declare n integer; begin
 begin insert into public.ia_hours(need_id,user_id,work_date,hours,description) values ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',current_date,23,'Too many total hours in one day');raise exception 'FAIL daily cap bypassed';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
 update public.ia_hours set status='approved' where id='60000000-0000-4000-8000-000000000001';get diagnostics n=row_count;if n<>0 then raise exception 'FAIL self-approval';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
update public.ia_hours set status='approved' where id='60000000-0000-4000-8000-000000000001';
do $$ begin
 if not exists(select 1 from public.ia_messages where body='Can we agree on the handover?') then raise exception 'FAIL organisation cannot read participant message';end if;
 if not exists(select 1 from public.ia_hours where id='60000000-0000-4000-8000-000000000001' and status='approved' and reviewed_by='10000000-0000-4000-8000-000000000002' and reviewed_at is not null) then raise exception 'FAIL review audit missing';end if;
 begin update public.ia_hours set status='changes_requested',review_note='overwrite' where id='60000000-0000-4000-8000-000000000001';raise exception 'FAIL approval overwritten';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 if not exists(select 1 from storage.objects where bucket_id='accelerator-portfolio') then raise exception 'FAIL public image not readable';end if;
 if not exists(select 1 from public.ia_portfolio where id='30000000-0000-4000-8000-000000000001') then raise exception 'FAIL published portfolio unavailable';end if;
 begin perform * from public.ia_hours;raise exception 'FAIL anon can read time records';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'PASS: visibility, ownership, tenant isolation, decisions, dual-signature agreements, messages, images, daily cap and immutable approval audit' as result;
