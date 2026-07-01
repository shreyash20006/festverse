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
