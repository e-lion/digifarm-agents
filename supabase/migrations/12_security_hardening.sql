-- Phase 1: Tighten Multi-Tenant Isolation for Buyers

-- 1. Redefine 'Authenticated users can view buyers' to be org-specific
drop policy if exists "Authenticated users can view buyers" on public.buyers;
create policy "Authenticated users can view buyers" on public.buyers
  for select using (
    organization_id in (
      select last_organization_id from public.profiles
      where id = auth.uid()
    )
  );

-- 2. Redefine 'Agents can update buyers' to be org-specific
drop policy if exists "Agents can update buyers" on public.buyers;
create policy "Agents can update buyers" on public.buyers
  for update using (
    organization_id in (
      select last_organization_id from public.profiles
      where id = auth.uid() and role = 'agent'
    )
  );

-- 3. Redefine 'Agents can insert buyers' to be org-specific
drop policy if exists "Agents can insert buyers" on public.buyers;
create policy "Agents can insert buyers" on public.buyers
  for insert with check (
    organization_id in (
      select last_organization_id from public.profiles
      where id = auth.uid() and role = 'agent'
    )
  );

-- Phase 4: Live Supabase Hardening (Function Search Path)

-- Apply explicit search_path to security functions to prevent hijacking
alter function public.is_admin() set search_path = public;
alter function public.is_org_member(uuid) set search_path = public;
alter function public.is_org_admin(uuid) set search_path = public;
alter function public.get_active_org_id() set search_path = public;
alter function public.sync_profile_access_to_members() set search_path = public;
