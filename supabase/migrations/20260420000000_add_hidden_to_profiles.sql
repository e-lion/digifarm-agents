ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- Allow Admins to update profiles (needed for hiding/unhiding and status updates)
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE
  USING (
    public.is_admin()
  );
