-- DIAGNOSTIC SCRIPT: Check all profiles and visits
-- Run this in your Supabase Dashboard > SQL Editor
-- This will show us if the "agent" actually exists in the correct table and has the right role.

-- 1. Check all profiles (users who have signed in)
select 
  id, 
  email, 
  role, 
  full_name,
  (select count(*) from public.visits where agent_id = public.profiles.id) as visit_count
from public.profiles;

-- 2. Check profile_access (whitelist)
select * from public.profile_access;

-- 3. Check if there are visits without a link to a profile (orphaned visits)
select count(*) as orphaned_visits 
from public.visits 
where agent_id not in (select id from public.profiles);
