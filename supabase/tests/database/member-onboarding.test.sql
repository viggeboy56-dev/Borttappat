begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to postgres,authenticated;
set local search_path=public,extensions;
select extensions.plan(38);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','80000000-0000-0000-0000-000000000001','authenticated','authenticated','operator-member@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','81000000-0000-0000-0000-000000000001','authenticated','authenticated','admin-member@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','81000000-0000-0000-0000-000000000002','authenticated','authenticated','staff-member@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','81000000-0000-0000-0000-000000000003','authenticated','authenticated','member-existing@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','81000000-0000-0000-0000-000000000004','authenticated','authenticated','new-member@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','81000000-0000-0000-0000-000000000005','authenticated','authenticated','wrong-code@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','81000000-0000-0000-0000-000000000006','authenticated','authenticated','invalid-school@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','81000000-0000-0000-0000-000000000007','authenticated','authenticated','rate-limited@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','82000000-0000-0000-0000-000000000001','authenticated','authenticated','member-other@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','82000000-0000-0000-0000-000000000002','authenticated','authenticated','staff-other@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','82000000-0000-0000-0000-000000000003','authenticated','authenticated','admin-other@test.invalid','',now(),'{}','{}',now(),now());
insert into public.schools(id,name,slug) values
('cc810000-0000-0000-0000-000000000001','Medlemsskola A','medlemsskola-a'),
('dd820000-0000-0000-0000-000000000001','Medlemsskola B','medlemsskola-b');
insert into public.profiles(id,school_id,full_name,role) values
('81000000-0000-0000-0000-000000000001','cc810000-0000-0000-0000-000000000001','Admin A','school_admin'),
('81000000-0000-0000-0000-000000000002','cc810000-0000-0000-0000-000000000001','Personal A','staff'),
('81000000-0000-0000-0000-000000000003','cc810000-0000-0000-0000-000000000001','Medlem A','member'),
('82000000-0000-0000-0000-000000000001','dd820000-0000-0000-0000-000000000001','Medlem B','member'),
('82000000-0000-0000-0000-000000000002','dd820000-0000-0000-0000-000000000001','Personal B','staff'),
('82000000-0000-0000-0000-000000000003','dd820000-0000-0000-0000-000000000001','Admin B','school_admin');
insert into private.platform_operators(user_id) values('80000000-0000-0000-0000-000000000001');

set local role authenticated; set local request.jwt.claim.sub='80000000-0000-0000-0000-000000000001';
select extensions.is((select enabled from public.operator_get_member_onboarding('cc810000-0000-0000-0000-000000000001')),false,'new school starts with member onboarding disabled');
select extensions.lives_ok($$select public.operator_configure_member_onboarding('cc810000-0000-0000-0000-000000000001',true,encode(extensions.digest(convert_to('AAAA1111BBBB2222','UTF8'),'sha256'),'hex'))$$,'operator can enable member onboarding');
select extensions.is((select enabled from public.operator_get_member_onboarding('cc810000-0000-0000-0000-000000000001')),true,'operator sees enabled status');
set local role postgres;
select extensions.ok((select join_code_hash ~ '^[0-9a-f]{64}$' from public.school_member_onboarding where school_id='cc810000-0000-0000-0000-000000000001'),'only a code hash is stored');
select extensions.ok(not has_table_privilege('authenticated','public.school_member_onboarding','select'),'configuration table is not directly readable');

set local role authenticated; set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000001';
select extensions.throws_ok($$select public.operator_get_member_onboarding('cc810000-0000-0000-0000-000000000001')$$,'42501','Operator access required','school_admin cannot read operator member config');
select extensions.throws_ok($$select public.operator_configure_member_onboarding('cc810000-0000-0000-0000-000000000001',false,null)$$,'42501','Operator access required','school_admin cannot configure onboarding');
set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000002';
select extensions.throws_ok($$select public.operator_configure_member_onboarding('cc810000-0000-0000-0000-000000000001',false,null)$$,'42501','Operator access required','staff cannot configure onboarding');
set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000003';
select extensions.throws_ok($$select public.operator_configure_member_onboarding('cc810000-0000-0000-0000-000000000001',false,null)$$,'42501','Operator access required','member cannot configure onboarding');

set local role anon; set local request.jwt.claim.sub='';
select extensions.is((select count(*)::integer from public.resolve_member_join_school('medlemsskola-a')),1,'valid slug resolves publicly');
select extensions.is((select school_name from public.resolve_member_join_school('medlemsskola-a')),'Medlemsskola A','resolver exposes display name');
select extensions.is((select joining_enabled from public.resolve_member_join_school('medlemsskola-a')),true,'resolver exposes enabled status');
select extensions.ok(not ((select to_jsonb(r) from public.resolve_member_join_school('medlemsskola-a') r) ? 'school_id'),'resolver does not expose school id');
select extensions.is((select count(*)::integer from public.resolve_member_join_school('saknas')),0,'invalid slug fails without data');
select extensions.ok(not has_table_privilege('anon','public.schools','select'),'anonymous users cannot read schools table');
select extensions.ok(has_function_privilege('anon','public.resolve_member_join_school(text)','execute'),'anonymous users only receive narrow resolver access');
select extensions.ok(not has_function_privilege('anon','public.join_school_as_member(text,text,text)','execute'),'anonymous users cannot create membership');

set local role authenticated; set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000005';
select extensions.is(public.join_school_as_member('medlemsskola-a','FELF-FELF-FELF-FELF','Fel Kod'),'invalid_code','wrong code is rejected');
set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000006';
select extensions.is(public.join_school_as_member('saknas','AAAA-1111-BBBB-2222','Okänd Skola'),'joining_unavailable','invalid school cannot create membership');
set local role postgres;
select extensions.is((select count(*)::integer from public.profiles where id in('81000000-0000-0000-0000-000000000005','81000000-0000-0000-0000-000000000006')),0,'failed joins create no profiles');
set local role authenticated; set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000007';
select public.join_school_as_member('medlemsskola-a','FELF-FELF-FELF-FELF','Många Försök') from generate_series(1,9);
select extensions.is((select count(*)::integer from private.member_join_attempts where user_id='81000000-0000-0000-0000-000000000007'),9,'failed code attempts are recorded privately');
select public.join_school_as_member('medlemsskola-a','FELF-FELF-FELF-FELF','Många Försök');
select extensions.is(public.join_school_as_member('medlemsskola-a','FELF-FELF-FELF-FELF','Många Försök'),'rate_limited','repeated wrong codes are rate limited');

set local role authenticated; set local request.jwt.claim.sub='80000000-0000-0000-0000-000000000001';
select extensions.lives_ok($$select public.operator_configure_member_onboarding('cc810000-0000-0000-0000-000000000001',true,encode(extensions.digest(convert_to('CCCC3333DDDD4444','UTF8'),'sha256'),'hex'))$$,'operator can rotate code');
set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000004';
select extensions.is(public.join_school_as_member('medlemsskola-a','AAAA-1111-BBBB-2222','Ny Medlem'),'invalid_code','old code stops working immediately');
select extensions.is(public.join_school_as_member('medlemsskola-a','CCCC-3333-DDDD-4444','Ny Medlem'),'joined','new code joins member');
set local role postgres;
select extensions.is((select school_id::text from public.profiles where id='81000000-0000-0000-0000-000000000004'),'cc810000-0000-0000-0000-000000000001','school comes from slug lookup');
select extensions.is((select role::text from public.profiles where id='81000000-0000-0000-0000-000000000004'),'member','role is always member');
select extensions.is((select full_name from public.profiles where id='81000000-0000-0000-0000-000000000004'),'Ny Medlem','validated member name is stored');
select extensions.ok(not extensions.has_function('public','join_school_as_member',array['text','text','text','uuid','user_role']),'no RPC signature accepts browser school or role values');

set local role authenticated; set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000003';
select extensions.is(public.join_school_as_member('medlemsskola-a','CCCC-3333-DDDD-4444','Nytt Namn'),'already_member','same-school member is handled without duplicate');
set local request.jwt.claim.sub='82000000-0000-0000-0000-000000000001';
select extensions.is(public.join_school_as_member('medlemsskola-a','CCCC-3333-DDDD-4444','Medlem B'),'account_other_school','cross-school member is rejected');
set local request.jwt.claim.sub='82000000-0000-0000-0000-000000000002';
select extensions.is(public.join_school_as_member('medlemsskola-a','CCCC-3333-DDDD-4444','Personal B'),'account_other_school','staff in another school is not moved');
set local request.jwt.claim.sub='82000000-0000-0000-0000-000000000003';
select extensions.is(public.join_school_as_member('medlemsskola-a','CCCC-3333-DDDD-4444','Admin B'),'account_other_school','school_admin in another school is not moved');
set local role postgres;
select extensions.is((select count(*)::integer from public.profiles where id='81000000-0000-0000-0000-000000000003'),1,'same-school member profile is not duplicated');
select extensions.is((select count(*)::integer from private.platform_operators where user_id='81000000-0000-0000-0000-000000000004'),0,'joining grants no operator access');

set local role authenticated; set local request.jwt.claim.sub='80000000-0000-0000-0000-000000000001';
select extensions.lives_ok($$select public.operator_configure_member_onboarding('cc810000-0000-0000-0000-000000000001',false,null)$$,'operator can disable onboarding');
set local request.jwt.claim.sub='81000000-0000-0000-0000-000000000006';
select extensions.is(public.join_school_as_member('medlemsskola-a','CCCC-3333-DDDD-4444','Efter Stopp'),'joining_unavailable','disabled onboarding blocks new joins');
set local role anon;
select extensions.is((select joining_enabled from public.resolve_member_join_school('medlemsskola-a')),false,'public route reports disabled state without internals');

select * from extensions.finish();
rollback;
