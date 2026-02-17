-- 1. Create Tables if they don't exist
create extension if not exists postgis;

create table if not exists public.profile_access (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null check (role in ('admin', 'agent')),
  created_at timestamp with time zone default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'agent')),
  full_name text,
  created_at timestamp with time zone default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.profiles(id) not null,
  buyer_name text not null,
  polygon_coords jsonb,
  status text not null default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  visit_details jsonb,
  check_in_location geography(POINT),
  scheduled_date date not null,
  created_at timestamp with time zone default now()
);

-- 2. Add Onboarding Columns (idempotent)
alter table public.profiles
add column if not exists first_name text,
add column if not exists last_name text,
add column if not exists phone_number text;

-- 3. RLS Policies
alter table public.profiles enable row level security;
alter table public.visits enable row level security;

-- Profiles policies
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

-- Visits policies
drop policy if exists "Agents view own visits" on public.visits;
create policy "Agents view own visits" on public.visits
  for select using (auth.uid() = agent_id);

drop policy if exists "Agents update own visits" on public.visits;
create policy "Agents update own visits" on public.visits
  for update using (auth.uid() = agent_id);

drop policy if exists "Admins all access visits" on public.visits;
create policy "Admins all access visits" on public.visits
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 4. Trigger for New Users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, first_name, last_name, phone_number)
  values (
    new.id,
    new.email,
    'agent', -- Default role
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone_number'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Backfill Profiles for Existing Users (Crucial if auth users exist but profiles don't)
insert into public.profiles (id, email, role)
select id, email, 'agent'
from auth.users
where id not in (select id from public.profiles);

-- 6. INSTRUCTIONS FOR ADMIN
-- Run the following query with your specific email to make yourself an admin:
-- update public.profiles set role = 'admin' where email = 'YOUR_EMAIL_HERE';
