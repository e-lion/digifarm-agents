-- FIX: Handle RLS infinite recursion
-- The previous policy created a loop where checking if you are an admin required querying the profiles table, which triggered the policy again.
-- We fix this by creating a SECURE FUNCTION that bypasses RLS for the role check.

-- 1. Create a secure function to check admin status
create or replace function public.is_admin()
returns boolean
language sql
security definer -- Runs with privileges of the creator (bypass RLS)
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- 2. Update the policy to use the function
drop policy if exists "Admins can view all profiles" on public.profiles;

create policy "Admins can view all profiles" on public.profiles
  for select
  using (
    public.is_admin()
  );

-- 3. Just in case: Ensure auth.users can always access their own
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select
  using (
    auth.uid() = id
  );
