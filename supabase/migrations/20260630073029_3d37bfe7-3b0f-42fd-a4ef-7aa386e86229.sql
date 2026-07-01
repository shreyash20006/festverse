
-- Profile extensions for PRN verification linkage
alter table public.profiles
  add column if not exists student_id uuid references public.students(id) on delete set null,
  add column if not exists verified_at timestamptz;

-- Student record now tracks the linked auth user
alter table public.students
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists verified_at timestamptz;

-- One PRN can only be linked to one auth user
create unique index if not exists students_user_id_unique
  on public.students(user_id) where user_id is not null;

-- Support email per college (separate from contact_email for clarity)
alter table public.colleges
  add column if not exists support_email text;

update public.colleges
  set support_email = coalesce(support_email, contact_email, 'support@tgpcop.edu.in')
  where slug = 'tgpcop';

-- RLS: let a signed-in user read their own linked student record (for dashboard/profile fetch)
drop policy if exists "students_select_own_linked" on public.students;
create policy "students_select_own_linked"
  on public.students for select
  to authenticated
  using (user_id = auth.uid());

-- Server-side PRN verification + linking. SECURITY DEFINER so we can search the
-- whitelist without exposing it via RLS, but locked down to authenticated callers.
create or replace function public.verify_and_link_prn(_prn text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _student public.students%rowtype;
  _college uuid;
begin
  if _uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  select id into _college from public.colleges where slug = 'tgpcop' limit 1;

  -- Already linked?
  select * into _student from public.students where user_id = _uid limit 1;
  if found then
    update public.profiles set
      prn = _student.prn,
      full_name = coalesce(nullif(profiles.full_name, ''), _student.full_name),
      department = coalesce(_student.department, profiles.department),
      year_of_study = coalesce(_student.year_of_study, profiles.year_of_study),
      phone = coalesce(profiles.phone, _student.phone),
      college_id = coalesce(_college, profiles.college_id),
      student_id = _student.id,
      verified = true,
      verified_at = coalesce(profiles.verified_at, now())
    where id = _uid;
    return jsonb_build_object('ok', true, 'already', true,
      'student', to_jsonb(_student));
  end if;

  -- Look up by PRN (case-insensitive, trimmed)
  select * into _student from public.students
    where upper(trim(prn)) = upper(trim(_prn))
      and is_active = true
    limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if _student.user_id is not null and _student.user_id <> _uid then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end if;

  -- Link student → auth user
  update public.students
    set user_id = _uid,
        verified_at = now()
    where id = _student.id;

  -- Update profile snapshot
  update public.profiles set
    prn = _student.prn,
    full_name = coalesce(nullif(profiles.full_name, ''), _student.full_name),
    department = coalesce(_student.department, profiles.department),
    year_of_study = coalesce(_student.year_of_study, profiles.year_of_study),
    phone = coalesce(profiles.phone, _student.phone),
    college_id = coalesce(_college, profiles.college_id),
    student_id = _student.id,
    verified = true,
    verified_at = now()
  where id = _uid;

  -- Re-read student
  select * into _student from public.students where id = _student.id;

  return jsonb_build_object('ok', true, 'already', false,
    'student', to_jsonb(_student));
end;
$$;

revoke execute on function public.verify_and_link_prn(text) from public, anon;
grant execute on function public.verify_and_link_prn(text) to authenticated;
