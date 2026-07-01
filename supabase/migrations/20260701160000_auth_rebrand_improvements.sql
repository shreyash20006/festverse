-- Rebranding and authentication improvements
-- 1. Profile extensions
alter table public.profiles
  add column if not exists role public.app_role not null default 'student'::public.app_role,
  add column if not exists student_id uuid references public.students(id) on delete set null,
  add column if not exists verified_at timestamptz;

-- 2. Synchronize profiles.role with public.user_roles
create or replace function public.get_highest_role(uid uuid)
returns public.app_role language plpgsql stable security definer set search_path = public as $$
declare
  highest public.app_role;
begin
  select role into highest
  from public.user_roles
  where user_id = uid
  order by case role
    when 'super_admin' then 1
    when 'college_admin' then 2
    when 'organizer' then 3
    when 'scanner' then 4
    when 'student' then 5
    else 6
  end asc
  limit 1;

  return coalesce(highest, 'student'::public.app_role);
end;
$$;

create or replace function public.sync_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_user uuid;
begin
  if tg_op = 'DELETE' then
    target_user := old.user_id;
  else
    target_user := new.user_id;
  end if;

  update public.profiles
  set role = public.get_highest_role(target_user)
  where id = target_user;

  return null;
end;
$$;

drop trigger if exists trg_sync_profile_role on public.user_roles;
create trigger trg_sync_profile_role
after insert or update or delete on public.user_roles
for each row execute function public.sync_profile_role();

-- Backfill existing profiles role
update public.profiles p
set role = public.get_highest_role(p.id);

-- 3. Redefine RLS policies for profiles table
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "select_profiles" on public.profiles;
drop policy if exists "update_profiles" on public.profiles;
drop policy if exists "insert_profiles" on public.profiles;

create policy "select_profiles" on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin(auth.uid())
    or college_id in (
      select college_id from public.user_roles where user_id = auth.uid()
    )
  );

create policy "update_profiles" on public.profiles for update to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin'
    )
  );

create policy "insert_profiles" on public.profiles for insert to authenticated
  with check (
    id = auth.uid()
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin'
    )
  );

-- 4. Redefine RLS policies for user_roles table
drop policy if exists "Users see their own roles" on public.user_roles;
drop policy if exists "select_user_roles" on public.user_roles;
drop policy if exists "manage_user_roles" on public.user_roles;

create policy "select_user_roles" on public.user_roles for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin'
    )
    or college_id in (
      select college_id from public.user_roles
      where user_id = auth.uid() and role = 'college_admin'
    )
  );

create policy "manage_user_roles" on public.user_roles for all to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin'
    )
    or college_id in (
      select college_id from public.user_roles
      where user_id = auth.uid() and role = 'college_admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin'
    )
    or college_id in (
      select college_id from public.user_roles
      where user_id = auth.uid() and role = 'college_admin'
    )
  );
