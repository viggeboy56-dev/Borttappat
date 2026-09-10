-- Borttappat! Phase 6: operator-managed school and staff onboarding.

create table private.platform_operators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on table private.platform_operators from public, anon, authenticated;

create function private.is_operator()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from private.platform_operators o where o.user_id=(select auth.uid())
  )
$$;
revoke all on function private.is_operator() from public;
grant execute on function private.is_operator() to authenticated;

create function public.is_operator()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_operator()
$$;
revoke all on function public.is_operator() from public, anon;
grant execute on function public.is_operator() to authenticated;

create function public.grant_platform_operator(target_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from auth.users u where u.id=target_user_id) then
    raise exception using errcode='P0002', message='Auth user not found';
  end if;
  insert into private.platform_operators(user_id) values(target_user_id) on conflict do nothing;
end;
$$;
revoke all on function public.grant_platform_operator(uuid) from public, anon, authenticated;
grant execute on function public.grant_platform_operator(uuid) to service_role;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) between 2 and 120),
  email text not null check (email=lower(btrim(email)) and length(email) between 3 and 320),
  role public.user_role not null default 'staff' check (role='staff'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references private.platform_operators(user_id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  cancelled_at timestamptz,
  constraint invitations_terminal_state check (accepted_at is null or cancelled_at is null),
  constraint invitations_expiry_after_creation check (expires_at > created_at)
);
create unique index invitations_one_open_email_idx on public.invitations(email)
  where accepted_at is null and cancelled_at is null;
create index invitations_school_created_idx on public.invitations(school_id,created_at desc);
alter table public.invitations enable row level security;
revoke all on table public.invitations from anon, authenticated;
grant select on table public.invitations to authenticated;

create function private.is_school_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select private.current_role())='school_admin'::public.user_role,false)
$$;
revoke all on function private.is_school_admin() from public;
grant execute on function private.is_school_admin() to authenticated;

create policy "School admins can read own school invitations"
on public.invitations for select to authenticated
using (school_id=(select private.current_school_id()) and (select private.is_school_admin()));

-- School admins retain read-only school oversight. Role and invitation writes are operator-only.
revoke update(role) on table public.profiles from authenticated;

create function public.list_school_users()
returns table(id uuid,full_name text,email text,role public.user_role,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare actor_school uuid;
begin
  if not (select private.is_school_admin()) then
    raise exception using errcode='42501', message='School admin access required';
  end if;
  actor_school := (select private.current_school_id());
  return query select p.id,p.full_name,u.email::text,p.role,p.created_at
    from public.profiles p join auth.users u on u.id=p.id
    where p.school_id=actor_school order by p.created_at;
end;
$$;

create function public.count_pending_invitations()
returns bigint language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.is_school_admin()) then
    raise exception using errcode='42501', message='School admin access required';
  end if;
  return (select count(*) from public.invitations i
    where i.school_id=(select private.current_school_id())
      and i.accepted_at is null and i.cancelled_at is null and i.expires_at>now());
end;
$$;

create function public.operator_list_schools()
returns table(id uuid,name text,slug text,staff_count bigint,pending_count bigint,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.is_operator()) then raise exception using errcode='42501',message='Operator access required'; end if;
  return query select s.id,s.name,s.slug,
    (select count(*) from public.profiles p where p.school_id=s.id and p.role='staff'),
    (select count(*) from public.invitations i where i.school_id=s.id and i.accepted_at is null and i.cancelled_at is null and i.expires_at>now()),
    s.created_at from public.schools s order by s.created_at desc;
end;
$$;

create function public.operator_create_school(school_name text,school_slug text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if not (select private.is_operator()) then raise exception using errcode='42501',message='Operator access required'; end if;
  school_name:=btrim(coalesce(school_name,'')); school_slug:=lower(btrim(coalesce(school_slug,'')));
  if length(school_name) not between 2 and 120 then raise exception using errcode='22023',message='Invalid school name'; end if;
  if school_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(school_slug)>80 then raise exception using errcode='22023',message='Invalid school slug'; end if;
  insert into public.schools(name,slug) values(school_name,school_slug) returning id into new_id;
  return new_id;
end;
$$;

create function public.operator_get_school(target_school_id uuid)
returns table(id uuid,name text,slug text,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.is_operator()) then raise exception using errcode='42501',message='Operator access required'; end if;
  return query select s.id,s.name,s.slug,s.created_at from public.schools s where s.id=target_school_id;
end;
$$;

create function public.operator_list_school_users(target_school_id uuid)
returns table(id uuid,full_name text,email text,role public.user_role,created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.is_operator()) then raise exception using errcode='42501',message='Operator access required'; end if;
  return query select p.id,p.full_name,u.email::text,p.role,p.created_at
    from public.profiles p join auth.users u on u.id=p.id where p.school_id=target_school_id order by p.created_at;
end;
$$;

create function public.operator_list_school_invitations(target_school_id uuid)
returns table(id uuid,full_name text,email text,role public.user_role,created_at timestamptz,expires_at timestamptz,accepted_at timestamptz,cancelled_at timestamptz,status text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.is_operator()) then raise exception using errcode='42501',message='Operator access required'; end if;
  return query select i.id,i.full_name,i.email,i.role,i.created_at,i.expires_at,i.accepted_at,i.cancelled_at,
    case when i.accepted_at is not null then 'accepted' when i.cancelled_at is not null then 'cancelled' when i.expires_at<=now() then 'expired' else 'pending' end
    from public.invitations i where i.school_id=target_school_id order by i.created_at desc;
end;
$$;

create function public.operator_preview_staff_batch(target_school_id uuid,staff_rows jsonb)
returns table(row_number integer,full_name text,email text,status text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.is_operator()) then raise exception using errcode='42501',message='Operator access required'; end if;
  if not exists(select 1 from public.schools s where s.id=target_school_id) then raise exception using errcode='P0002',message='School not found'; end if;
  if jsonb_typeof(staff_rows) is distinct from 'array' or jsonb_array_length(staff_rows) not between 1 and 100 then raise exception using errcode='22023',message='Batch must contain 1 to 100 rows'; end if;
  return query
  with rows as (
    select ord::integer as rn,btrim(coalesce(value->>'full_name','')) as person_name,lower(btrim(coalesce(value->>'email',''))) as person_email
    from jsonb_array_elements(staff_rows) with ordinality as entry(value,ord)
  ), marked as (
    select r.*,count(*) over(partition by person_email) as email_occurrences from rows r
  )
  select m.rn,m.person_name,m.person_email,
    case when length(m.person_name) not between 2 and 120 then 'invalid_name'
      when m.person_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(m.person_email)>320 then 'invalid_email'
      when m.email_occurrences>1 then 'duplicate_in_batch'
      when exists(select 1 from public.profiles p join auth.users u on u.id=p.id where lower(u.email)=m.person_email) then 'existing_user'
      when exists(select 1 from public.invitations i where i.email=m.person_email and i.accepted_at is null and i.cancelled_at is null and i.expires_at>now()) then 'active_invitation'
      when exists(select 1 from auth.users u where lower(u.email)=m.person_email) then 'existing_account'
      else 'ready' end
    from marked m order by m.rn;
end;
$$;

create function public.operator_bulk_invite_staff(target_school_id uuid,staff_rows jsonb)
returns table(id uuid,email text)
language plpgsql security definer set search_path = '' as $$
declare actor uuid:=(select auth.uid()); entry jsonb; normalized_email text; normalized_name text; supplied_hash text; new_id uuid;
begin
  if not (select private.is_operator()) then raise exception using errcode='42501',message='Operator access required'; end if;
  if not exists(select 1 from public.schools s where s.id=target_school_id) then raise exception using errcode='P0002',message='School not found'; end if;
  if jsonb_typeof(staff_rows) is distinct from 'array' or jsonb_array_length(staff_rows) not between 1 and 100 then raise exception using errcode='22023',message='Batch must contain 1 to 100 rows'; end if;
  if exists(select 1 from public.operator_preview_staff_batch(target_school_id,staff_rows) p where p.status not in ('ready','existing_account')) then
    raise exception using errcode='22023',message='Batch contains conflicts or invalid rows';
  end if;
  for entry in select value from jsonb_array_elements(staff_rows) loop
    normalized_name:=btrim(entry->>'full_name'); normalized_email:=lower(btrim(entry->>'email')); supplied_hash:=entry->>'token_hash';
    if supplied_hash !~ '^[0-9a-f]{64}$' then raise exception using errcode='22023',message='Invalid token hash'; end if;
    update public.invitations i set cancelled_at=now() where i.email=normalized_email and i.accepted_at is null and i.cancelled_at is null and i.expires_at<=now();
    insert into public.invitations(school_id,full_name,email,role,token_hash,created_by)
      values(target_school_id,normalized_name,normalized_email,'staff',supplied_hash,actor) returning invitations.id into new_id;
    id:=new_id; email:=normalized_email; return next;
  end loop;
end;
$$;

create function public.operator_reissue_invitation(target_invitation_id uuid,new_token_hash text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (select private.is_operator()) then raise exception using errcode='42501',message='Operator access required'; end if;
  if new_token_hash !~ '^[0-9a-f]{64}$' then raise exception using errcode='22023',message='Invalid token hash'; end if;
  update public.invitations set token_hash=new_token_hash,created_at=now(),expires_at=now()+interval '7 days',cancelled_at=null
    where id=target_invitation_id and accepted_at is null;
  if not found then raise exception using errcode='P0002',message='Reusable invitation not found'; end if;
end;
$$;

create function public.operator_cancel_invitation(target_invitation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (select private.is_operator()) then raise exception using errcode='42501',message='Operator access required'; end if;
  update public.invitations set cancelled_at=now() where id=target_invitation_id and accepted_at is null and cancelled_at is null;
  if not found then raise exception using errcode='P0002',message='Pending invitation not found'; end if;
end;
$$;

create function public.get_invitation_details(invitation_token_hash text)
returns table(school_name text,full_name text,email text,role public.user_role,status text,expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.name,i.full_name,i.email,i.role,
    case when i.accepted_at is not null then 'accepted' when i.cancelled_at is not null then 'cancelled' when i.expires_at<=now() then 'expired' else 'pending' end,
    i.expires_at from public.invitations i join public.schools s on s.id=i.school_id where i.token_hash=invitation_token_hash
$$;

create function public.accept_invitation(invitation_token_hash text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid:=(select auth.uid()); user_email text; invite public.invitations%rowtype; existing_school uuid;
begin
  if uid is null then raise exception using errcode='42501',message='Authentication required'; end if;
  select lower(u.email) into user_email from auth.users u where u.id=uid;
  select * into invite from public.invitations i where i.token_hash=invitation_token_hash for update;
  if invite.id is null then raise exception using errcode='P0002',message='Invitation not found'; end if;
  if invite.accepted_at is not null then raise exception using errcode='23505',message='Invitation already accepted'; end if;
  if invite.cancelled_at is not null then raise exception using errcode='22023',message='Invitation cancelled'; end if;
  if invite.expires_at<=now() then raise exception using errcode='22023',message='Invitation expired'; end if;
  if user_email is distinct from invite.email then raise exception using errcode='42501',message='Invitation email does not match'; end if;
  select p.school_id into existing_school from public.profiles p where p.id=uid;
  if existing_school is not null then
    if existing_school is distinct from invite.school_id then raise exception using errcode='42501',message='User already belongs to another school'; end if;
    raise exception using errcode='23505',message='User already has a profile';
  end if;
  insert into public.profiles(id,school_id,full_name,role) values(uid,invite.school_id,invite.full_name,invite.role);
  update public.invitations set accepted_at=now() where id=invite.id;
end;
$$;

do $$ declare signature text; begin
  foreach signature in array array[
    'public.list_school_users()','public.count_pending_invitations()','public.operator_list_schools()',
    'public.operator_create_school(text,text)','public.operator_get_school(uuid)','public.operator_list_school_users(uuid)',
    'public.operator_list_school_invitations(uuid)','public.operator_preview_staff_batch(uuid,jsonb)',
    'public.operator_bulk_invite_staff(uuid,jsonb)','public.operator_reissue_invitation(uuid,text)',
    'public.operator_cancel_invitation(uuid)','public.get_invitation_details(text)','public.accept_invitation(text)'
  ] loop execute 'revoke all on function '||signature||' from public'; end loop;
end $$;
grant execute on function public.list_school_users(),public.count_pending_invitations() to authenticated;
grant execute on function public.operator_list_schools(),public.operator_create_school(text,text),public.operator_get_school(uuid),public.operator_list_school_users(uuid),public.operator_list_school_invitations(uuid),public.operator_preview_staff_batch(uuid,jsonb),public.operator_bulk_invite_staff(uuid,jsonb),public.operator_reissue_invitation(uuid,text),public.operator_cancel_invitation(uuid) to authenticated;
grant execute on function public.get_invitation_details(text) to anon,authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
