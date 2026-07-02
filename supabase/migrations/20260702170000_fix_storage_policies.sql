-- Fix storage policies for college-assets bucket
-- Run this in your Supabase Dashboard > SQL Editor

-- 1. Drop existing policies to avoid conflicts
drop policy if exists "College admins can upload their assets" on storage.objects;
drop policy if exists "College admins can update their assets" on storage.objects;

-- 2. Allow college admins to insert assets into any of the college folders (logos, favicons, media, seo)
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
      -- College admins can upload to their college's folder in any permitted media type
      or (
        exists (
          select 1 from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.role = 'college_admin'
            and (
              name like 'college-logos/' || ur.college_id::text || '/%'
              or name like 'college-favicons/' || ur.college_id::text || '/%'
              or name like 'college-media/' || ur.college_id::text || '/%'
              or name like 'college-seo/' || ur.college_id::text || '/%'
            )
        )
      )
    )
  );

-- 3. Allow college admins to update assets in any of their college folders
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
            and (
              name like 'college-logos/' || ur.college_id::text || '/%'
              or name like 'college-favicons/' || ur.college_id::text || '/%'
              or name like 'college-media/' || ur.college_id::text || '/%'
              or name like 'college-seo/' || ur.college_id::text || '/%'
            )
        )
      )
    )
  );

-- 4. Create event-banners bucket if not exists
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-banners',
  'event-banners',
  true,
  5242880, -- 5 MB limit
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do nothing;
