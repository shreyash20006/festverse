-- ==================================================================
-- FestVerse Complete Database Schema (All Migrations Consolidated)
-- ==================================================================

-- ==========================================
-- MIGRATION: 20260630065611_2e413ae9-24fa-40ee-9f38-0f430a7fd313.sql
-- ==========================================


-- ============ EXTENSIONS ============
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ============ ENUMS ============
create type public.app_role as enum ('super_admin','college_admin','organizer','scanner','student');
create type public.event_status as enum ('draft','published','cancelled','completed');
create type public.event_category as enum ('technical','cultural','sports','workshop','placement','pharmacy','seminar','other');
create type public.registration_status as enum ('pending_payment','confirmed','cancelled','refunded');
create type public.payment_status as enum ('created','pending','success','failed','refunded');
create type public.ticket_status as enum ('active','used','cancelled');
create type public.payment_mode as enum ('platform','college');

-- ============ UTIL: updated_at trigger ============
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ============ COLLEGES ============
create table public.colleges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text,
  logo_url text,
  primary_color text,
  contact_email text,
  contact_phone text,
  address text,
  payment_mode public.payment_mode not null default 'platform',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.colleges to anon, authenticated;
grant all on public.colleges to service_role;
alter table public.colleges enable row level security;
create policy "Colleges are publicly viewable" on public.colleges for select using (is_active = true);
create trigger trg_colleges_updated before update on public.colleges for each row execute function public.tg_set_updated_at();

-- Seed TGPCOP
insert into public.colleges (slug, name, short_name, contact_email)
values ('tgpcop','TGPCOP','TGPCOP','admin@tgpcop.edu') on conflict (slug) do nothing;

-- ============ PROFILES (auth users) ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  college_id uuid references public.colleges(id) on delete set null,
  department text,
  prn text,
  year_of_study int,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_college on public.profiles(college_id);
create index idx_profiles_prn on public.profiles(prn);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.tg_set_updated_at();

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare default_college uuid;
begin
  select id into default_college from public.colleges where slug = 'tgpcop' limit 1;
  insert into public.profiles (id, email, full_name, avatar_url, college_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url',
    default_college
  ) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  college_id uuid references public.colleges(id) on delete cascade,
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (user_id, role, college_id)
);
create index idx_user_roles_user on public.user_roles(user_id);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users see their own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role in ('super_admin','college_admin','organizer')
  )
$$;

-- ============ STUDENTS (PRN WHITELIST) ============
create table public.students (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  prn text not null,
  full_name text not null,
  email text,
  phone text,
  department text,
  year_of_study int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, prn)
);
create index idx_students_prn on public.students(prn);
grant select on public.students to authenticated;
grant all on public.students to service_role;
alter table public.students enable row level security;
create policy "Authenticated can lookup students by PRN" on public.students for select to authenticated using (true);
create trigger trg_students_updated before update on public.students for each row execute function public.tg_set_updated_at();

-- ============ EVENTS ============
create table public.events (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  short_description text,
  category public.event_category not null default 'other',
  banner_url text,
  gallery jsonb default '[]'::jsonb,
  venue text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  capacity int,
  price_inr numeric(10,2) not null default 0,
  is_paid boolean not null default false,
  organizer_name text,
  organizer_contact text,
  organizer_user_id uuid references auth.users(id),
  speakers jsonb default '[]'::jsonb,
  sponsors jsonb default '[]'::jsonb,
  custom_fields jsonb default '[]'::jsonb,
  tags text[] default array[]::text[],
  status public.event_status not null default 'draft',
  featured boolean not null default false,
  trending_score numeric not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, slug)
);
create index idx_events_college on public.events(college_id);
create index idx_events_status on public.events(status);
create index idx_events_start on public.events(start_at);
create index idx_events_category on public.events(category);
create index idx_events_featured on public.events(featured) where featured = true;
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;
create policy "Published events are public" on public.events for select using (status = 'published' or status = 'completed');
create policy "Admins see all events" on public.events for select to authenticated using (public.is_admin(auth.uid()));
create policy "Admins manage events" on public.events for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create trigger trg_events_updated before update on public.events for each row execute function public.tg_set_updated_at();

-- ============ REGISTRATIONS ============
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid references public.students(id),
  prn text,
  full_name text not null,
  email text not null,
  phone text,
  department text,
  custom_responses jsonb default '{}'::jsonb,
  status public.registration_status not null default 'confirmed',
  amount_paid numeric(10,2) not null default 0,
  payment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index idx_reg_event on public.registrations(event_id);
create index idx_reg_user on public.registrations(user_id);
grant select, insert, update on public.registrations to authenticated;
grant all on public.registrations to service_role;
alter table public.registrations enable row level security;
create policy "Users see own registrations" on public.registrations for select to authenticated using (auth.uid() = user_id);
create policy "Users register themselves" on public.registrations for insert to authenticated with check (auth.uid() = user_id);
create policy "Admins see all registrations" on public.registrations for select to authenticated using (public.is_admin(auth.uid()));
create policy "Admins manage registrations" on public.registrations for update to authenticated using (public.is_admin(auth.uid()));
create trigger trg_reg_updated before update on public.registrations for each row execute function public.tg_set_updated_at();

-- ============ TICKETS ============
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ticket_code text not null unique,
  qr_token text not null unique,
  status public.ticket_status not null default 'active',
  issued_at timestamptz not null default now(),
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index idx_tickets_event on public.tickets(event_id);
create index idx_tickets_user on public.tickets(user_id);
grant select on public.tickets to authenticated;
grant all on public.tickets to service_role;
alter table public.tickets enable row level security;
create policy "Users see own tickets" on public.tickets for select to authenticated using (auth.uid() = user_id);
create policy "Admins see all tickets" on public.tickets for select to authenticated using (public.is_admin(auth.uid()));
create policy "Admins update tickets" on public.tickets for update to authenticated using (public.is_admin(auth.uid()));

-- ============ ATTENDANCE ============
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  scanned_by uuid references auth.users(id),
  scan_method text default 'qr',
  scanned_at timestamptz not null default now(),
  device_info text
);
create index idx_attendance_event on public.attendance(event_id);
create index idx_attendance_ticket on public.attendance(ticket_id);
grant select, insert on public.attendance to authenticated;
grant all on public.attendance to service_role;
alter table public.attendance enable row level security;
create policy "Users see own attendance" on public.attendance for select to authenticated using (auth.uid() = user_id);
create policy "Admins see all attendance" on public.attendance for select to authenticated using (public.is_admin(auth.uid()));
create policy "Admins insert attendance" on public.attendance for insert to authenticated with check (public.is_admin(auth.uid()));

-- ============ PAYMENT PROVIDERS ============
create table public.payment_providers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  is_enabled boolean not null default true,
  supports_subscription boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.payment_providers to authenticated;
grant all on public.payment_providers to service_role;
alter table public.payment_providers enable row level security;
create policy "Providers readable by authenticated" on public.payment_providers for select to authenticated using (true);

insert into public.payment_providers (code, display_name) values
  ('razorpay','Razorpay'),
  ('cashfree','Cashfree')
on conflict (code) do nothing;

-- ============ COLLEGE PAYMENT SETTINGS ============
create table public.college_payment_settings (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  provider_code text not null references public.payment_providers(code),
  mode public.payment_mode not null default 'platform',
  is_active boolean not null default true,
  -- secrets stored encrypted via vault in production. For now only key_id (public) stored here.
  key_id text,
  config jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, provider_code)
);
grant all on public.college_payment_settings to service_role;
alter table public.college_payment_settings enable row level security;
create policy "Admins read college payment settings" on public.college_payment_settings for select to authenticated using (public.is_admin(auth.uid()));
create policy "Admins write college payment settings" on public.college_payment_settings for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create trigger trg_cps_updated before update on public.college_payment_settings for each row execute function public.tg_set_updated_at();

-- ============ PAYMENTS ============
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references public.registrations(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  user_id uuid not null references auth.users(id),
  college_id uuid references public.colleges(id),
  provider_code text references public.payment_providers(code),
  provider_order_id text,
  provider_payment_id text,
  provider_signature text,
  amount_inr numeric(10,2) not null,
  currency text not null default 'INR',
  status public.payment_status not null default 'created',
  raw_response jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_payments_user on public.payments(user_id);
create index idx_payments_event on public.payments(event_id);
create index idx_payments_status on public.payments(status);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "Users see own payments" on public.payments for select to authenticated using (auth.uid() = user_id);
create policy "Admins see all payments" on public.payments for select to authenticated using (public.is_admin(auth.uid()));
create trigger trg_payments_updated before update on public.payments for each row execute function public.tg_set_updated_at();

-- ============ PAYMENT WEBHOOKS (audit log) ============
create table public.payment_webhooks (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null,
  event_type text,
  payment_id uuid references public.payments(id) on delete set null,
  signature_valid boolean not null default false,
  payload jsonb not null,
  processed boolean not null default false,
  error text,
  received_at timestamptz not null default now()
);
grant all on public.payment_webhooks to service_role;
alter table public.payment_webhooks enable row level security;
create policy "Admins read webhooks" on public.payment_webhooks for select to authenticated using (public.is_admin(auth.uid()));

-- ============ SETTLEMENTS ============
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  college_id uuid references public.colleges(id),
  provider_code text references public.payment_providers(code),
  provider_settlement_id text,
  amount_inr numeric(12,2) not null,
  fees_inr numeric(12,2) default 0,
  tax_inr numeric(12,2) default 0,
  status text not null default 'pending',
  settled_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now()
);
grant all on public.settlements to service_role;
alter table public.settlements enable row level security;
create policy "Admins read settlements" on public.settlements for select to authenticated using (public.is_admin(auth.uid()));

-- ============ CERTIFICATES ============
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete set null,
  certificate_code text not null unique,
  verification_token text not null unique,
  full_name text not null,
  event_title text not null,
  issued_at timestamptz not null default now(),
  pdf_url text
);
create index idx_cert_user on public.certificates(user_id);
create index idx_cert_event on public.certificates(event_id);
grant select on public.certificates to anon, authenticated;
grant all on public.certificates to service_role;
alter table public.certificates enable row level security;
create policy "Certificates publicly verifiable" on public.certificates for select using (true);

-- ============ NOTIFICATIONS ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notif_user on public.notifications(user_id, read);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "Users see own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications for update to authenticated using (auth.uid() = user_id);

-- ============ ACTIVITY LOGS ============
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_logs_user on public.activity_logs(user_id);
create index idx_logs_entity on public.activity_logs(entity_type, entity_id);
grant insert on public.activity_logs to authenticated;
grant all on public.activity_logs to service_role;
alter table public.activity_logs enable row level security;
create policy "Admins read logs" on public.activity_logs for select to authenticated using (public.is_admin(auth.uid()));
create policy "Authenticated insert logs" on public.activity_logs for insert to authenticated with check (auth.uid() = user_id);


-- ==========================================
-- MIGRATION: 20260630065642_231f69a7-1dd8-490a-bd3f-8f3db6df5784.sql
-- ==========================================


-- Add stable search_path to remaining function
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end $$;

-- Lock down security-definer helpers: only authenticated users can call them
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_admin(uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;


-- ==========================================
-- MIGRATION: 20260630071927_b08732ae-8ec4-40bf-aafe-3acedcb13c70.sql
-- ==========================================


create or replace function public.grant_super_admin_for_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) = 'sb108750@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'super_admin')
    on conflict (user_id, role, college_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_grant_owner on auth.users;
create trigger on_auth_user_created_grant_owner
after insert on auth.users
for each row execute function public.grant_super_admin_for_owner();

drop trigger if exists on_auth_user_confirmed_grant_owner on auth.users;
create trigger on_auth_user_confirmed_grant_owner
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.grant_super_admin_for_owner();

insert into public.user_roles (user_id, role)
select id, 'super_admin' from auth.users
where lower(email) = 'sb108750@gmail.com'
on conflict (user_id, role, college_id) do nothing;

delete from public.user_roles
where role = 'super_admin'
  and user_id not in (select id from auth.users where lower(email) = 'sb108750@gmail.com');


-- ==========================================
-- MIGRATION: 20260630071948_9e1b91e2-5347-489f-bfcd-a30a78945b54.sql
-- ==========================================

revoke execute on function public.grant_super_admin_for_owner() from public, anon, authenticated;


-- ==========================================
-- MIGRATION: 20260630073029_3d37bfe7-3b0f-42fd-a4ef-7aa386e86229.sql
-- ==========================================


-- Profile extensions for PRN verification linkage
alter table public.profiles
  add column if not exists student_id uuid references public.students(id) on delete set null,
  add column if not exists verified_at timestamptz;

-- Student record now tracks the linked auth user
alter table public.students
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists verified_at timestamptz;

-- One PRN can only be linked to one auth user
create unique index if not exists students_user_id_unique
  on public.students(user_id) where user_id is not null;

-- Support email per college (separate from contact_email for clarity)
alter table public.colleges
  add column if not exists support_email text;

update public.colleges
  set support_email = coalesce(support_email, contact_email, 'support@tgpcop.edu.in')
  where slug = 'tgpcop';

-- RLS: let a signed-in user read their own linked student record (for dashboard/profile fetch)
drop policy if exists "students_select_own_linked" on public.students;
create policy "students_select_own_linked"
  on public.students for select
  to authenticated
  using (user_id = auth.uid());

-- Server-side PRN verification + linking. SECURITY DEFINER so we can search the
-- whitelist without exposing it via RLS, but locked down to authenticated callers.
create or replace function public.verify_and_link_prn(_prn text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _student public.students%rowtype;
  _college uuid;
begin
  if _uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  select id into _college from public.colleges where slug = 'tgpcop' limit 1;

  -- Already linked?
  select * into _student from public.students where user_id = _uid limit 1;
  if found then
    update public.profiles set
      prn = _student.prn,
      full_name = coalesce(nullif(profiles.full_name, ''), _student.full_name),
      department = coalesce(_student.department, profiles.department),
      year_of_study = coalesce(_student.year_of_study, profiles.year_of_study),
      phone = coalesce(profiles.phone, _student.phone),
      college_id = coalesce(_college, profiles.college_id),
      student_id = _student.id,
      verified = true,
      verified_at = coalesce(profiles.verified_at, now())
    where id = _uid;
    return jsonb_build_object('ok', true, 'already', true,
      'student', to_jsonb(_student));
  end if;

  -- Look up by PRN (case-insensitive, trimmed)
  select * into _student from public.students
    where upper(trim(prn)) = upper(trim(_prn))
      and is_active = true
    limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if _student.user_id is not null and _student.user_id <> _uid then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end if;

  -- Link student â†’ auth user
  update public.students
    set user_id = _uid,
        verified_at = now()
    where id = _student.id;

  -- Update profile snapshot
  update public.profiles set
    prn = _student.prn,
    full_name = coalesce(nullif(profiles.full_name, ''), _student.full_name),
    department = coalesce(_student.department, profiles.department),
    year_of_study = coalesce(_student.year_of_study, profiles.year_of_study),
    phone = coalesce(profiles.phone, _student.phone),
    college_id = coalesce(_college, profiles.college_id),
    student_id = _student.id,
    verified = true,
    verified_at = now()
  where id = _uid;

  -- Re-read student
  select * into _student from public.students where id = _student.id;

  return jsonb_build_object('ok', true, 'already', false,
    'student', to_jsonb(_student));
end;
$$;

revoke execute on function public.verify_and_link_prn(text) from public, anon;
grant execute on function public.verify_and_link_prn(text) to authenticated;


-- ==========================================
-- MIGRATION: 20260630073614_9b0678f4-e037-4aed-ae16-15377b2fb94e.sql
-- ==========================================


-- 1) Remove overly broad SELECT policies
DROP POLICY IF EXISTS "Authenticated can lookup students by PRN" ON public.students;
DROP POLICY IF EXISTS "Certificates publicly verifiable" ON public.certificates;

-- 2) Public certificate verification: anon-only SECURITY DEFINER RPC returning safe fields
CREATE OR REPLACE FUNCTION public.verify_certificate(_token text)
RETURNS TABLE(full_name text, event_title text, certificate_code text, issued_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.full_name, c.event_title, c.certificate_code, c.issued_at
  FROM public.certificates c
  WHERE c.verification_token = _token
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.verify_certificate(text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon;

-- 3) Lock down verify_and_link_prn: accept user_id, only callable by service_role
DROP FUNCTION IF EXISTS public.verify_and_link_prn(text);

CREATE OR REPLACE FUNCTION public.verify_and_link_prn(_user_id uuid, _prn text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _student public.students%rowtype;
  _college uuid;
begin
  if _user_id is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  select id into _college from public.colleges where slug = 'tgpcop' limit 1;

  select * into _student from public.students where user_id = _user_id limit 1;
  if found then
    update public.profiles set
      prn = _student.prn,
      full_name = coalesce(nullif(profiles.full_name, ''), _student.full_name),
      department = coalesce(_student.department, profiles.department),
      year_of_study = coalesce(_student.year_of_study, profiles.year_of_study),
      phone = coalesce(profiles.phone, _student.phone),
      college_id = coalesce(_college, profiles.college_id),
      student_id = _student.id,
      verified = true,
      verified_at = coalesce(profiles.verified_at, now())
    where id = _user_id;
    return jsonb_build_object('ok', true, 'already', true, 'student', to_jsonb(_student));
  end if;

  select * into _student from public.students
    where upper(trim(prn)) = upper(trim(_prn))
      and is_active = true
    limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if _student.user_id is not null and _student.user_id <> _user_id then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end if;

  update public.students
    set user_id = _user_id, verified_at = now()
    where id = _student.id;

  update public.profiles set
    prn = _student.prn,
    full_name = coalesce(nullif(profiles.full_name, ''), _student.full_name),
    department = coalesce(_student.department, profiles.department),
    year_of_study = coalesce(_student.year_of_study, profiles.year_of_study),
    phone = coalesce(profiles.phone, _student.phone),
    college_id = coalesce(_college, profiles.college_id),
    student_id = _student.id,
    verified = true,
    verified_at = now()
  where id = _user_id;

  select * into _student from public.students where id = _student.id;

  return jsonb_build_object('ok', true, 'already', false, 'student', to_jsonb(_student));
end;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_and_link_prn(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_link_prn(uuid, text) TO service_role;


-- ==========================================
-- MIGRATION: 20260630073925_d12ef72f-c870-4288-8738-bd7ce967f2be.sql
-- ==========================================


DROP POLICY IF EXISTS "Authenticated insert logs" ON public.activity_logs;
REVOKE INSERT ON public.activity_logs FROM authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_owner ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed_grant_owner ON auth.users;
DROP FUNCTION IF EXISTS public.grant_super_admin_for_owner() CASCADE;


-- ==========================================
-- MIGRATION: 20260630075106_e8c5bcbd-50fd-487f-8e83-6680ad7f1470.sql
-- ==========================================


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


-- ==========================================
-- MIGRATION: 20260630080649_0bed87e3-7f58-4df2-b4a1-ffeca90dc7da.sql
-- ==========================================


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


-- ==========================================
-- MIGRATION: 20260630080726_e1b741c7-d967-4fd1-b92c-13d370512b12.sql
-- ==========================================


-- Replace the view-based approach with column-level GRANTs on colleges.
DROP VIEW IF EXISTS public.colleges_public;

-- Anon-readable policy (RLS) â€” columns are gated by GRANTs below.
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


-- ==========================================
-- MIGRATION: 20260630081302_24b9ef66-453b-4b24-ae19-645d9655d213.sql
-- ==========================================

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.events; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.certificates; EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;

ALTER TABLE public.registrations REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER TABLE public.tickets REPLICA IDENTITY FULL;
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER TABLE public.certificates REPLICA IDENTITY FULL;


-- ==========================================
-- MIGRATION: 20260701120000_add_teams.sql
-- ==========================================

-- ============ UPDATE EVENTS TABLE ============
alter table public.events 
  add column is_team_event boolean not null default false,
  add column min_team_size int not null default 1,
  add column max_team_size int not null default 1;

-- ============ CREATE TEAMS TABLE ============
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  leader_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_teams_event on public.teams(event_id);
create index idx_teams_leader on public.teams(leader_id);

-- RLS
alter table public.teams enable row level security;

create policy "Teams are viewable by authenticated users" 
  on public.teams for select to authenticated using (true);

create policy "Team leaders can create teams" 
  on public.teams for insert to authenticated with check (auth.uid() = leader_id);

create policy "Team leaders can update their teams" 
  on public.teams for update to authenticated using (auth.uid() = leader_id);

-- Trigger for updated_at
create trigger trg_teams_updated before update on public.teams 
  for each row execute function public.tg_set_updated_at();

-- ============ UPDATE REGISTRATIONS TABLE ============
alter table public.registrations 
  add column team_id uuid references public.teams(id) on delete cascade,
  add column team_role text check (team_role in ('leader', 'member')),
  add constraint unique_event_student unique (event_id, student_id);

-- Index for team_id
create index idx_reg_team on public.registrations(team_id);


-- ==========================================
-- MIGRATION: 20260701130000_saas_upgrades.sql
-- ==========================================

-- ============ CREATE SUBSCRIPTIONS TABLE ============
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  plan_name text not null default 'free', -- 'free', 'basic', 'premium', 'enterprise'
  status text not null default 'active', -- 'active', 'suspended', 'expired'
  billing_cycle text not null default 'monthly', -- 'monthly', 'yearly'
  amount_paid numeric(10,2) not null default 0,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id)
);

-- RLS for subscriptions
alter table public.subscriptions enable row level security;

create policy "Subscriptions are readable by admins"
  on public.subscriptions for select to authenticated
  using (public.is_admin(auth.uid()));

create policy "Super admins can manage subscriptions"
  on public.subscriptions for all to authenticated
  using (exists (
    select 1 from public.user_roles 
    where user_id = auth.uid() and role = 'super_admin'
  ));

-- Update trigger
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.tg_set_updated_at();

-- ============ CREATE GOOGLE FORMS TABLE ============
create table if not exists public.google_forms (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade unique,
  form_url text not null,
  is_linked boolean not null default true,
  import_responses_count int not null default 0,
  config jsonb default '{}'::jsonb, -- dynamic field mappings
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for google_forms
alter table public.google_forms enable row level security;

create policy "Google forms viewable by event managers"
  on public.google_forms for select to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = google_forms.event_id 
        and (e.created_by = auth.uid() or public.is_admin(auth.uid()))
    )
  );

create policy "Event managers can manage google forms"
  on public.google_forms for all to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = google_forms.event_id 
        and (e.created_by = auth.uid() or public.is_admin(auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = google_forms.event_id 
        and (e.created_by = auth.uid() or public.is_admin(auth.uid()))
    )
  );

-- Update trigger
create trigger trg_google_forms_updated before update on public.google_forms
  for each row execute function public.tg_set_updated_at();


-- ============ CREATE NOTICES TABLE ============
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  title text not null,
  content text not null,
  target_audience text not null default 'all', -- 'all', 'students', 'organizers'
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_notices_college on public.notices(college_id);

-- RLS for notices
alter table public.notices enable row level security;

create policy "Notices are readable by authenticated users"
  on public.notices for select to authenticated
  using (true);

create policy "Admins can manage notices"
  on public.notices for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Trigger for updated_at
create trigger trg_notices_updated before update on public.notices
  for each row execute function public.tg_set_updated_at();

grant select on public.notices to authenticated;
grant all on public.notices to service_role;


-- ============ CREATE VOLUNTEERS TABLE ============
create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  role text not null, -- 'coordinator', 'scanner', 'usher', 'general'
  status text not null default 'pending', -- 'pending', 'approved', 'rejected'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id)
);

-- Indexes
create index if not exists idx_volunteers_college on public.volunteers(college_id);
create index if not exists idx_volunteers_user on public.volunteers(user_id);
create index if not exists idx_volunteers_event on public.volunteers(event_id);

-- RLS for volunteers
alter table public.volunteers enable row level security;

create policy "Volunteers are readable by admins"
  on public.volunteers for select to authenticated
  using (public.is_admin(auth.uid()));

create policy "Admins manage volunteers"
  on public.volunteers for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Trigger for updated_at
create trigger trg_volunteers_updated before update on public.volunteers
  for each row execute function public.tg_set_updated_at();

grant select on public.volunteers to authenticated;
grant all on public.volunteers to service_role;


-- ============ CREATE SUPPORT TICKETS TABLE ============
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  description text not null,
  status text not null default 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  priority text not null default 'medium', -- 'low', 'medium', 'high'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_support_tickets_college on public.support_tickets(college_id);
create index if not exists idx_support_tickets_user on public.support_tickets(user_id);

-- RLS for support tickets
alter table public.support_tickets enable row level security;

create policy "Users read and write own tickets"
  on public.support_tickets for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read and update all tickets"
  on public.support_tickets for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Trigger for updated_at
create trigger trg_support_tickets_updated before update on public.support_tickets
  for each row execute function public.tg_set_updated_at();

grant select, insert, update on public.support_tickets to authenticated;
grant all on public.support_tickets to service_role;
-- ===================================================
-- MIGRATION: 20260701150000_razorpay_and_pricing.sql
-- ===================================================

-- 1. Create subscription_plans table
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  monthly_price numeric(10,2) not null default 0,
  yearly_price numeric(10,2) not null default 0,
  currency text not null default 'INR',
  max_events integer not null default 10,
  max_organizers integer not null default 2,
  max_students integer not null default 100,
  max_volunteers integer not null default 5,
  storage_limit_gb integer not null default 1,
  custom_domain boolean not null default false,
  payment_gateway_access boolean not null default false,
  qr_scanner boolean not null default true,
  certificate_generation boolean not null default false,
  analytics boolean not null default false,
  google_forms_integration boolean not null default false,
  api_access boolean not null default false,
  priority_support boolean not null default false,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Seed default plans
insert into public.subscription_plans 
  (name, monthly_price, yearly_price, currency, max_events, max_organizers, max_students, max_volunteers, storage_limit_gb, custom_domain, payment_gateway_access, certificate_generation, analytics, google_forms_integration, api_access, priority_support)
values
  ('Free', 0, 0, 'INR', 3, 1, 50, 2, 1, false, false, false, false, false, false, false),
  ('Starter', 999, 9990, 'INR', 10, 3, 200, 5, 5, false, true, true, false, true, false, false),
  ('Professional', 2999, 29990, 'INR', 30, 10, 1000, 20, 20, true, true, true, true, true, true, true),
  ('Enterprise', 9999, 99990, 'INR', 9999, 999, 99999, 999, 100, true, true, true, true, true, true, true),
  ('Custom', 0, 0, 'INR', 9999, 999, 99999, 999, 100, true, true, true, true, true, true, true)
on conflict (name) do nothing;

-- 2. Create/Update subscriptions table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  plan_name text not null default 'free', -- 'free', 'basic', 'premium', 'enterprise'
  status text not null default 'active', -- 'active', 'suspended', 'expired'
  billing_cycle text not null default 'monthly', -- 'monthly', 'yearly'
  amount_paid numeric(10,2) not null default 0,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id)
);

-- Alter table to ensure plan_id and deleted_at columns exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'subscriptions' and column_name = 'plan_id'
  ) then
    alter table public.subscriptions add column plan_id uuid references public.subscription_plans(id) on delete set null;
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'subscriptions' and column_name = 'deleted_at'
  ) then
    alter table public.subscriptions add column deleted_at timestamptz;
  end if;
end $$;

-- Backfill default plan_id for existing subscriptions based on plan_name
update public.subscriptions s
set plan_id = p.id
from public.subscription_plans p
where upper(s.plan_name) = upper(p.name) and s.plan_id is null;

-- Ensure default backfill for subscriptions that don't match
update public.subscriptions
set plan_id = (select id from public.subscription_plans where name = 'Free' limit 1)
where plan_id is null;

-- Enable row level security if it exists
alter table public.subscriptions enable row level security;

-- Policies for subscriptions (make sure policies don't error if they exist, so we drop them first or check)
drop policy if exists "Subscriptions are readable by admins" on public.subscriptions;
create policy "Subscriptions are readable by admins"
  on public.subscriptions for select to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "Super admins can manage subscriptions" on public.subscriptions;
create policy "Super admins can manage subscriptions"
  on public.subscriptions for all to authenticated
  using (exists (
    select 1 from public.user_roles 
    where user_id = auth.uid() and role = 'super_admin'
  ));

-- Update trigger
drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.tg_set_updated_at();

-- 3. Create event_pricing table
create table if not exists public.event_pricing (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade unique,
  registration_type text not null default 'free', -- 'free' | 'paid'
  registration_fee numeric(10,2) not null default 0,
  currency text not null default 'INR',
  early_bird_price numeric(10,2),
  early_bird_deadline timestamptz,
  late_registration_price numeric(10,2),
  gst_percent numeric(5,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  coupon_code text,
  max_registrations integer,
  registration_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Backfill event_pricing table with existing events
insert into public.event_pricing (event_id, registration_type, registration_fee)
select id, case when is_paid then 'paid' else 'free' end, coalesce(price_inr, 0)
from public.events
on conflict (event_id) do nothing;

-- 4. Create coupons table
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  code text not null,
  discount_type text not null default 'percentage', -- 'percentage' | 'fixed'
  discount_value numeric(10,2) not null default 0,
  max_uses integer not null default 100,
  uses_count integer not null default 0,
  expiry_date timestamptz,
  applicable_events uuid[], -- null means all events in the college
  min_purchase numeric(10,2) not null default 0,
  status text not null default 'active', -- 'active' | 'inactive'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (college_id, code)
);

-- 5. Create coupon_usage table
create table if not exists public.coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 6. Create payment_logs table
create table if not exists public.payment_logs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete set null,
  status_from text,
  status_to text,
  raw_payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 7. Create refunds table
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  amount_inr numeric(10,2) not null,
  reason text,
  status text not null default 'pending', -- 'pending' | 'approved' | 'rejected'
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 8. Create invoices table
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade unique,
  invoice_number text not null unique,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Check settlements table for soft delete
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'settlements' and column_name = 'updated_at'
  ) then
    alter table public.settlements add column updated_at timestamptz not null default now();
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'settlements' and column_name = 'deleted_at'
  ) then
    alter table public.settlements add column deleted_at timestamptz;
  end if;
end $$;

-- 10. Enable Row Level Security (RLS) on all tables
alter table public.subscription_plans enable row level security;
alter table public.event_pricing enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_usage enable row level security;
alter table public.payment_logs enable row level security;
alter table public.refunds enable row level security;
alter table public.invoices enable row level security;

-- 11. Create RLS Policies
-- Plans
create policy "Subscription plans readable by everyone" on public.subscription_plans 
  for select to authenticated, anon using (deleted_at is null);
create policy "Super admins can manage plans" on public.subscription_plans 
  for all to authenticated using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'super_admin')
  );

-- Event pricing
create policy "Event pricing readable by everyone" on public.event_pricing 
  for select to authenticated, anon using (deleted_at is null);
create policy "Admins manage event pricing" on public.event_pricing 
  for all to authenticated using (
    exists (
      select 1 from public.user_roles ur
      join public.events e on e.college_id = ur.college_id
      where ur.user_id = auth.uid() and e.id = event_pricing.event_id 
        and ur.role in ('super_admin', 'college_admin', 'organizer')
    )
  );

-- Coupons
create policy "Coupons readable by everyone" on public.coupons 
  for select to authenticated, anon using (deleted_at is null);
create policy "College admins manage coupons" on public.coupons 
  for all to authenticated using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.college_id = coupons.college_id
        and ur.role in ('super_admin', 'college_admin', 'organizer')
    )
  );

-- Coupon usage
create policy "Users see own coupon usage" on public.coupon_usage 
  for select to authenticated using (user_id = auth.uid());
create policy "Admins see all coupon usage" on public.coupon_usage 
  for select to authenticated using (public.is_admin(auth.uid()));
create policy "Users insert own coupon usage" on public.coupon_usage 
  for insert to authenticated with check (user_id = auth.uid());

-- Payment logs
create policy "Admins read payment logs" on public.payment_logs 
  for select to authenticated using (public.is_admin(auth.uid()));

-- Refunds
create policy "Users see own refunds" on public.refunds 
  for select to authenticated using (
    exists (select 1 from public.payments p where p.id = refunds.payment_id and p.user_id = auth.uid())
  );
create policy "Admins manage refunds" on public.refunds 
  for all to authenticated using (public.is_admin(auth.uid()));

-- Invoices
create policy "Users see own invoices" on public.invoices 
  for select to authenticated using (
    exists (select 1 from public.payments p where p.id = invoices.payment_id and p.user_id = auth.uid())
  );
create policy "Admins see all invoices" on public.invoices 
  for select to authenticated using (public.is_admin(auth.uid()));

-- 12. Create Triggers for updated_at
create trigger trg_sub_plans_updated before update on public.subscription_plans 
  for each row execute function public.tg_set_updated_at();

create trigger trg_event_pricing_updated before update on public.event_pricing 
  for each row execute function public.tg_set_updated_at();

create trigger trg_coupons_updated before update on public.coupons 
  for each row execute function public.tg_set_updated_at();

create trigger trg_refunds_updated before update on public.refunds 
  for each row execute function public.tg_set_updated_at();

create trigger trg_invoices_updated before update on public.invoices 
  for each row execute function public.tg_set_updated_at();

create trigger trg_settlements_updated before update on public.settlements 
  for each row execute function public.tg_set_updated_at();

-- 13. Create Indexes
create index if not exists idx_event_pricing_event on public.event_pricing(event_id);
create index if not exists idx_coupons_college on public.coupons(college_id);
create index if not exists idx_coupons_code on public.coupons(code);
create index if not exists idx_refunds_payment on public.refunds(payment_id);
create index if not exists idx_invoices_payment on public.invoices(payment_id);

-- 14. Create helper RPCs
CREATE OR REPLACE FUNCTION public.increment_coupon_uses(_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
begin
  update public.coupons
  set uses_count = uses_count + 1
  where id = _coupon_id;
end;
$$;

-- Rebranding and authentication improvements
-- 1. Profile extensions
alter table public.profiles
  add column if not exists role public.app_role not null default 'student'::public.app_role,
  add column if not exists student_id uuid references public.students(id) on delete set null,
  add column if not exists verified_at timestamptz;

-- 2. Synchronize profiles.role with public.user_roles
create or replace function public.get_highest_role(uid uuid)
returns public.app_role language plpgsql stable security definer set search_path = public as $$
declare
  highest public.app_role;
begin
  select role into highest
  from public.user_roles
  where user_id = uid
  order by case role
    when 'super_admin' then 1
    when 'college_admin' then 2
    when 'organizer' then 3
    when 'scanner' then 4
    when 'student' then 5
    else 6
  end asc
  limit 1;

  return coalesce(highest, 'student'::public.app_role);
end;
$$;

create or replace function public.sync_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_user uuid;
begin
  if tg_op = 'DELETE' then
    target_user := old.user_id;
  else
    target_user := new.user_id;
  end if;

  update public.profiles
  set role = public.get_highest_role(target_user)
  where id = target_user;

  return null;
end;
$$;

drop trigger if exists trg_sync_profile_role on public.user_roles;
create trigger trg_sync_profile_role
after insert or update or delete on public.user_roles
for each row execute function public.sync_profile_role();

-- Backfill existing profiles role
update public.profiles p
set role = public.get_highest_role(p.id);

-- 3. Redefine RLS policies for profiles table
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "select_profiles" on public.profiles;
drop policy if exists "update_profiles" on public.profiles;
drop policy if exists "insert_profiles" on public.profiles;

create policy "select_profiles" on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin(auth.uid())
    or college_id in (
      select college_id from public.user_roles where user_id = auth.uid()
    )
  );

create policy "update_profiles" on public.profiles for update to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin'
    )
  );

create policy "insert_profiles" on public.profiles for insert to authenticated
  with check (
    id = auth.uid()
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin'
    )
  );

-- 4. Redefine RLS policies for user_roles table
drop policy if exists "Users see their own roles" on public.user_roles;
drop policy if exists "select_user_roles" on public.user_roles;
drop policy if exists "manage_user_roles" on public.user_roles;

create policy "select_user_roles" on public.user_roles for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin'
    )
    or college_id in (
      select college_id from public.user_roles
      where user_id = auth.uid() and role = 'college_admin'
    )
  );

create policy "manage_user_roles" on public.user_roles for all to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin'
    )
    or college_id in (
      select college_id from public.user_roles
      where user_id = auth.uid() and role = 'college_admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin'
    )
    or college_id in (
      select college_id from public.user_roles
      where user_id = auth.uid() and role = 'college_admin'
    )
  );
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
-- Fix: All broken mutations in FestVerse admin
-- Run this in Supabase SQL Editor

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 1. FIX: Colleges â€” allow super_admin to INSERT/UPDATE/DELETE
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 2. FIX: subscriptions â€” allow super_admin to INSERT
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 3. FIX: events â€” ensure admins can INSERT
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 4. FIX: event_pricing â€” replace the broken RLS policy
-- The old policy joins via events.college_id but the event may not
-- be visible yet at policy check time when inserting.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 5. FIX: user_roles â€” allow authenticated users to INSERT their
-- own role assignment (needed for createCollegeTenant)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

DROP POLICY IF EXISTS "Users can self-assign college_admin role" ON public.user_roles;
CREATE POLICY "Users can self-assign college_admin role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'college_admin');

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 6. FIX: notices â€” allow admins to INSERT
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 7. FIX: college_payment_settings â€” allow college_admin to upsert
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 8. FIX: grant anon column access for new media columns
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

GRANT SELECT (
  id, slug, name, short_name, logo_url, favicon_url, primary_color,
  payment_mode, is_active, created_at, updated_at,
  header_media_url, header_media_type,
  footer_media_url, footer_media_type,
  og_image_url, tagline, website, banner_url
) ON public.colleges TO anon;
-- Grant SELECT/INSERT/UPDATE/DELETE permissions to authenticated and anon roles on all new SaaS/payment tables.
-- This ensures PostgREST (Supabase Client) can query them, while RLS policies enforce security.

-- 1. subscription_plans
grant select on public.subscription_plans to anon, authenticated;
grant all on public.subscription_plans to service_role;

-- 2. subscriptions
grant select on public.subscriptions to authenticated;
grant insert, update, delete on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

-- 3. event_pricing
grant select on public.event_pricing to anon, authenticated;
grant insert, update, delete on public.event_pricing to authenticated;
grant all on public.event_pricing to service_role;

-- 4. coupons
grant select on public.coupons to anon, authenticated;
grant insert, update, delete on public.coupons to authenticated;
grant all on public.coupons to service_role;

-- 5. coupon_usage
grant select, insert on public.coupon_usage to authenticated;
grant all on public.coupon_usage to service_role;

-- 6. payment_logs
grant select, insert on public.payment_logs to authenticated;
grant all on public.payment_logs to service_role;

-- 7. refunds
grant select, insert on public.refunds to authenticated;
grant all on public.refunds to service_role;

-- 8. invoices
grant select on public.invoices to authenticated;
grant all on public.invoices to service_role;

-- 9. google_forms (if exists)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='google_forms') then
    grant select, insert, update, delete on public.google_forms to authenticated;
  end if;
end $$;

-- 10. activity_logs
grant select on public.activity_logs to authenticated;

-- 11. colleges
grant select, insert, update, delete on public.colleges to authenticated;

-- 12. volunteers
grant select, insert, update, delete on public.volunteers to authenticated;

-- 13. notices
grant select, insert, update, delete on public.notices to authenticated;

-- 14. support_tickets
grant select, insert, update, delete on public.support_tickets to authenticated;



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
