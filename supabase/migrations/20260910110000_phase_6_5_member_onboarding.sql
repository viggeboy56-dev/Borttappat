-- Borttappat! Phase 6.5: school-specific member onboarding.

create extension if not exists pgcrypto with schema extensions;

create table public.school_member_onboarding (
  school_id uuid primary key references public.schools(id) on delete cascade,
  enabled boolean not null default false,
  join_code_hash text check (join_code_hash is null or join_code_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  rotated_at timestamptz
);
alter table public.school_member_onboarding enable row level security;
revoke all on table public.school_member_onboarding from public, anon, authenticated;

create table private.member_join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);
create index member_join_attempts_user_school_time_idx
  on private.member_join_attempts(user_id,school_id,attempted_at desc);
revoke all on table private.member_join_attempts from public, anon, authenticated;

create function public.operator_get_member_onboarding(target_school_id uuid)
returns table(enabled boolean,updated_at timestamptz,rotated_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (select private.is_operator()) then
    raise exception using errcode='42501',message='Operator access required';
  end if;
  if not exists(select 1 from public.schools s where s.id=target_school_id) then
    raise exception using errcode='P0002',message='School not found';
  end if;
  return query
    select coalesce(c.enabled,false),c.updated_at,c.rotated_at
    from public.schools s
    left join public.school_member_onboarding c on c.school_id=s.id
    where s.id=target_school_id;
end;
$$;

create function public.operator_configure_member_onboarding(
  target_school_id uuid,
  onboarding_enabled boolean,
  new_join_code_hash text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare current_hash text;
begin
  if not (select private.is_operator()) then
    raise exception using errcode='42501',message='Operator access required';
  end if;
  if not exists(select 1 from public.schools s where s.id=target_school_id) then
    raise exception using errcode='P0002',message='School not found';
  end if;
  if new_join_code_hash is not null and new_join_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='Invalid join code hash';
  end if;
  select c.join_code_hash into current_hash
    from public.school_member_onboarding c where c.school_id=target_school_id;
  if onboarding_enabled and coalesce(new_join_code_hash,current_hash) is null then
    raise exception using errcode='22023',message='Join code required when enabling';
  end if;
  insert into public.school_member_onboarding(school_id,enabled,join_code_hash,updated_at,rotated_at)
  values(target_school_id,onboarding_enabled,new_join_code_hash,now(),case when new_join_code_hash is null then null else now() end)
  on conflict(school_id) do update set
    enabled=excluded.enabled,
    join_code_hash=coalesce(excluded.join_code_hash,public.school_member_onboarding.join_code_hash),
    updated_at=now(),
    rotated_at=case when excluded.join_code_hash is null then public.school_member_onboarding.rotated_at else now() end;
end;
$$;

create function public.resolve_member_join_school(p_school_slug text)
returns table(school_name text,school_slug text,joining_enabled boolean)
language sql stable security definer set search_path = '' as $$
  select s.name,s.slug,coalesce(c.enabled,false)
  from public.schools s
  left join public.school_member_onboarding c on c.school_id=s.id
  where s.slug=lower(btrim(coalesce(p_school_slug,'')))
$$;

create function public.join_school_as_member(
  p_school_slug text,
  p_join_code text,
  p_member_full_name text
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := (select auth.uid());
  target_school uuid;
  config_hash text;
  normalized_code text;
  supplied_hash text;
  normalized_name text;
  existing_school uuid;
  existing_role public.user_role;
begin
  if actor_id is null then return 'authentication_required'; end if;

  normalized_name := regexp_replace(btrim(coalesce(p_member_full_name,'')),'[[:space:]]+',' ','g');
  if length(normalized_name) not between 2 and 120 then return 'invalid_name'; end if;

  select s.id,c.join_code_hash into target_school,config_hash
  from public.schools s
  join public.school_member_onboarding c on c.school_id=s.id and c.enabled
  where s.slug=lower(btrim(coalesce(p_school_slug,'')));
  if target_school is null or config_hash is null then return 'joining_unavailable'; end if;

  if (select count(*) from private.member_join_attempts a
      where a.user_id=actor_id and a.school_id=target_school and not a.succeeded
        and a.attempted_at>now()-interval '15 minutes') >= 10 then
    return 'rate_limited';
  end if;

  normalized_code := regexp_replace(upper(btrim(coalesce(p_join_code,''))),'[-[:space:]]','','g');
  supplied_hash := encode(extensions.digest(convert_to(normalized_code,'UTF8'),'sha256'),'hex');
  if length(normalized_code) not between 12 and 64 or supplied_hash is distinct from config_hash then
    insert into private.member_join_attempts(user_id,school_id,succeeded) values(actor_id,target_school,false);
    return 'invalid_code';
  end if;

  select p.school_id,p.role into existing_school,existing_role
    from public.profiles p where p.id=actor_id;
  if found then
    insert into private.member_join_attempts(user_id,school_id,succeeded) values(actor_id,target_school,true);
    if existing_school=target_school and existing_role='member' then return 'already_member'; end if;
    if existing_school is distinct from target_school then return 'account_other_school'; end if;
    return 'account_has_school_role';
  end if;

  insert into public.profiles(id,school_id,full_name,role)
  values(actor_id,target_school,normalized_name,'member');
  insert into private.member_join_attempts(user_id,school_id,succeeded) values(actor_id,target_school,true);
  return 'joined';
exception when unique_violation then
  select p.school_id,p.role into existing_school,existing_role from public.profiles p where p.id=actor_id;
  if existing_school=target_school and existing_role='member' then return 'already_member'; end if;
  return 'account_other_school';
end;
$$;

do $$ declare signature text; begin
  foreach signature in array array[
    'public.operator_get_member_onboarding(uuid)',
    'public.operator_configure_member_onboarding(uuid,boolean,text)',
    'public.resolve_member_join_school(text)',
    'public.join_school_as_member(text,text,text)'
  ] loop execute 'revoke all on function '||signature||' from public'; end loop;
end $$;
grant execute on function public.operator_get_member_onboarding(uuid),public.operator_configure_member_onboarding(uuid,boolean,text) to authenticated;
grant execute on function public.resolve_member_join_school(text) to anon,authenticated;
grant execute on function public.join_school_as_member(text,text,text) to authenticated;
