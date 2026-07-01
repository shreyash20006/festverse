-- TRUNCATE / DELETE ALL DUMMY DATA WHILE PRESERVING TABLES AND SUPER ADMIN

-- 1. Attendance Check-ins
truncate table public.attendance cascade;

-- 2. QR Tickets
truncate table public.tickets cascade;

-- 3. Registrations
truncate table public.registrations cascade;

-- 4. Payment logs & webhook audits
truncate table public.payments cascade;
truncate table public.payment_webhooks cascade;
truncate table public.settlements cascade;

-- 5. Google forms integrations
truncate table public.google_forms cascade;

-- 6. Events
truncate table public.events cascade;

-- 7. Whitelisted Students (PRN registry)
truncate table public.students cascade;

-- 8. Subscriptions & Payment settings
truncate table public.subscriptions cascade;
truncate table public.college_payment_settings cascade;

-- 9. Delete non-admin user roles (Keep the Super Admin)
delete from public.user_roles 
where role != 'super_admin';

-- 10. Delete non-admin profiles (Keep Super Admin profile)
delete from public.profiles 
where id not in (
  select user_id from public.user_roles where role = 'super_admin'
);

-- 11. Delete all colleges except the baseline default seed 'tgpcop'
delete from public.colleges 
where slug != 'tgpcop';
