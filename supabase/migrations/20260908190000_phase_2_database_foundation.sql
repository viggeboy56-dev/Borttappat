-- Borttappat! Phase 2: multi-tenant database and storage foundation.
-- All tenant decisions are derived from auth.uid() through public.profiles.

create type public.user_role as enum ('school_admin', 'staff', 'member');
create type public.item_status as enum ('available', 'claimed', 'returned', 'archived');
create type public.claim_status as enum ('pending', 'approved', 'rejected');

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 160),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete restrict,
  full_name text check (full_name is null or length(btrim(full_name)) between 1 and 160),
  role public.user_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (school_id, id)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by uuid not null,
  title text not null check (length(btrim(title)) between 1 and 200),
  description text,
  category text not null check (length(btrim(category)) between 1 and 100),
  found_location text check (found_location is null or length(btrim(found_location)) between 1 and 200),
  found_date date,
  image_path text,
  status public.item_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_created_by_same_school_fk
    foreign key (school_id, created_by)
    references public.profiles (school_id, id)
    on delete restrict,
  constraint items_image_path_is_relative check (
    image_path is null or (
      image_path !~ '^/' and
      image_path !~ '\.\.' and
      split_part(image_path, '/', 1) = school_id::text and
      split_part(image_path, '/', 2) = id::text and
      length(image_path) between 1 and 1024
    )
  )
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  message text not null check (length(btrim(message)) between 1 and 2000),
  status public.claim_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint claims_review_state_consistent check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null) or
    (status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
  )
);

create index profiles_school_id_idx on public.profiles (school_id);
create index items_school_status_created_idx on public.items (school_id, status, created_at desc);
create index items_created_by_idx on public.items (created_by);
create unique index items_image_path_unique_idx on public.items (image_path) where image_path is not null;
create index claims_item_status_created_idx on public.claims (item_id, status, created_at desc);
create index claims_user_created_idx on public.claims (user_id, created_at desc);
create index claims_reviewed_by_idx on public.claims (reviewed_by) where reviewed_by is not null;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.school_id
  from public.profiles as p
  where p.id = (select auth.uid())
$$;

create function private.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid())
$$;

-- Keeping the helper isolated makes profile RLS non-recursive.
create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select private.current_role()) in ('school_admin'::public.user_role, 'staff'::public.user_role),
    false
  )
$$;

revoke all on function private.current_school_id() from public;
revoke all on function private.current_role() from public;
revoke all on function private.is_staff() from public;
grant usage on schema private to authenticated;
grant execute on function private.current_school_id() to authenticated;
grant execute on function private.current_role() to authenticated;
grant execute on function private.is_staff() to authenticated;

create function private.set_item_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger items_set_updated_at
before update on public.items
for each row execute function private.set_item_updated_at();

create function private.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id is distinct from old.id or new.school_id is distinct from old.school_id then
    raise exception 'Profile id and school_id cannot be changed';
  end if;

  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and (select private.current_role()) is distinct from 'school_admin'::public.user_role then
    raise exception 'Only a school administrator can change roles';
  end if;

  return new;
end;
$$;

create trigger profiles_protect_security_fields
before update on public.profiles
for each row execute function private.protect_profile_security_fields();

create function private.protect_item_tenant_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.school_id is distinct from old.school_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Item ownership fields cannot be changed';
  end if;
  return new;
end;
$$;

create trigger items_protect_tenant_fields
before update on public.items
for each row execute function private.protect_item_tenant_fields();

create function private.prepare_claim_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
     or new.item_id is distinct from old.item_id
     or new.user_id is distinct from old.user_id
     or new.message is distinct from old.message
     or new.created_at is distinct from old.created_at then
    raise exception 'Claim ownership and message fields cannot be changed';
  end if;

  if new.status is distinct from old.status then
    if new.status = 'pending'::public.claim_status then
      new.reviewed_by := null;
      new.reviewed_at := null;
    else
      new.reviewed_by := (select auth.uid());
      new.reviewed_at := now();
    end if;
  else
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
  end if;

  return new;
end;
$$;

create trigger claims_prepare_review
before update on public.claims
for each row execute function private.prepare_claim_review();

create function private.validate_claim_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.items as item
    join public.profiles as claimant
      on claimant.id = new.user_id
     and claimant.school_id = item.school_id
    where item.id = new.item_id
  ) then
    raise exception 'Claimant and item must belong to the same school';
  end if;

  if new.reviewed_by is not null and not exists (
    select 1
    from public.items as item
    join public.profiles as reviewer
      on reviewer.id = new.reviewed_by
     and reviewer.school_id = item.school_id
    where item.id = new.item_id
  ) then
    raise exception 'Reviewer and item must belong to the same school';
  end if;

  return new;
end;
$$;

create trigger claims_validate_tenant
before insert or update on public.claims
for each row execute function private.validate_claim_tenant();

revoke all on function private.set_item_updated_at() from public;
revoke all on function private.protect_profile_security_fields() from public;
revoke all on function private.protect_item_tenant_fields() from public;
revoke all on function private.prepare_claim_review() from public;
revoke all on function private.validate_claim_tenant() from public;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.claims enable row level security;

revoke all on table public.schools, public.profiles, public.items, public.claims from anon, authenticated;

grant select on table public.schools to authenticated;
grant update (name, slug) on table public.schools to authenticated;

grant select, insert on table public.profiles to authenticated;
grant update (full_name, role) on table public.profiles to authenticated;

grant select, insert on table public.items to authenticated;
grant update (title, description, category, found_location, found_date, image_path, status) on table public.items to authenticated;

grant select, insert on table public.claims to authenticated;
grant update (status) on table public.claims to authenticated;

create policy "Users can read their own school"
on public.schools for select to authenticated
using (id = (select private.current_school_id()));

create policy "School admins can update their own school"
on public.schools for update to authenticated
using (
  id = (select private.current_school_id()) and
  (select private.current_role()) = 'school_admin'::public.user_role
)
with check (
  id = (select private.current_school_id()) and
  (select private.current_role()) = 'school_admin'::public.user_role
);

create policy "Users can read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()));

create policy "Staff can read profiles in their school"
on public.profiles for select to authenticated
using (school_id = (select private.current_school_id()) and (select private.is_staff()));

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()))
with check ((select auth.uid()) is not null and id = (select auth.uid()));

create policy "School admins can insert profiles in their school"
on public.profiles for insert to authenticated
with check (
  school_id = (select private.current_school_id()) and
  (select private.current_role()) = 'school_admin'::public.user_role
);

create policy "School admins can update profiles in their school"
on public.profiles for update to authenticated
using (
  school_id = (select private.current_school_id()) and
  (select private.current_role()) = 'school_admin'::public.user_role
)
with check (
  school_id = (select private.current_school_id()) and
  (select private.current_role()) = 'school_admin'::public.user_role
);

create policy "Members can read available items in their school"
on public.items for select to authenticated
using (
  school_id = (select private.current_school_id()) and
  status = 'available'::public.item_status
);

create policy "Staff can read all items in their school"
on public.items for select to authenticated
using (school_id = (select private.current_school_id()) and (select private.is_staff()));

create policy "Staff can create items in their school"
on public.items for insert to authenticated
with check (
  school_id = (select private.current_school_id()) and
  created_by = (select auth.uid()) and
  (select private.is_staff())
);

create policy "Staff can update items in their school"
on public.items for update to authenticated
using (school_id = (select private.current_school_id()) and (select private.is_staff()))
with check (school_id = (select private.current_school_id()) and (select private.is_staff()));

create policy "Users can read their own claims"
on public.claims for select to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Staff can read claims for their school"
on public.claims for select to authenticated
using (
  (select private.is_staff()) and
  exists (
    select 1 from public.items as item
    where item.id = claims.item_id
      and item.school_id = (select private.current_school_id())
  )
);

create policy "Users can create claims for available items in their school"
on public.claims for insert to authenticated
with check (
  (select auth.uid()) is not null and
  user_id = (select auth.uid()) and
  status = 'pending'::public.claim_status and
  reviewed_by is null and
  reviewed_at is null and
  exists (
    select 1 from public.items as item
    where item.id = claims.item_id
      and item.school_id = (select private.current_school_id())
      and item.status = 'available'::public.item_status
  )
);

create policy "Staff can review claims for their school"
on public.claims for update to authenticated
using (
  (select private.is_staff()) and
  exists (
    select 1 from public.items as item
    where item.id = claims.item_id
      and item.school_id = (select private.current_school_id())
  )
)
with check (
  (select private.is_staff()) and
  exists (
    select 1 from public.items as item
    where item.id = claims.item_id
      and item.school_id = (select private.current_school_id())
  )
);

-- Private Storage bucket. Object paths must be:
-- <school_id>/<item_id>/<unique-filename>.<extension>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-images',
  'item-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read permitted item images"
on storage.objects for select to authenticated
using (
  bucket_id = 'item-images' and
  exists (
    select 1 from public.items as item
    where item.image_path = storage.objects.name
      and item.school_id = (select private.current_school_id())
      and (item.status = 'available'::public.item_status or (select private.is_staff()))
  )
);

create policy "Staff can upload images for their school items"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'item-images' and
  (select private.is_staff()) and
  (storage.foldername(name))[1] = (select private.current_school_id())::text and
  exists (
    select 1 from public.items as item
    where item.id::text = (storage.foldername(name))[2]
      and item.school_id = (select private.current_school_id())
  )
);

create policy "Staff can update images for their school items"
on storage.objects for update to authenticated
using (
  bucket_id = 'item-images' and
  (select private.is_staff()) and
  (storage.foldername(name))[1] = (select private.current_school_id())::text and
  exists (
    select 1 from public.items as item
    where item.id::text = (storage.foldername(name))[2]
      and item.school_id = (select private.current_school_id())
  )
)
with check (
  bucket_id = 'item-images' and
  (select private.is_staff()) and
  (storage.foldername(name))[1] = (select private.current_school_id())::text and
  exists (
    select 1 from public.items as item
    where item.id::text = (storage.foldername(name))[2]
      and item.school_id = (select private.current_school_id())
  )
);

create policy "Staff can delete images for their school items"
on storage.objects for delete to authenticated
using (
  bucket_id = 'item-images' and
  (select private.is_staff()) and
  (storage.foldername(name))[1] = (select private.current_school_id())::text and
  exists (
    select 1 from public.items as item
    where item.id::text = (storage.foldername(name))[2]
      and item.school_id = (select private.current_school_id())
  )
);

comment on schema private is 'Non-exposed helpers for RLS and integrity triggers.';
comment on column public.items.image_path is 'Relative path in private item-images bucket: <school_id>/<item_id>/<filename>.';
