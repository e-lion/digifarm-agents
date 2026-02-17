-- Create Buyers Table
create table if not exists public.buyers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_name text,
  phone text,
  value_chain text,
  business_type text,
  county text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.buyers enable row level security;

-- Policies
create policy "Admins can view all buyers" on public.buyers
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can insert buyers" on public.buyers
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
  
create policy "Admins can update buyers" on public.buyers
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Backfill from Visits (distinct buyer_name)
-- We use a CTE to get the latest visit details for each buyer to populate contact info
with distinct_buyers as (
  select distinct on (buyer_name)
    buyer_name,
    visit_details,
    created_at
  from public.visits
  order by buyer_name, created_at desc
)
insert into public.buyers (name, contact_name, phone, value_chain, business_type, county)
select
  buyer_name,
  visit_details->>'contact_name',
  visit_details->>'phone',
  visit_details->>'value_chain',
  visit_details->>'agsi_business_type',
  visit_details->>'county'
from distinct_buyers
on conflict (name) do nothing;
