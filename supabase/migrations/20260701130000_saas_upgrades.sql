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
