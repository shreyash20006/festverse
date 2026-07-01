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

