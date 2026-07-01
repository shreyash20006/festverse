-- Create Supabase Storage bucket for college assets (logos, banners, media)
-- Run this in your Supabase Dashboard > SQL Editor

-- 1. Create the storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'college-assets',
  'college-assets',
  true,                                          -- Public bucket so logos are accessible via URL
  2097152,                                       -- 2 MB file size limit
  array['image/png','image/jpeg','image/webp','image/svg+xml','image/gif']
)
on conflict (id) do nothing;

-- 2. Allow authenticated college admins to upload their own college's files
create policy "College admins can upload their assets" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'college-assets'
    and (
      -- Super admins can upload anything
      exists (
        select 1 from public.user_roles
        where user_id = auth.uid() and role = 'super_admin'
      )
      -- College admins can upload only to their college's folder
      or (
        exists (
          select 1 from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.role = 'college_admin'
            and name like 'college-logos/' || ur.college_id::text || '/%'
        )
      )
    )
  );

-- 3. Allow authenticated college admins to update (overwrite) their own files
create policy "College admins can update their assets" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'college-assets'
    and (
      exists (
        select 1 from public.user_roles
        where user_id = auth.uid() and role = 'super_admin'
      )
      or (
        exists (
          select 1 from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.role = 'college_admin'
            and name like 'college-logos/' || ur.college_id::text || '/%'
        )
      )
    )
  );

-- 4. Everyone can read (view) public assets
create policy "Public can view college assets" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'college-assets');

-- 5. Add website column to colleges table if not already present
alter table public.colleges
  add column if not exists website text,
  add column if not exists banner_url text;

-- NOTE: logo_url, primary_color, contact_email, contact_phone, address already exist.
