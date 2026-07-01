-- Add media/branding columns to colleges table
alter table public.colleges
  add column if not exists favicon_url text,
  add column if not exists header_media_url text,
  add column if not exists header_media_type text default 'image' check (header_media_type in ('image','video')),
  add column if not exists footer_media_url text,
  add column if not exists footer_media_type text default 'image' check (footer_media_type in ('image','video')),
  add column if not exists og_image_url text,
  add column if not exists tagline text;

-- Expand storage bucket allowed types to include video
update storage.buckets
set allowed_mime_types = array[
  'image/png','image/jpeg','image/webp','image/svg+xml','image/gif','image/ico',
  'video/mp4','video/webm','video/ogg'
],
file_size_limit = 52428800  -- 50 MB for video support
where id = 'college-assets';
