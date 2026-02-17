-- 1. Ensure RLS is enabled on profile_access for security
alter table public.profile_access enable row level security;

-- 2. Allow users to read their OWN entry in profile_access
-- This allows the callback route (running as the user) to check if they are whitelisted.
create policy "Users can read own access" on public.profile_access
  for select using (
    email = auth.jwt() ->> 'email'
  );

-- 3. Also allow public read if you are debugging (Not recommended for prod, but helps now)
-- OR better: Allow the service role (which we might switch to) or just stick to the above.

-- 4. Ensure profiles table allows insert (upsert)
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
