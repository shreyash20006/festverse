
-- 1) Remove overly broad SELECT policies
DROP POLICY IF EXISTS "Authenticated can lookup students by PRN" ON public.students;
DROP POLICY IF EXISTS "Certificates publicly verifiable" ON public.certificates;

-- 2) Public certificate verification: anon-only SECURITY DEFINER RPC returning safe fields
CREATE OR REPLACE FUNCTION public.verify_certificate(_token text)
RETURNS TABLE(full_name text, event_title text, certificate_code text, issued_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.full_name, c.event_title, c.certificate_code, c.issued_at
  FROM public.certificates c
  WHERE c.verification_token = _token
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.verify_certificate(text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon;

-- 3) Lock down verify_and_link_prn: accept user_id, only callable by service_role
DROP FUNCTION IF EXISTS public.verify_and_link_prn(text);

CREATE OR REPLACE FUNCTION public.verify_and_link_prn(_user_id uuid, _prn text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _student public.students%rowtype;
  _college uuid;
begin
  if _user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  select id into _college from public.colleges where slug = 'tgpcop' limit 1;

  select * into _student from public.students where user_id = _user_id limit 1;
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
    where id = _user_id;
    return jsonb_build_object('ok', true, 'already', true, 'student', to_jsonb(_student));
  end if;

  select * into _student from public.students
    where upper(trim(prn)) = upper(trim(_prn))
      and is_active = true
    limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if _student.user_id is not null and _student.user_id <> _user_id then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end if;

  update public.students
    set user_id = _user_id, verified_at = now()
    where id = _student.id;

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
  where id = _user_id;

  select * into _student from public.students where id = _student.id;

  return jsonb_build_object('ok', true, 'already', false, 'student', to_jsonb(_student));
end;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_and_link_prn(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_link_prn(uuid, text) TO service_role;
