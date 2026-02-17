-- Allow Admins to INSERT into profile_access
create policy "Admins can insert profile access" on public.profile_access
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Allow Admins to SELECT all profile_access records
create policy "Admins can view all profile access" on public.profile_access
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
