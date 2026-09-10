begin;
set local role postgres;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to postgres,authenticated;
set local search_path=public,extensions;
select extensions.plan(53);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','70000000-0000-0000-0000-000000000001','authenticated','authenticated','operator@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','71000000-0000-0000-0000-000000000001','authenticated','authenticated','admin-a@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','71000000-0000-0000-0000-000000000002','authenticated','authenticated','staff-a@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','71000000-0000-0000-0000-000000000003','authenticated','authenticated','member-a@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','71000000-0000-0000-0000-000000000004','authenticated','authenticated','new-one@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','71000000-0000-0000-0000-000000000005','authenticated','authenticated','new-two@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','71000000-0000-0000-0000-000000000006','authenticated','authenticated','wrong@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','71000000-0000-0000-0000-000000000007','authenticated','authenticated','existing-account@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','71000000-0000-0000-0000-000000000008','authenticated','authenticated','expired@test.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','72000000-0000-0000-0000-000000000001','authenticated','authenticated','staff-b@test.invalid','',now(),'{}','{}',now(),now());
insert into public.schools(id,name,slug) values
('aa710000-0000-0000-0000-000000000001','Operatörsskola A','operatorsskola-a'),
('bb720000-0000-0000-0000-000000000001','Operatörsskola B','operatorsskola-b');
insert into public.profiles(id,school_id,full_name,role) values
('71000000-0000-0000-0000-000000000001','aa710000-0000-0000-0000-000000000001','Admin A','school_admin'),
('71000000-0000-0000-0000-000000000002','aa710000-0000-0000-0000-000000000001','Personal A','staff'),
('71000000-0000-0000-0000-000000000003','aa710000-0000-0000-0000-000000000001','Medlem A','member'),
('72000000-0000-0000-0000-000000000001','bb720000-0000-0000-0000-000000000001','Personal B','staff');
insert into private.platform_operators(user_id) values('70000000-0000-0000-0000-000000000001');

set local role authenticated; set local request.jwt.claim.sub='70000000-0000-0000-0000-000000000001';
select extensions.ok(public.is_operator(),'approved global operator is recognized');
set local request.jwt.claim.sub='71000000-0000-0000-0000-000000000001';
select extensions.ok(not public.is_operator(),'school_admin is not automatically an operator');
set local request.jwt.claim.sub='71000000-0000-0000-0000-000000000002';
select extensions.ok(not public.is_operator(),'staff is not an operator');
set local request.jwt.claim.sub='71000000-0000-0000-0000-000000000003';
select extensions.ok(not public.is_operator(),'member is not an operator');
set local request.jwt.claim.sub='71000000-0000-0000-0000-000000000001';
select extensions.throws_ok($$select public.operator_list_schools()$$,'42501','Operator access required','school_admin cannot list global schools');
set local request.jwt.claim.sub='71000000-0000-0000-0000-000000000002';
select extensions.throws_ok($$select public.operator_create_school('Nekad skola','nekad-skola')$$,'42501','Operator access required','staff cannot create schools');

set local request.jwt.claim.sub='70000000-0000-0000-0000-000000000001';
select extensions.lives_ok($$select public.operator_create_school('Ny pilotskola','ny-pilotskola')$$,'operator can create a school');
select extensions.is((select count(*)::integer from public.operator_list_schools() where slug='ny-pilotskola'),1,'created school appears in operator list');
select extensions.is((select count(*)::integer from public.operator_list_schools()),3,'operator can view all onboarded schools');

select extensions.is((select count(*)::integer from public.operator_preview_staff_batch('aa710000-0000-0000-0000-000000000001','[{"full_name":"Anna Andersson","email":"anna@test.invalid"},{"full_name":"Erik Eriksson","email":"erik@test.invalid"}]')),2,'valid multi-user batch previews every row');
select extensions.is((select count(*)::integer from public.operator_preview_staff_batch('aa710000-0000-0000-0000-000000000001','[{"full_name":"Anna Andersson","email":"anna@test.invalid"},{"full_name":"Erik Eriksson","email":"erik@test.invalid"}]') where status='ready'),2,'valid preview rows are ready');
select extensions.is((select count(*)::integer from public.operator_preview_staff_batch('aa710000-0000-0000-0000-000000000001','[{"full_name":"Anna","email":"same@test.invalid"},{"full_name":"Erik","email":"SAME@test.invalid"}]') where status='duplicate_in_batch'),2,'preview detects duplicate emails inside batch');
select extensions.is((select status from public.operator_preview_staff_batch('aa710000-0000-0000-0000-000000000001','[{"full_name":"Anna","email":"not-an-email"}]')),'invalid_email','preview detects invalid email');
select extensions.is((select status from public.operator_preview_staff_batch('aa710000-0000-0000-0000-000000000001','[{"full_name":"Personal B","email":"staff-b@test.invalid"}]')),'existing_user','preview detects an existing user from another school');
select extensions.is((select status from public.operator_preview_staff_batch('aa710000-0000-0000-0000-000000000001','[{"full_name":"Befintligt konto","email":"existing-account@test.invalid"}]')),'existing_account','existing Auth account without profile remains eligible');

select extensions.lives_ok($$select public.operator_bulk_invite_staff('aa710000-0000-0000-0000-000000000001','[{"full_name":"Ny Ett","email":"new-one@test.invalid","token_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"full_name":"Ny Två","email":"new-two@test.invalid","token_hash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}]')$$,'operator atomically creates a multi-user batch');
select extensions.is((select count(*)::integer from public.operator_list_school_invitations('aa710000-0000-0000-0000-000000000001') where email in('new-one@test.invalid','new-two@test.invalid')),2,'batch creates one invitation per person');
set local role postgres;
select extensions.is((select count(distinct token_hash)::integer from public.invitations where email in('new-one@test.invalid','new-two@test.invalid')),2,'each person has a unique token hash');
select extensions.is((select count(*)::integer from public.invitations where school_id='aa710000-0000-0000-0000-000000000001' and email in('new-one@test.invalid','new-two@test.invalid')),2,'all batch invitations belong to selected school');
select extensions.is((select count(*)::integer from public.invitations where role='staff' and email in('new-one@test.invalid','new-two@test.invalid')),2,'all operator onboarding invitations force staff role');
select extensions.is((select full_name from public.invitations where email='new-one@test.invalid'),'Ny Ett','operator-supplied name is stored in invitation');
set local role authenticated; set local request.jwt.claim.sub='70000000-0000-0000-0000-000000000001';
select extensions.is((select count(*)::integer from public.operator_list_school_invitations('aa710000-0000-0000-0000-000000000001')),2,'operator sees school invitation status');

set local request.jwt.claim.sub='71000000-0000-0000-0000-000000000001';
select extensions.throws_ok($$select public.operator_bulk_invite_staff('aa710000-0000-0000-0000-000000000001','[{"full_name":"Nekad","email":"denied@test.invalid","token_hash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}]')$$,'42501','Operator access required','school_admin cannot bulk onboard staff');
set local request.jwt.claim.sub='71000000-0000-0000-0000-000000000002';
select extensions.throws_ok($$select public.operator_list_school_invitations('aa710000-0000-0000-0000-000000000001')$$,'42501','Operator access required','staff cannot access operator invitation data');
set local request.jwt.claim.sub='71000000-0000-0000-0000-000000000003';
select extensions.throws_ok($$select public.operator_list_school_users('aa710000-0000-0000-0000-000000000001')$$,'42501','Operator access required','member cannot access operator user data');
select extensions.throws_ok($$insert into public.invitations(school_id,full_name,email,role,token_hash,created_by) values('aa710000-0000-0000-0000-000000000001','Direkt','direct@test.invalid','staff',repeat('c',64),'70000000-0000-0000-0000-000000000001')$$,'42501',null,'ordinary users cannot directly insert invitations');

set local request.jwt.claim.sub='70000000-0000-0000-0000-000000000001';
select extensions.throws_ok($$select public.operator_bulk_invite_staff('aa710000-0000-0000-0000-000000000001','[{"full_name":"Första","email":"partial-one@test.invalid","token_hash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"},{"full_name":"Andra","email":"partial-two@test.invalid","token_hash":"fel"}]')$$,'22023','Invalid token hash','invalid later row aborts batch');
set local role postgres;
select extensions.is((select count(*)::integer from public.invitations where email like 'partial-%'),0,'failed batch leaves no partial rows');
set local role authenticated; set local request.jwt.claim.sub='70000000-0000-0000-0000-000000000001';
select extensions.is((select status from public.operator_preview_staff_batch('aa710000-0000-0000-0000-000000000001','[{"full_name":"Ny Ett","email":"new-one@test.invalid"}]')),'active_invitation','preview detects conflicting active invitation');
select extensions.throws_ok($$select public.operator_bulk_invite_staff('aa710000-0000-0000-0000-000000000001','[{"full_name":"Ny Ett","email":"new-one@test.invalid","token_hash":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"}]')$$,'22023','Batch contains conflicts or invalid rows','conflicting batch is rejected atomically');

select extensions.lives_ok($$select public.operator_reissue_invitation((select id from public.operator_list_school_invitations('aa710000-0000-0000-0000-000000000001') where email='new-one@test.invalid'),repeat('f',64))$$,'operator can reissue an unaccepted invitation');
set local role postgres;
select extensions.is((select count(*)::integer from public.invitations where token_hash=repeat('a',64)),0,'reissue invalidates old token hash');
select extensions.is((select count(*)::integer from public.invitations where token_hash=repeat('f',64)),1,'reissue stores only new token hash');
set local role authenticated; set local request.jwt.claim.sub='70000000-0000-0000-0000-000000000001';
select extensions.lives_ok($$select public.operator_cancel_invitation((select id from public.operator_list_school_invitations('aa710000-0000-0000-0000-000000000001') where email='new-two@test.invalid'))$$,'operator can cancel pending invitation');
select extensions.is((select status from public.operator_list_school_invitations('aa710000-0000-0000-0000-000000000001') where email='new-two@test.invalid'),'cancelled','cancelled status is visible');

set local request.jwt.claim.sub='71000000-0000-0000-0000-000000000004';
select extensions.lives_ok($$select public.accept_invitation(repeat('f',64))$$,'invited person accepts current individual token');
select extensions.is((select school_id::text from public.profiles where id='71000000-0000-0000-0000-000000000004'),'aa710000-0000-0000-0000-000000000001','school comes from invitation');
select extensions.is((select role::text from public.profiles where id='71000000-0000-0000-0000-000000000004'),'staff','role comes from invitation');
select extensions.is((select full_name from public.profiles where id='71000000-0000-0000-0000-000000000004'),'Ny Ett','name comes from invitation');
set local role postgres;
select extensions.ok((select accepted_at is not null from public.invitations where email='new-one@test.invalid'),'successful invitation is marked accepted');
set local role authenticated; set local request.jwt.claim.sub='71000000-0000-0000-0000-000000000004';
select extensions.throws_ok($$select public.accept_invitation(repeat('f',64))$$,'23505','Invitation already accepted','accepted invitation cannot be reused');
set local request.jwt.claim.sub='71000000-0000-0000-0000-000000000005';
select extensions.throws_ok($$select public.accept_invitation('9999999999999999999999999999999999999999999999999999999999999999')$$,'P0002','Invitation not found','invalid token is rejected');
select extensions.throws_ok($$select public.accept_invitation(repeat('b',64))$$,'22023','Invitation cancelled','cancelled invitation is rejected');

set local role postgres;
insert into public.invitations(school_id,full_name,email,role,token_hash,created_by,created_at,expires_at) values('aa710000-0000-0000-0000-000000000001','Utgången','expired@test.invalid','staff',repeat('d',64),'70000000-0000-0000-0000-000000000001',now()-interval '2 days',now()-interval '1 day');
insert into public.invitations(school_id,full_name,email,role,token_hash,created_by) values('aa710000-0000-0000-0000-000000000001','Rätt Person','target@test.invalid','staff',repeat('e',64),'70000000-0000-0000-0000-000000000001');
insert into public.invitations(school_id,full_name,email,role,token_hash,created_by) values('aa710000-0000-0000-0000-000000000001','Personal B','staff-b@test.invalid','staff',repeat('1',64),'70000000-0000-0000-0000-000000000001');
insert into public.invitations(school_id,full_name,email,role,token_hash,created_by) values('bb720000-0000-0000-0000-000000000001','Endast skola B','school-b-invite@test.invalid','staff',repeat('3',64),'70000000-0000-0000-0000-000000000001');
select extensions.throws_ok($$insert into public.invitations(school_id,full_name,email,role,token_hash,created_by) values('aa710000-0000-0000-0000-000000000001','Manipulerad','role@test.invalid','member',repeat('2',64),'70000000-0000-0000-0000-000000000001')$$,'23514',null,'database constraint rejects role tampering');
set local role authenticated; set local request.jwt.claim.sub='71000000-0000-0000-0000-000000000008';
select extensions.throws_ok($$select public.accept_invitation(repeat('d',64))$$,'22023','Invitation expired','expired invitation is rejected');
set local request.jwt.claim.sub='71000000-0000-0000-0000-000000000006';
select extensions.throws_ok($$select public.accept_invitation(repeat('e',64))$$,'42501','Invitation email does not match','wrong signed-in email is rejected');
set local request.jwt.claim.sub='72000000-0000-0000-0000-000000000001';
select extensions.throws_ok($$select public.accept_invitation(repeat('1',64))$$,'42501','User already belongs to another school','existing user cannot switch tenant');

set local request.jwt.claim.sub='70000000-0000-0000-0000-000000000001';
select extensions.is((select count(*)::integer from public.operator_list_school_users('aa710000-0000-0000-0000-000000000001') where email='new-one@test.invalid'),1,'operator sees activated staff for school');
set local request.jwt.claim.sub='71000000-0000-0000-0000-000000000001';
select extensions.is((select count(*)::integer from public.invitations where token_hash=repeat('3',64)),0,'school admin cannot read another school invitations');
select extensions.throws_ok($$update public.invitations set cancelled_at=now() where email='target@test.invalid'$$,'42501',null,'school users cannot directly update invitations');

set local role postgres;
select extensions.ok(not has_function_privilege('authenticated','public.grant_platform_operator(uuid)','execute'),'authenticated users cannot grant operator status');
select extensions.ok(has_function_privilege('service_role','public.grant_platform_operator(uuid)','execute'),'service role can grant operator status through narrow bootstrap function');
select extensions.ok(not has_table_privilege('authenticated','private.platform_operators','select'),'operator registry is not directly readable by authenticated clients');

select * from extensions.finish();
rollback;
