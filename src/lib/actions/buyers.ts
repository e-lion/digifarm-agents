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
  created_at: string
  agent_count: number
  agent_names: string[]
  last_visited: string | null
  latest_visit_status: string | null
  latest_visit_agent_name: string | null
  latest_visit_scheduled_date: string | null
}

export async function getBuyers(
  page: number = 1,
  pageSize: number = 10,
  search: string = ''
): Promise<{ 
  buyers: BuyerWithStats[], 
  totalCount: number,
  error: string | null 
}> {
  const supabase = await createClient()

  try {
    // 1. Fetch filtered and paginated buyers
    let query = supabase
      .from('buyers')
      .select('*', { count: 'exact' })
      .order('name')

    if (search) {
      const searchPattern = `%${search}%`
      query = query.or(`name.ilike.${searchPattern},contact_name.ilike.${searchPattern},county.ilike.${searchPattern},value_chain.ilike.${searchPattern}`)
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data: buyers, count, error: buyersError } = await query.range(from, to)

    if (buyersError) throw buyersError

    // 2. Fetch visits ONLY for the fetched buyers to aggregate stats
    const buyerNames = buyers.map(b => b.name)
    
    let visits: any[] = []
    if (buyerNames.length > 0) {
        const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('buyer_name, agent_id, status, created_at, scheduled_date, profiles(full_name, first_name, last_name, email)')
        .in('buyer_name', buyerNames)
        .order('created_at', { ascending: false })

        if (visitsError) throw visitsError
        visits = visitsData
    }

    // 3. Aggregate stats
    const buyerStats = new Map<string, { 
      agents: Set<string>, 
      lastVisit: string | null,
      latestStatus: string | null,
      latestAgent: string | null,
      latestScheduled: string | null
    }>()

    visits.forEach(visit => {
      if (!visit.buyer_name) return
      
      const normalizedName = visit.buyer_name.trim().toLowerCase()
      const stats = buyerStats.get(normalizedName) || { 
        agents: new Set(), 
        lastVisit: null,
        latestStatus: null,
        latestAgent: null,
        latestScheduled: null
      }
      
      // Add agent name or email
      const profiles = Array.isArray(visit.profiles) ? visit.profiles[0] : visit.profiles
      const agentName = profiles?.full_name 
        ? profiles.full_name 
        : profiles?.first_name 
          ? `${profiles.first_name} ${profiles.last_name || ''}`.trim() 
          : profiles?.email || 'Unknown Agent';
      stats.agents.add(agentName)
      
      // Update last visit if newer
      if (visit.created_at) {
        if (!stats.lastVisit || new Date(visit.created_at) > new Date(stats.lastVisit)) {
            stats.lastVisit = visit.created_at
            stats.latestStatus = visit.status
            stats.latestAgent = agentName
            stats.latestScheduled = visit.scheduled_date
        }
      }
      
      buyerStats.set(normalizedName, stats)
    })

    // 4. Merge
    const result: BuyerWithStats[] = buyers.map(buyer => {
      const normalizedName = buyer.name?.trim().toLowerCase()
      const stats = buyerStats.get(normalizedName) || { 
        agents: new Set(), 
        lastVisit: null,
        latestStatus: null,
        latestAgent: null,
        latestScheduled: null
      }
      return {
        ...buyer,
        agent_count: stats.agents.size,
        agent_names: Array.from(stats.agents),
        last_visited: stats.lastVisit,
        latest_visit_status: stats.latestStatus,
        latest_visit_agent_name: stats.latestAgent,
        latest_visit_scheduled_date: stats.latestScheduled
      }
    })

    return { buyers: result, totalCount: count || 0, error: null }
  } catch (e: any) {
    console.error('Error fetching buyers:', e)
    return { buyers: [], totalCount: 0, error: e.message }
  }
}

