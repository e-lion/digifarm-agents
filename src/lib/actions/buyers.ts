'use server'

import { createClient } from '@/lib/supabase/server'

export interface BuyerWithStats {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  value_chain: string | null
  business_type: string | null
  county: string | null
  agent_count: number
  agent_names: string[]
  last_visited: string | null
}

export async function getBuyers(): Promise<{ buyers: BuyerWithStats[], error: string | null }> {
  const supabase = await createClient()

  try {
    // 1. Fetch all buyers
    const { data: buyers, error: buyersError } = await supabase
      .from('buyers')
      .select('*')
      .order('name')

    if (buyersError) throw buyersError

    // 2. Fetch all visits to aggregate stats (grouped by buyer_name)
    // We could do this with a more complex SQL query or RPC, but this is fine for now
    const { data: visits, error: visitsError } = await supabase
      .from('visits')
      .select('buyer_name, agent_id, created_at, profiles(full_name, email)')
      .order('created_at', { ascending: false })

    if (visitsError) throw visitsError

    // 3. Aggregate stats
    const buyerStats = new Map<string, { agents: Set<string>, lastVisit: string | null }>()

    visits?.forEach(visit => {
      if (!visit.buyer_name) return
      
      const stats = buyerStats.get(visit.buyer_name) || { agents: new Set(), lastVisit: null }
      
      // Add agent name or email
      const profiles = Array.isArray(visit.profiles) ? visit.profiles[0] : visit.profiles
      const agentName = profiles?.full_name || profiles?.email || 'Unknown Agent'
      stats.agents.add(agentName)
      
      // Update last visit if newer
      if (!stats.lastVisit || new Date(visit.created_at) > new Date(stats.lastVisit)) {
        stats.lastVisit = visit.created_at
      }
      
      buyerStats.set(visit.buyer_name, stats)
    })

    // 4. Merge
    const result: BuyerWithStats[] = buyers.map(buyer => {
      const stats = buyerStats.get(buyer.name) || { agents: new Set(), lastVisit: null }
      return {
        ...buyer,
        agent_count: stats.agents.size,
        agent_names: Array.from(stats.agents),
        last_visited: stats.lastVisit
      }
    })

    return { buyers: result, error: null }
  } catch (e: any) {
    console.error('Error fetching buyers:', e)
    return { buyers: [], error: e.message }
  }
}
