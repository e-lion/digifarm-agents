-- Add buyer_type column to visits table
alter table public.visits
add column if not exists buyer_type text;

-- Update check constraint if we want to be strict, but for now let's keep it flexible
-- or we can use the same BUSINESS_TYPES as in the form
