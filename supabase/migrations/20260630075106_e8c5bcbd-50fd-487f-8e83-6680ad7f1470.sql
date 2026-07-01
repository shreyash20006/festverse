
-- Admins/organizers manage event banner files
CREATE POLICY "Admins manage event-banners"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'event-banners' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'event-banners' AND public.is_admin(auth.uid()));

-- Authenticated users can read banner objects (public viewers see them via signed URLs)
CREATE POLICY "Authenticated read event-banners"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'event-banners');
