-- Migration to add route_audits table for tracking modifications to route plans

CREATE TABLE route_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,          -- e.g., 'added_buyer', 'swapped_buyer'
    reason TEXT NOT NULL,          -- Required reason provided by the agent
    route_date DATE NOT NULL,      -- The scheduled date of the route changed
    details JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store previous/new buyer IDs or context
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE route_audits ENABLE ROW LEVEL SECURITY;

-- Agents can insert logs for their own ID
CREATE POLICY "Agents can insert own route audits"
ON route_audits FOR INSERT
TO authenticated
WITH CHECK (agent_id = auth.uid());

-- Agents can view their own audits
CREATE POLICY "Agents can view own route audits"
ON route_audits FOR SELECT
TO authenticated
USING (agent_id = auth.uid());

-- Admins can view all audits
CREATE POLICY "Admins can view all route audits"
ON route_audits FOR SELECT
TO authenticated
USING (is_admin());
