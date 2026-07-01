
-- 1) SECURITY DEFINER functions: revoke broad EXECUTE, grant only to roles that need it
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_and_link_prn(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_certificate(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_link_prn(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- 2) Restrict colleges contact fields to authenticated users
DROP POLICY IF EXISTS "Colleges are publicly viewable" ON public.colleges;
DROP POLICY IF EXISTS "Colleges public columns are viewable" ON public.colleges;
DROP POLICY IF EXISTS "Colleges public read for anon" ON public.colleges;

CREATE POLICY "Colleges viewable by authenticated users"
  ON public.colleges FOR SELECT
  TO authenticated
  USING (true);

-- Safe public view (no contact_email, support_email, contact_phone, address).
-- Runs with view-owner privileges so anon can read it without direct table access.
DROP VIEW IF EXISTS public.colleges_public;
CREATE VIEW public.colleges_public AS
SELECT
  id, slug, name, short_name, logo_url,
  primary_color, payment_mode, is_active,
  created_at, updated_at
FROM public.colleges
WHERE is_active = true;

GRANT SELECT ON public.colleges_public TO anon, authenticated;

-- 3) Allow public read of event banner images
DROP POLICY IF EXISTS "Public can read event banners" ON storage.objects;
CREATE POLICY "Public can read event banners"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'event-banners');
