-- Migration: 20260702190000_fix_events_rls_super_admin.sql
-- Fix events RLS policies to correctly allow global super_admins to insert, update and delete events

DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
CREATE POLICY "Admins can insert events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and (ur.role = 'super_admin' OR (ur.college_id = events.college_id and ur.role in ('college_admin', 'organizer')))
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
        and (ur.role = 'super_admin' OR (ur.college_id = events.college_id and ur.role in ('college_admin', 'organizer')))
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
        and (ur.role = 'super_admin' OR (ur.college_id = events.college_id and ur.role in ('college_admin', 'organizer')))
    )
  );
