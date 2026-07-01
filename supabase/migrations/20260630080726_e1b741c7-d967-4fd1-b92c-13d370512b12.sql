
-- Replace the view-based approach with column-level GRANTs on colleges.
DROP VIEW IF EXISTS public.colleges_public;

-- Anon-readable policy (RLS) — columns are gated by GRANTs below.
DROP POLICY IF EXISTS "Colleges public read for anon" ON public.colleges;
CREATE POLICY "Colleges public read for anon"
  ON public.colleges FOR SELECT
  TO anon
  USING (is_active = true);

-- Restrict anon to safe columns only. contact_email, support_email,
-- contact_phone, and address are NOT granted to anon.
REVOKE SELECT ON public.colleges FROM anon;
GRANT SELECT (
  id, slug, name, short_name, logo_url, primary_color,
  payment_mode, is_active, created_at, updated_at
) ON public.colleges TO anon;
