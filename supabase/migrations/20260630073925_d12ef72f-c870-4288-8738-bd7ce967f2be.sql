
DROP POLICY IF EXISTS "Authenticated insert logs" ON public.activity_logs;
REVOKE INSERT ON public.activity_logs FROM authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_owner ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_owner ON auth.users;
DROP FUNCTION IF EXISTS public.grant_super_admin_for_owner() CASCADE;
