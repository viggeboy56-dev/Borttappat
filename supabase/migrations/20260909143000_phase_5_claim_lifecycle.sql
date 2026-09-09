-- Borttappat! Phase 5: transactional claim review and return lifecycle.

create unique index claims_one_pending_per_user_item_idx
on public.claims (item_id, user_id)
where status = 'pending'::public.claim_status;

create unique index claims_one_approved_per_item_idx
on public.claims (item_id)
where status = 'approved'::public.claim_status;

create function private.current_user_has_claim(target_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.claims as claim
    where claim.item_id = target_item_id
      and claim.user_id = (select auth.uid())
  )
$$;

revoke all on function private.current_user_has_claim(uuid) from public;
grant execute on function private.current_user_has_claim(uuid) to authenticated;

drop policy "Members can read available items in their school" on public.items;
create policy "Members can read available or personally claimed items in their school"
on public.items for select to authenticated
using (
  school_id = (select private.current_school_id()) and
  (
    status = 'available'::public.item_status or
    (select private.current_user_has_claim(id))
  )
);

drop policy "Users can read permitted item images" on storage.objects;
create policy "Users can read permitted item images"
on storage.objects for select to authenticated
using (
  bucket_id = 'item-images' and
  exists (
    select 1 from public.items as item
    where item.image_path = storage.objects.name
      and item.school_id = (select private.current_school_id())
      and (
        item.status = 'available'::public.item_status or
        (select private.current_user_has_claim(item.id)) or
        (select private.is_staff())
      )
  )
);

create function private.enforce_item_status_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status or (select auth.uid()) is null then
    return new;
  end if;

  if old.status = 'archived'::public.item_status
     and new.status = 'available'::public.item_status
     and (select private.is_staff()) then
    return new;
  end if;

  if new.status = 'archived'::public.item_status and (select private.is_staff()) then
    return new;
  end if;

  if old.status = 'available'::public.item_status
     and new.status = 'claimed'::public.item_status
     and exists (
       select 1 from public.claims as claim
       where claim.item_id = old.id
         and claim.status = 'approved'::public.claim_status
     ) then
    return new;
  end if;

  if old.status = 'claimed'::public.item_status
     and new.status = 'returned'::public.item_status
     and exists (
       select 1 from public.claims as claim
       where claim.item_id = old.id
         and claim.status = 'approved'::public.claim_status
     ) then
    return new;
  end if;

  raise exception 'Invalid item status transition';
end;
$$;

create trigger items_enforce_status_transition
before update of status on public.items
for each row execute function private.enforce_item_status_transition();

revoke all on function private.enforce_item_status_transition() from public;

create function public.submit_claim(target_item_id uuid, ownership_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  claim_id uuid;
  item_school_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if (select private.current_role()) is distinct from 'member'::public.user_role then
    raise exception using errcode = '42501', message = 'Only members can submit claims';
  end if;

  ownership_message := btrim(coalesce(ownership_message, ''));
  if length(ownership_message) < 1 or length(ownership_message) > 2000 then
    raise exception using errcode = '22023', message = 'Invalid ownership message';
  end if;

  select item.school_id
  into item_school_id
  from public.items as item
  where item.id = target_item_id
    and item.status = 'available'::public.item_status
  for update;

  if item_school_id is null or item_school_id is distinct from (select private.current_school_id()) then
    raise exception using errcode = '42501', message = 'Item is not available';
  end if;

  if exists (
    select 1 from public.claims as claim
    where claim.item_id = target_item_id
      and claim.user_id = (select auth.uid())
      and claim.status = 'pending'::public.claim_status
  ) then
    raise exception using errcode = '23505', message = 'Pending claim already exists';
  end if;

  insert into public.claims (item_id, user_id, message)
  values (target_item_id, (select auth.uid()), ownership_message)
  returning id into claim_id;

  return claim_id;
end;
$$;

create function public.review_claim(target_claim_id uuid, decision public.claim_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer_id uuid := (select auth.uid());
  reviewer_school_id uuid;
  claim_item_id uuid;
  claim_state public.claim_status;
  item_school_id uuid;
  item_state public.item_status;
begin
  if reviewer_id is null or not (select private.is_staff()) then
    raise exception using errcode = '42501', message = 'Staff access required';
  end if;

  if decision not in ('approved'::public.claim_status, 'rejected'::public.claim_status) then
    raise exception using errcode = '22023', message = 'Invalid review decision';
  end if;

  select profile.school_id into reviewer_school_id
  from public.profiles as profile
  where profile.id = reviewer_id;

  -- Read the item id first, then lock the shared item before the individual claim.
  -- Competing reviewers therefore serialize on one lock without deadlocking.
  select claim.item_id into claim_item_id
  from public.claims as claim
  where claim.id = target_claim_id;

  if claim_item_id is null then
    raise exception using errcode = 'P0002', message = 'Claim not found';
  end if;

  select item.school_id, item.status
  into item_school_id, item_state
  from public.items as item
  where item.id = claim_item_id
  for update;

  if item_school_id is distinct from reviewer_school_id then
    raise exception using errcode = '42501', message = 'Claim belongs to another school';
  end if;

  select claim.status into claim_state
  from public.claims as claim
  where claim.id = target_claim_id
  for update;

  if claim_state is distinct from 'pending'::public.claim_status then
    raise exception 'Claim is no longer pending';
  end if;

  if decision = 'approved'::public.claim_status then
    if item_state is distinct from 'available'::public.item_status then
      raise exception 'Item is no longer available';
    end if;

    update public.claims
    set status = 'approved'::public.claim_status
    where id = target_claim_id;

    update public.items
    set status = 'claimed'::public.item_status
    where id = claim_item_id;

    update public.claims
    set status = 'rejected'::public.claim_status
    where item_id = claim_item_id
      and id <> target_claim_id
      and status = 'pending'::public.claim_status;
  else
    update public.claims
    set status = 'rejected'::public.claim_status
    where id = target_claim_id;
  end if;
end;
$$;

create function public.mark_item_returned(target_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer_id uuid := (select auth.uid());
  reviewer_school_id uuid;
  item_school_id uuid;
  item_state public.item_status;
begin
  if reviewer_id is null or not (select private.is_staff()) then
    raise exception using errcode = '42501', message = 'Staff access required';
  end if;

  select profile.school_id into reviewer_school_id
  from public.profiles as profile
  where profile.id = reviewer_id;

  select item.school_id, item.status
  into item_school_id, item_state
  from public.items as item
  where item.id = target_item_id
  for update;

  if item_school_id is null then
    raise exception using errcode = 'P0002', message = 'Item not found';
  end if;

  if item_school_id is distinct from reviewer_school_id then
    raise exception using errcode = '42501', message = 'Item belongs to another school';
  end if;

  if item_state is distinct from 'claimed'::public.item_status or not exists (
    select 1 from public.claims as claim
    where claim.item_id = target_item_id
      and claim.status = 'approved'::public.claim_status
  ) then
    raise exception 'Item is not ready to be returned';
  end if;

  update public.items
  set status = 'returned'::public.item_status
  where id = target_item_id;
end;
$$;

revoke all on function public.submit_claim(uuid, text) from public;
revoke all on function public.review_claim(uuid, public.claim_status) from public;
revoke all on function public.mark_item_returned(uuid) from public;
grant execute on function public.submit_claim(uuid, text) to authenticated;
grant execute on function public.review_claim(uuid, public.claim_status) to authenticated;
grant execute on function public.mark_item_returned(uuid) to authenticated;

revoke insert, update on table public.claims from authenticated;

comment on function public.submit_claim(uuid, text) is 'Creates a member claim using auth.uid() and locks the available same-school item.';
comment on function public.review_claim(uuid, public.claim_status) is 'Atomically approves or rejects a pending claim; approval claims the item and rejects competing pending claims.';
comment on function public.mark_item_returned(uuid) is 'Marks a claimed same-school item with an approved claim as returned.';
