'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let visits: any[] = []
    if (buyerNames.length > 0) {
        const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select('buyer_name, agent_id, status, created_at, scheduled_date, completed_at, checked_in_at, profiles(full_name, first_name, last_name, email)')
        .in('buyer_name', buyerNames)
        .order('created_at', { ascending: false })

        if (visitsError) throw visitsError
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  } catch (e: unknown) {
    console.error('Error fetching buyers:', e)
    return { buyers: [], totalCount: 0, error: (e as Error).message || 'Unknown error' }
  }
}

// ... (interfaces)

export interface BuyerOption {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  contact_designation: string | null
  business_type: string | null
  value_chain: string | null
  value_chains: string[] | null
  county: string | null
  location: { lat: number, lng: number } | null
}

export async function getBuyersList(
  search?: string, 
  limit: number = 50, 
  offset: number = 0
): Promise<{ data: BuyerOption[], count: number }> {
  const supabase = await createClient()
  
  // 1. Fetch buyers with location columns
  let query = supabase
    .from('buyers')
    .select('id, name, contact_name, phone, business_type, value_chain, value_chains, county, location_lat, location_lng', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }
    
  const { data: buyers, count, error } = await query
    
  if (error) {
    console.error('Error fetching buyers list:', error)
    return { data: [], count: 0 }
  }

  // 2. Fetch latest designation from buyer_contacts
  const buyerIds = buyers.map(b => b.id)
  const contactDesignations = new Map<string, string>()

  if (buyerIds.length > 0) {
      const { data: contacts } = await supabase
          .from('buyer_contacts')
          .select('buyer_id, designation')
          .in('buyer_id', buyerIds)
          .order('created_at', { ascending: false })

      if (contacts) {
          contacts.forEach(c => {
              if (c.buyer_id && !contactDesignations.has(c.buyer_id)) {
                  contactDesignations.set(c.buyer_id, c.designation || '')
              }
          })
      }
  }

  // 3. Fetch latest visit location for buyers MISSING location
  const buyersWithoutLocation = buyers.filter(b => !b.location_lat || !b.location_lng)
  const buyerNamesToCheck = buyersWithoutLocation.map(b => b.name)
  const derivedLocations = new Map<string, { lat: number, lng: number }>()
  
  if (buyerNamesToCheck.length > 0) {
     const { data: visits } = await supabase
        .from('visits')
        .select('buyer_name, polygon_coords')
        .in('buyer_name', buyerNamesToCheck)
        .not('polygon_coords', 'is', null)
        .order('created_at', { ascending: false })
     
     if (visits) {
        visits.forEach(visit => {
            if (!derivedLocations.has(visit.buyer_name) && visit.polygon_coords) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const coords = (visit.polygon_coords as any).coordinates[0]; 
                    if (coords && coords.length > 0) {
                        let latSum = 0, lngSum = 0;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        coords.forEach((c: any) => {
                            lngSum += c[0];
                            latSum += c[1];
                        });
                        derivedLocations.set(visit.buyer_name, { 
                            lat: latSum / coords.length, 
                            lng: lngSum / coords.length 
                        });
                    }
                } catch (e) {
                    console.warn(`Failed to parse location for ${visit.buyer_name}`, e);
                }
            }
        })
     }
  }
  
  const mappedBuyers = buyers.map(buyer => {
      let location = null
      if (buyer.location_lat && buyer.location_lng) {
          location = { lat: buyer.location_lat, lng: buyer.location_lng }
      } else {
          location = derivedLocations.get(buyer.name) || null
      }

      return {
        id: buyer.id,
        name: buyer.name,
        contact_name: buyer.contact_name,
        phone: buyer.phone,
        contact_designation: contactDesignations.get(buyer.id) || null,
        business_type: buyer.business_type,
        value_chain: buyer.value_chain,
        value_chains: buyer.value_chains,
        county: buyer.county,
        location
      }
  })

  return { data: mappedBuyers, count: count || 0 }
}

// ... (existing helper functions)

export async function getBuyerTypes(): Promise<string[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('buyer_types')
    .select('name')
    .order('name')
    
  if (error) {
    console.error('Error fetching buyer types:', error)
    return []
  }
  
  return data.map(t => t.name)
}

export async function getValueChains(): Promise<string[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('value_chains')
    .select('name')
    .order('name')
    
  if (error) {
    console.error('Error fetching value chains:', error)
    return []
  }
  
  return data.map(t => t.name)
}

export async function getContactDesignations() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contact_designations')
    .select('name')
    .order('name')

  if (error) {
    console.error('Error fetching contact designations:', error)
    return []
  }

  return data.map(d => d.name)
}

export async function getBuyerContacts(buyerId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('buyer_contacts')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching buyer contacts:', error)
    return []
  }

  return data
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createBuyer(data: any) {
  const supabase = await createClient()
  
  try {
      // 1. Create the buyer
      // We save to both value_chain (single text, legacy/primary) and value_chains (array)
      const primaryValueChain = data.value_chain && data.value_chain.length > 0 ? data.value_chain[0] : null;

      const { data: newBuyer, error } = await supabase
          .from('buyers')
          .insert({
              name: data.name,
              business_type: data.business_type,
              contact_name: data.contact_name,
              phone: data.phone,
              county: data.county,
              value_chain: primaryValueChain, 
              value_chains: data.value_chain || [], 
              location_lat: data.location?.lat,
              location_lng: data.location?.lng,
              created_at: new Date().toISOString()
          })
          .select()
          .single()

      if (error) throw error

      // 2. Add to buyer_contacts if contact info is present
      if (data.contact_name && data.phone) {
          await supabase.from('buyer_contacts').insert({
              buyer_id: newBuyer.id,
              name: data.contact_name,
              phone: data.phone,
              designation: data.contact_designation || 'Primary Contact', 
              created_at: new Date().toISOString()
          })
      }

      revalidatePath('/agent/buyers')
      revalidatePath('/admin/buyers')

      return { success: true, data: newBuyer }
  } catch (error) {
     console.error("Failed to create buyer:", error)
     return { success: false, error: (error as Error).message } 
  }
}

export async function updateBuyerContact(buyerId: string, contact: { name: string, phone: string, designation?: string }) {
    const supabase = await createClient()

    try {
        // 1. Update the buyer's primary contact info
        const { error: buyerError } = await supabase
            .from('buyers')
            .update({
                contact_name: contact.name,
                phone: contact.phone,
                updated_at: new Date().toISOString()
            })
            .eq('id', buyerId)

        if (buyerError) throw buyerError

        // 2. Add to history in buyer_contacts
        const { error: contactError } = await supabase
            .from('buyer_contacts')
            .insert({
                buyer_id: buyerId,
                name: contact.name,
                phone: contact.phone,
                designation: contact.designation || 'Updated Contact',
                created_at: new Date().toISOString()
            })

        if (contactError) throw contactError

        return { success: true }
    } catch (error) {
        console.error("Failed to update buyer contact:", error)
        return { success: false, error: (error as Error).message }
    }
}
// Update buyer location (lat/lng)
export async function updateBuyerLocation(buyerId: string, lat: number, lng: number) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('buyers')
            .update({
                location_lat: lat,
                location_lng: lng,
                updated_at: new Date().toISOString()
            })
            .eq('id', buyerId)

        if (error) throw error

        return { success: true }
    } catch (error) {
        console.error("Failed to update buyer location:", error)
        return { success: false, error: (error as Error).message }
    }
}

