begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to postgres, authenticated;
set local search_path = public, extensions;

select extensions.plan(20);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'claim-admin-a@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'claim-staff-a@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'claim-member-a1@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'claim-member-a2@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '52000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'claim-staff-b@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '52000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'claim-member-b@test.invalid', '', now(), '{}', '{}', now(), now());

insert into public.schools (id, name, slug) values
  ('aa510000-0000-0000-0000-000000000001', 'Anspråksskola A', 'anspraksskola-a'),
  ('bb520000-0000-0000-0000-000000000001', 'Anspråksskola B', 'anspraksskola-b');

insert into public.profiles (id, school_id, full_name, role) values
  ('51000000-0000-0000-0000-000000000001', 'aa510000-0000-0000-0000-000000000001', 'Admin A', 'school_admin'),
  ('51000000-0000-0000-0000-000000000002', 'aa510000-0000-0000-0000-000000000001', 'Personal A', 'staff'),
  ('51000000-0000-0000-0000-000000000003', 'aa510000-0000-0000-0000-000000000001', 'Medlem A1', 'member'),
  ('51000000-0000-0000-0000-000000000004', 'aa510000-0000-0000-0000-000000000001', 'Medlem A2', 'member'),
  ('52000000-0000-0000-0000-000000000001', 'bb520000-0000-0000-0000-000000000001', 'Personal B', 'staff'),
  ('52000000-0000-0000-0000-000000000002', 'bb520000-0000-0000-0000-000000000001', 'Medlem B', 'member');

insert into public.items (id, school_id, created_by, title, category, status) values
  ('a5510000-0000-0000-0000-000000000001', 'aa510000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 'Mössa A1', 'Kläder', 'available'),
  ('a5510000-0000-0000-0000-000000000002', 'aa510000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', 'Väska A2', 'Väskor', 'available'),
  ('b5520000-0000-0000-0000-000000000001', 'bb520000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', 'Mobil B', 'Elektronik', 'available');

insert into public.claims (id, item_id, user_id, message)
values ('cb520000-0000-0000-0000-000000000001', 'b5520000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000002', 'Min mobil');

set local role authenticated;
set local request.jwt.claim.sub = '51000000-0000-0000-0000-000000000003';

select extensions.lives_ok(
  $$select public.submit_claim('a5510000-0000-0000-0000-000000000001', 'Mitt namn står på tvättlappen')$$,
  'member can submit a claim for an available same-school item'
);

select extensions.throws_ok(
  $$select public.submit_claim('a5510000-0000-0000-0000-000000000001', 'Dubblett')$$,
  '23505', 'Pending claim already exists',
  'duplicate pending claims are rejected'
);

select extensions.throws_ok(
  $$select public.submit_claim('b5520000-0000-0000-0000-000000000001', 'Fel skola')$$,
  '42501', 'Item is not available',
  'member cannot claim another school item'
);

select extensions.is((select count(*)::integer from public.claims), 1, 'member reads only their own claim');

select extensions.throws_ok(
  $$update public.claims set status = 'approved' where item_id = 'a5510000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'member cannot directly approve a claim'
);

select extensions.lives_ok(
  $$select public.submit_claim('a5510000-0000-0000-0000-000000000002', 'Nyckelring i innerfickan')$$,
  'member can submit a second claim for another item'
);

select extensions.throws_ok(
  $$select public.mark_item_returned('a5510000-0000-0000-0000-000000000001')$$,
  '42501', 'Staff access required',
  'member cannot mark an item as returned'
);

set local request.jwt.claim.sub = '51000000-0000-0000-0000-000000000004';
select extensions.lives_ok(
  $$select public.submit_claim('a5510000-0000-0000-0000-000000000001', 'Initialer på insidan')$$,
  'another member can submit a competing claim'
);

set local request.jwt.claim.sub = '51000000-0000-0000-0000-000000000002';
select extensions.is((select count(*)::integer from public.claims), 3, 'staff reads claims only from their own school');

select extensions.throws_ok(
  $$select public.review_claim('cb520000-0000-0000-0000-000000000001', 'approved')$$,
  '42501', 'Claim belongs to another school',
  'staff cannot review another school claim'
);

select extensions.throws_ok(
  $$select public.mark_item_returned('b5520000-0000-0000-0000-000000000001')$$,
  '42501', 'Item belongs to another school',
  'staff cannot return another school item'
);

select extensions.lives_ok(
  $$select public.review_claim((select id from public.claims where item_id = 'a5510000-0000-0000-0000-000000000001' and user_id = '51000000-0000-0000-0000-000000000003'), 'approved')$$,
  'staff can approve a pending claim'
);

select extensions.is((select status::text from public.items where id = 'a5510000-0000-0000-0000-000000000001'), 'claimed', 'approval reserves the item');
select extensions.is((select count(*)::integer from public.claims where item_id = 'a5510000-0000-0000-0000-000000000001' and status = 'approved'), 1, 'exactly one claim is approved');
select extensions.is((select count(*)::integer from public.claims where item_id = 'a5510000-0000-0000-0000-000000000001' and status = 'rejected'), 1, 'competing pending claims are rejected');

select extensions.throws_ok(
  $$select public.review_claim((select id from public.claims where item_id = 'a5510000-0000-0000-0000-000000000001' and user_id = '51000000-0000-0000-0000-000000000004'), 'approved')$$,
  'P0001', 'Claim is no longer pending',
  'a competing reviewer cannot approve an already rejected claim'
);

select extensions.lives_ok(
  $$select public.review_claim((select id from public.claims where item_id = 'a5510000-0000-0000-0000-000000000002'), 'rejected')$$,
  'staff can reject a pending claim'
);

select extensions.is((select status::text from public.items where id = 'a5510000-0000-0000-0000-000000000002'), 'available', 'rejection leaves the item available');

select extensions.lives_ok(
  $$select public.mark_item_returned('a5510000-0000-0000-0000-000000000001')$$,
  'staff can confirm return of a reserved item'
);

select extensions.is((select status::text from public.items where id = 'a5510000-0000-0000-0000-000000000001'), 'returned', 'returned item keeps a verifiable final state');

select * from extensions.finish();
rollback;
