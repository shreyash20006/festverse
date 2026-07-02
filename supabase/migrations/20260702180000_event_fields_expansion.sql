-- Migration: 20260702180000_event_fields_expansion.sql
-- Add professional event configuration fields to public.events

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS qr_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS certificate_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS volunteer_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_form_url text,
  ADD COLUMN IF NOT EXISTS rules text,
  ADD COLUMN IF NOT EXISTS what_to_bring text,
  ADD COLUMN IF NOT EXISTS dress_code text;

-- Grant column select permissions to all roles
GRANT SELECT (
  qr_required, certificate_required, volunteer_required,
  google_form_url, rules, what_to_bring, dress_code
) ON public.events TO anon, authenticated;
