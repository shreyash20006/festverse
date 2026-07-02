-- Fix: All broken mutations in FestVerse admin
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════
-- 1. FIX: Colleges — allow super_admin to INSERT/UPDATE/DELETE
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Super admins manage colleges" ON public.colleges;
CREATE POLICY "Super admins manage colleges"
  ON public.colleges FOR ALL
  TO authenticated
  USING (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'super_admin')
  )
  WITH CHECK (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'super_admin')
  );

-- Allow college admins to UPDATE their own college
DROP POLICY IF EXISTS "College admins update own college" ON public.colleges;
CREATE POLICY "College admins update own college"
  ON public.colleges FOR UPDATE
  TO authenticated
  USING (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.college_id = colleges.id
        and ur.role = 'college_admin'
    )
  )
  WITH CHECK (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.college_id = colleges.id
        and ur.role = 'college_admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 2. FIX: subscriptions — allow super_admin to INSERT
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Super admins manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Super admins manage subscriptions"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'super_admin')
  )
  WITH CHECK (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'super_admin')
  );

-- ═══════════════════════════════════════════════════════════════
-- 3. FIX: events — ensure admins can INSERT
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
CREATE POLICY "Admins can insert events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.college_id = events.college_id
        and ur.role in ('super_admin', 'college_admin', 'organizer')
    )
  );

DROP POLICY IF EXISTS "Admins can update events" ON public.events;
CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.college_id = events.college_id
        and ur.role in ('super_admin', 'college_admin', 'organizer')
    )
  );

DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  TO authenticated
  USING (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.college_id = events.college_id
        and ur.role in ('super_admin', 'college_admin', 'organizer')
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 4. FIX: event_pricing — replace the broken RLS policy
-- The old policy joins via events.college_id but the event may not
-- be visible yet at policy check time when inserting.
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins manage event pricing" ON public.event_pricing;
CREATE POLICY "Admins manage event pricing"
  ON public.event_pricing FOR ALL
  TO authenticated
  USING (
    exists (
      select 1 from public.events e
      join public.user_roles ur on ur.college_id = e.college_id
      where e.id = event_pricing.event_id
        and ur.user_id = auth.uid()
        and ur.role in ('super_admin', 'college_admin', 'organizer')
    )
  )
  WITH CHECK (
    exists (
      select 1 from public.events e
      join public.user_roles ur on ur.college_id = e.college_id
      where e.id = event_pricing.event_id
        and ur.user_id = auth.uid()
        and ur.role in ('super_admin', 'college_admin', 'organizer')
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 5. FIX: user_roles — allow authenticated users to INSERT their
-- own role assignment (needed for createCollegeTenant)
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can self-assign college_admin role" ON public.user_roles;
CREATE POLICY "Users can self-assign college_admin role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'college_admin');

-- ═══════════════════════════════════════════════════════════════
-- 6. FIX: notices — allow admins to INSERT
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Admins manage notices" ON public.notices;
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='notices') THEN
    CREATE POLICY "Admins manage notices"
      ON public.notices FOR ALL
      TO authenticated
      USING (
        exists (
          select 1 from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.college_id = notices.college_id
            and ur.role in ('super_admin', 'college_admin', 'organizer')
        )
      )
      WITH CHECK (
        exists (
          select 1 from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.college_id = notices.college_id
            and ur.role in ('super_admin', 'college_admin', 'organizer')
        )
      );
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7. FIX: college_payment_settings — allow college_admin to upsert
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "College admins manage payment settings" ON public.college_payment_settings;
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='college_payment_settings') THEN
    CREATE POLICY "College admins manage payment settings"
      ON public.college_payment_settings FOR ALL
      TO authenticated
      USING (
        exists (
          select 1 from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.college_id = college_payment_settings.college_id
            and ur.role in ('super_admin', 'college_admin')
        )
      )
      WITH CHECK (
        exists (
          select 1 from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.college_id = college_payment_settings.college_id
            and ur.role in ('super_admin', 'college_admin')
        )
      );
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 8. FIX: grant anon column access for new media columns
-- ═══════════════════════════════════════════════════════════════

GRANT SELECT (
  id, slug, name, short_name, logo_url, favicon_url, primary_color,
  payment_mode, is_active, created_at, updated_at,
  header_media_url, header_media_type,
  footer_media_url, footer_media_type,
  og_image_url, tagline, website, banner_url
) ON public.colleges TO anon;
