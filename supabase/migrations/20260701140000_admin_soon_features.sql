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
