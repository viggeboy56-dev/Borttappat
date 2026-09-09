begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
grant usage on schema extensions to postgres, authenticated;
set local search_path = public, extensions;

select extensions.plan(17);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-a@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'staff-a@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'member-a@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'staff-b@test.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'member-b@test.invalid', '', now(), '{}', '{}', now(), now());

insert into public.schools (id, name, slug)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Skola A', 'skola-a'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Skola B', 'skola-b');

insert into public.profiles (id, school_id, full_name, role)
values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Admin A', 'school_admin'),
  ('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Personal A', 'staff'),
  ('10000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'Medlem A', 'member'),
  ('20000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Personal B', 'staff'),
  ('20000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'Medlem B', 'member');

insert into public.items (id, school_id, created_by, title, category, status, image_path)
values
  ('a1000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Mössa A', 'Kläder', 'available', 'aaaaaaaa-0000-0000-0000-000000000001/a1000000-0000-0000-0000-000000000001/test.png'),
  ('a1000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Arkiverad A', 'Övrigt', 'archived', null),
  ('b1000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Väska B', 'Väskor', 'available', 'bbbbbbbb-0000-0000-0000-000000000001/b1000000-0000-0000-0000-000000000001/test.png');

insert into storage.objects (bucket_id, name, owner_id)
values
  ('item-images', 'aaaaaaaa-0000-0000-0000-000000000001/a1000000-0000-0000-0000-000000000001/test.png', '10000000-0000-0000-0000-000000000002'),
  ('item-images', 'bbbbbbbb-0000-0000-0000-000000000001/b1000000-0000-0000-0000-000000000001/test.png', '20000000-0000-0000-0000-000000000001');

insert into public.claims (id, item_id, user_id, message)
values
  ('ca000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Min mössa'),
  ('cb000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Min väska');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';

select extensions.is(
  (select count(*)::integer from public.items),
  1,
  'member sees only available items in their own school'
);

select extensions.is(
  (select count(*)::integer from public.items where school_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  0,
  'member cannot read School B items'
);

select extensions.is(
  (select count(*)::integer from storage.objects where bucket_id = 'item-images'),
  1,
  'member can retrieve only permitted item images from their own school'
);

select extensions.is(
  (select count(*)::integer from public.claims),
  1,
  'member sees only their own claims'
);

select extensions.is(
  (select count(*)::integer from public.claims where item_id = 'b1000000-0000-0000-0000-000000000001'),
  0,
  'member cannot read School B claims'
);

select extensions.throws_ok(
  $$update public.profiles set role = 'school_admin' where id = '10000000-0000-0000-0000-000000000003'$$,
  'P0001',
  'Only a school administrator can change roles',
  'member cannot elevate their own role'
);

select extensions.is_empty(
  $$update public.items set status = 'archived'
    where id = 'a1000000-0000-0000-0000-000000000001'
    returning id$$,
  'member cannot update an item'
);

select extensions.throws_ok(
  $$insert into public.items (school_id, created_by, title, category) values ('aaaaaaaa-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Otillåten', 'Övrigt')$$,
  '42501',
  null,
  'member cannot create an item'
);

select extensions.throws_ok(
  $$insert into public.claims (item_id, user_id, message) values ('b1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Otillåtet anspråk')$$,
  '42501',
  null,
  'member cannot bypass the secure claim function with a direct insert'
);

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';

select extensions.lives_ok(
  $$insert into public.items (school_id, created_by, title, category)
    values ('aaaaaaaa-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Skapad av personal', 'Övrigt')$$,
  'staff can create an item in their own school'
);

select extensions.is(
  (select count(*)::integer from public.items
    where title = 'Skapad av personal'
      and school_id = 'aaaaaaaa-0000-0000-0000-000000000001'
      and created_by = '10000000-0000-0000-0000-000000000002'),
  1,
  'staff item keeps the correct school and creator ownership'
);

select extensions.throws_ok(
  $$insert into public.items (school_id, created_by, title, category)
    values ('bbbbbbbb-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Fel skola', 'Övrigt')$$,
  '42501',
  null,
  'staff cannot create an item for another school'
);

select extensions.is(
  (select count(*)::integer from public.items),
  3,
  'staff sees every item in their own school'
);

select extensions.is(
  (select count(*)::integer from public.claims),
  1,
  'staff sees claims only for their own school items'
);

select extensions.is_empty(
  $$update public.items set status = 'claimed'
    where id = 'b1000000-0000-0000-0000-000000000001'
    returning id$$,
  'School A staff cannot update a School B item'
);

set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';

select extensions.lives_ok(
  $$insert into public.items (school_id, created_by, title, category)
    values ('aaaaaaaa-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Skapad av admin', 'Skolmaterial')$$,
  'school admin can create an item in their own school'
);

select extensions.results_eq(
  $$update public.profiles set role = 'staff'
    where id = '10000000-0000-0000-0000-000000000003'
    returning role::text$$,
  $$values ('staff'::text)$$,
  'school admin can manage a role inside their own school'
);

select * from extensions.finish();
rollback;
