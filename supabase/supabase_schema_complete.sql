-- ==================================================================
-- CampusConnect Complete Database Schema (All Migrations Consolidated)
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

  -- Link student → auth user
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


