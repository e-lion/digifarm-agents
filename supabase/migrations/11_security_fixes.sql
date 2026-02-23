-- Migration: Security fixes for RLS on profile_access and buyers

-- 1. Enable RLS on profile_access (was missing)
alter table public.profile_access enable row level security;

-- Ensure Admins can read profile_access 
-- (This might overlap with fix_admin_rls.sql but is safe to re-run/ensure)
drop policy if exists "Admins can view all profile access" on public.profile_access;
create policy "Admins can view all profile access" on public.profile_access
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Ensure Admins can insert profile_access
drop policy if exists "Admins can insert profile access" on public.profile_access;
create policy "Admins can insert profile access" on public.profile_access
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 2. Add explicit RLS policies for Agents on the `buyers` table
-- Current problem: Only Admins have policies. Agents upserting during visits are blocked if RLS is enabled.

-- Allow authenticated users (Agents/Admins) to read buyers 
-- We allow them to read all buyers so they can search/select buyers globally, 
-- even if filtering is applied in the UI/Server Actions.
drop policy if exists "Authenticated users can view buyers" on public.buyers;
create policy "Authenticated users can view buyers" on public.buyers
  for select using (
    auth.uid() is not null
  );

-- Allow Agents to insert new buyers
drop policy if exists "Agents can insert buyers" on public.buyers;
create policy "Agents can insert buyers" on public.buyers
  for insert with check (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'agent'
    )
  );

-- Allow Agents to update buyers
-- (e.g. updating phone number during a visit check-in)
drop policy if exists "Agents can update buyers" on public.buyers;
create policy "Agents can update buyers" on public.buyers
  for update using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'agent'
    )
  );
