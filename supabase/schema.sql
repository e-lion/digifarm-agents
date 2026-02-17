-- Enable PostGIS extension for geolocation
create extension if not exists postgis;

-- 1. Profile Access (Admin Gate)
create table public.profile_access (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null check (role in ('admin', 'agent')),
  created_at timestamp with time zone default now()
);

-- 2. Profiles (Extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'agent')),
  full_name text,
  created_at timestamp with time zone default now()
);

-- 3. Visits
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.profiles(id) not null,
  buyer_name text not null,
  polygon_coords jsonb, -- GeoJSON handling or simplified array of points
  status text not null default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  visit_details jsonb, -- Stores form data
  check_in_location geography(POINT),
  scheduled_date date not null,
  created_at timestamp with time zone default now()
);

-- RLS Policies (Draft)
alter table public.profiles enable row level security;
alter table public.visits enable row level security;

-- Profiles: Users can view their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

-- Visits: Agents can view/edit their own visits; Admins can view all
create policy "Agents view own visits" on public.visits
  for select using (auth.uid() = agent_id);

create policy "Admins view all visits" on public.visits
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
