-- FIX: Allow Admins to view all profiles (needed for Agent Performance View)
-- Run this in your Supabase Dashboard > SQL Editor

-- 1. Drop existing policy if it conflicts (optional, safe to run)
drop policy if exists "Admins can view all profiles" on public.profiles;

-- 2. Create the policy
-- This allows any user who has role='admin' in their OWN profile row to view ALL rows.
create policy "Admins can view all profiles" on public.profiles
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 3. Ensure RLS is enabled
alter table public.profiles enable row level security;
