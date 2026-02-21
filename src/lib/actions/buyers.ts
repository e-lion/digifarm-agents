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
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // 0. Get user profile for filtering
    const { data: { user } } = await supabase.auth.getUser()
    let profile = null
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, counties')
        .eq('id', user.id)
        .single()
      profile = profileData
    }

    // 1. Fetch buyers with their latest visits in a single relational query
    // We use a nested select to grab the relevant visit data directly
    let query = supabase
      .from('buyers')
      .select(`
        *,
        visits(
          status,
          scheduled_date,
          completed_at,
          checked_in_at,
          profiles(full_name, first_name, last_name, email)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply county filter for agents
    if (profile?.role === 'agent' && profile.counties && profile.counties.length > 0) {
      query = query.in('county', profile.counties)
    }

    if (search) {
      const searchPattern = `%${search}%`
      query = query.or(`name.ilike.${searchPattern},contact_name.ilike.${searchPattern},county.ilike.${searchPattern},value_chain.ilike.${searchPattern}`)
    }

    const { data: buyersData, count, error: buyersError } = await query.range(from, to)

    if (buyersError) throw buyersError

    // 2. Map the relational data to the expected BuyerWithStats interface
    // This approach is much more scalable than fetching all visits separately
    const result: BuyerWithStats[] = (buyersData || []).map(buyer => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buyerVisits = (buyer.visits as any[]) || []
      
      const agents = new Set<string>()
      let lastVisit: string | null = null
      let latestStatus: string | null = null
      let latestAgent: string | null = null
      let latestScheduled: string | null = null
      let latestCompleted: string | null = null
      let latestCheckedIn: string | null = null

      // Sort visits by scheduled_date DESC to find the "latest" ones easily
      const sortedVisits = [...buyerVisits].sort((a, b) => 
        new Date(b.scheduled_date || 0).getTime() - new Date(a.scheduled_date || 0).getTime()
      )

      sortedVisits.forEach((visit, index) => {
        const profiles = Array.isArray(visit.profiles) ? visit.profiles[0] : visit.profiles
        const agentName = profiles?.full_name 
          ? profiles.full_name 
          : profiles?.first_name 
            ? `${profiles.first_name} ${profiles.last_name || ''}`.trim() 
            : profiles?.email || 'Unknown Agent';
        
        agents.add(agentName)

        // The first visit in sorted list is the latest scheduled one
        if (index === 0) {
          latestStatus = visit.status
          latestAgent = agentName
          latestScheduled = visit.scheduled_date
        }

        // Track the latest physical interaction (check-in or completion)
        const interactionTime = visit.checked_in_at || visit.completed_at
        if (interactionTime) {
          if (!lastVisit || new Date(interactionTime) > new Date(lastVisit)) {
            lastVisit = interactionTime
            latestCompleted = visit.completed_at
            latestCheckedIn = visit.checked_in_at
          }
        }
      })

      return {
        id: buyer.id,
        name: buyer.name,
        contact_name: buyer.contact_name,
        phone: buyer.phone,
        value_chain: buyer.value_chain,
        business_type: buyer.business_type,
        county: buyer.county,
        created_at: buyer.created_at,
        agent_count: agents.size,
        agent_names: Array.from(agents),
        last_visited: lastVisit,
        latest_visit_status: latestStatus,
        latest_visit_agent_name: latestAgent,
        latest_visit_scheduled_date: latestScheduled,
        latest_visit_completed_at: latestCompleted,
        latest_visit_checked_in_at: latestCheckedIn
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
  
  // 0. Get user profile for filtering
  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, counties')
      .eq('id', user.id)
      .single()
    profile = profileData
  }

  // 1. Fetch buyers with location columns
  let query = supabase
    .from('buyers')
    .select('id, name, contact_name, phone, business_type, value_chain, value_chains, county, location_lat, location_lng', { count: 'exact' })
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  // Apply county filter for agents
  if (profile?.role === 'agent' && profile.counties && profile.counties.length > 0) {
    query = query.in('county', profile.counties)
  }

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

  const mappedBuyers = buyers.map(buyer => {
      const location = buyer.location_lat && buyer.location_lng 
          ? { lat: buyer.location_lat, lng: buyer.location_lng } 
          : null

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

