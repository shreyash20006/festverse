
create or replace function public.grant_super_admin_for_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) = 'sb108750@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'super_admin')
    on conflict (user_id, role, college_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_grant_owner on auth.users;
create trigger on_auth_user_created_grant_owner
after insert on auth.users
for each row execute function public.grant_super_admin_for_owner();

drop trigger if exists on_auth_user_confirmed_grant_owner on auth.users;
create trigger on_auth_user_confirmed_grant_owner
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.grant_super_admin_for_owner();

insert into public.user_roles (user_id, role)
select id, 'super_admin' from auth.users
where lower(email) = 'sb108750@gmail.com'
on conflict (user_id, role, college_id) do nothing;

delete from public.user_roles
where role = 'super_admin'
  and user_id not in (select id from auth.users where lower(email) = 'sb108750@gmail.com');
