-- Allow Agents to CREATE their own visits
create policy "Agents can create own visits" on public.visits
  for insert with check (
    auth.uid() = agent_id
  );

-- Allow Agents to UPDATE their own visits (e.g. completing them)
create policy "Agents can update own visits" on public.visits
  for update using (
    auth.uid() = agent_id
  );
