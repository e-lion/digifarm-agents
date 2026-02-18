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
  latest_visit_completed_at: string | null
  latest_visit_checked_in_at: string | null
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
      .order('created_at', { ascending: false })

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
        .select('buyer_name, agent_id, status, created_at, scheduled_date, completed_at, checked_in_at, profiles(full_name, first_name, last_name, email)')
        .in('buyer_name', buyerNames)
        .order('created_at', { ascending: false })

        if (visitsError) throw visitsError
        visits = visitsData as any[]
    }

    // 3. Aggregate stats
    const buyerStats = new Map<string, { 
      agents: Set<string>, 
      lastVisit: string | null,
      latestStatus: string | null,
      latestAgent: string | null,
      latestScheduled: string | null,
      latestCompleted: string | null,
      latestCheckedIn: string | null
    }>()

    visits.forEach(visit => {
      if (!visit.buyer_name) return
      
      const normalizedName = visit.buyer_name.trim().toLowerCase()
      const stats = buyerStats.get(normalizedName) || { 
        agents: new Set(), 
        lastVisit: null,
        latestStatus: null,
        latestAgent: null,
        latestScheduled: null,
        latestCompleted: null,
        latestCheckedIn: null
      }
      
      // Add agent name or email
      const profiles = Array.isArray(visit.profiles) ? visit.profiles[0] : visit.profiles
      const agentName = profiles?.full_name 
        ? profiles.full_name 
        : profiles?.first_name 
          ? `${profiles.first_name} ${profiles.last_name || ''}`.trim() 
          : profiles?.email || 'Unknown Agent';
      stats.agents.add(agentName)
      
      // 1. Capture absolute latest visit info (planned or completed)
      // Since visits are ordered by created_at DESC, the first visit we see for this buyer
      // in the iteration will be the technically "latest" one record-wise.
      if (!stats.latestStatus) {
        stats.latestStatus = visit.status
        stats.latestAgent = agentName
        stats.latestScheduled = visit.scheduled_date
      }
      
      // 2. Track the latest CHECKED-IN visit for the physical "Date Visited" date
      // We prioritize checked_in_at, then completed_at if check-in was missed
      const interactionTime = visit.checked_in_at || visit.completed_at
      if (interactionTime) {
        if (!stats.lastVisit || new Date(interactionTime) > new Date(stats.lastVisit)) {
            stats.lastVisit = interactionTime
            stats.latestCompleted = visit.completed_at
            stats.latestCheckedIn = visit.checked_in_at
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
        latestScheduled: null,
        latestCompleted: null,
        latestCheckedIn: null
      }
      return {
        ...buyer,
        agent_count: stats.agents.size,
        agent_names: Array.from(stats.agents),
        last_visited: stats.lastVisit,
        latest_visit_status: stats.latestStatus,
        latest_visit_agent_name: stats.latestAgent,
        latest_visit_scheduled_date: stats.latestScheduled,
        latest_visit_completed_at: stats.latestCompleted,
        latest_visit_checked_in_at: stats.latestCheckedIn
      }
    })

    return { buyers: result, totalCount: count || 0, error: null }
  } catch (e: any) {
    console.error('Error fetching buyers:', e)
    return { buyers: [], totalCount: 0, error: e.message }
  }
}

export interface BuyerOption {
  id: string
  name: string
  contact_name: string | null
  business_type: string | null
  value_chain: string | null
  county: string | null
  location: { lat: number, lng: number } | null
}

export async function getBuyersList(search?: string, limit: number = 10): Promise<{ data: BuyerOption[], count: number }> {
  const supabase = await createClient()
  
  // 1. Fetch buyers
  let query = supabase
    .from('buyers')
    .select('id, name, contact_name, business_type, value_chain, county', { count: 'exact' })
    .order('name')
    .limit(limit)

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
    
  const { data: buyers, count, error } = await query
    
  if (error) {
    console.error('Error fetching buyers list:', error)
    return { data: [], count: 0 }
  }

  // 2. Fetch latest visit location for these buyers
  const buyerNames = buyers.map(b => b.name)
  const buyerLocations = new Map<string, { lat: number, lng: number }>()
  
  if (buyerNames.length > 0) {
     // We use a simplified query to just get one visit per buyer with coords
     // Since Supabase doesn't support easy "distinct on" via JS client without RPC sometimes,
     // we'll fetch visits with coords for these buyers and process in JS.
     // To optimize, we just look for visits that HAVE polygon_coords.
     const { data: visits } = await supabase
        .from('visits')
        .select('buyer_name, polygon_coords')
        .in('buyer_name', buyerNames)
        .not('polygon_coords', 'is', null)
        .order('created_at', { ascending: false })
     
     if (visits) {
        visits.forEach(visit => {
            if (!buyerLocations.has(visit.buyer_name) && visit.polygon_coords) {
                // Extract center. polygon_coords is a GeoJSON-like object or specific structure.
                // Based on CreateVisitForm, it is created via turf.circle which outputs a Polygon.
                // Structure: { type: "Polygon", coordinates: [[[lng, lat], ...]] }
                try {
                    const coords = visit.polygon_coords.coordinates[0]; // First ring
                    if (coords && coords.length > 0) {
                        // Simple average for centroid
                        let latSum = 0, lngSum = 0;
                        coords.forEach((c: any) => {
                            lngSum += c[0];
                            latSum += c[1];
                        });
                        const centerLat = latSum / coords.length;
                        const centerLng = lngSum / coords.length;
                        buyerLocations.set(visit.buyer_name, { lat: centerLat, lng: centerLng });
                    }
                } catch (e) {
                    console.warn(`Failed to parse location for ${visit.buyer_name}`, e);
                }
            }
        })
     }
  }
  
  const mappedBuyers = buyers.map(buyer => ({
    ...buyer,
    location: buyerLocations.get(buyer.name) || null
  })) as BuyerOption[]

  return { data: mappedBuyers, count: count || 0 }
}

