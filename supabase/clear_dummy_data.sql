-- TRUNCATE / DELETE ALL DUMMY DATA SAFELY (Resilient to missing tables)

DO $$
BEGIN
  -- 1. Attendance Check-ins
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance') THEN
    EXECUTE 'TRUNCATE TABLE public.attendance CASCADE';
  END IF;

  -- 2. QR Tickets
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tickets') THEN
    EXECUTE 'TRUNCATE TABLE public.tickets CASCADE';
  END IF;

  -- 3. Registrations
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'registrations') THEN
    EXECUTE 'TRUNCATE TABLE public.registrations CASCADE';
  END IF;

  -- 4. Payments
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    EXECUTE 'TRUNCATE TABLE public.payments CASCADE';
  END IF;

  -- 5. Webhooks & Settlements
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_webhooks') THEN
    EXECUTE 'TRUNCATE TABLE public.payment_webhooks CASCADE';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'settlements') THEN
    EXECUTE 'TRUNCATE TABLE public.settlements CASCADE';
  END IF;

  -- 6. Google Forms
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'google_forms') THEN
    EXECUTE 'TRUNCATE TABLE public.google_forms CASCADE';
  END IF;

  -- 7. Events
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
    EXECUTE 'TRUNCATE TABLE public.events CASCADE';
  END IF;

  -- 8. Students PRN whitelist
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
    EXECUTE 'TRUNCATE TABLE public.students CASCADE';
  END IF;

  -- 9. Subscriptions
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
    EXECUTE 'TRUNCATE TABLE public.subscriptions CASCADE';
  END IF;

  -- 10. Payment settings
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'college_payment_settings') THEN
    EXECUTE 'TRUNCATE TABLE public.college_payment_settings CASCADE';
  END IF;

  -- 11. User Roles (Keep Super Admin)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
    EXECUTE 'DELETE FROM public.user_roles WHERE role != ''super_admin''';
  END IF;

  -- 12. Profiles (Keep Super Admin profile)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') AND 
     EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
    EXECUTE 'DELETE FROM public.profiles WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE role = ''super_admin'')';
  END IF;

  -- 13. Colleges (Keep tgpcop baseline)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'colleges') THEN
    EXECUTE 'DELETE FROM public.colleges WHERE slug != ''tgpcop''';
  END IF;
END $$;
