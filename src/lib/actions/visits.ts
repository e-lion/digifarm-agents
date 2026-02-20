'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/database'
import circle from '@turf/circle'
import { point } from '@turf/helpers'

type VisitInsert = Database['public']['Tables']['visits']['Insert']
type BuyerInsert = Database['public']['Tables']['buyers']['Insert']

export async function getActivityTypes(): Promise<string[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('activity_types')
    .select('name')
    .order('name')
    
  if (error) {
    console.error('Error fetching activity types:', error)
    return []
  }
  
  return data.map(t => t.name)
}

export async function createVisitAction(data: {
  id?: string // Allow pre-generated UUID for offline sync continuity
  buyer_name: string
  buyer_type: string
  activity_type: string
  value_chains: string[]
  county: string
  scheduled_date: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  polygon_coords: any
  contact_name: string
  contact_phone: string
  contact_designation: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in' }
  }

  // 1. Upsert buyer
  const buyerData: BuyerInsert = {
    name: data.buyer_name,
    business_type: data.buyer_type,
    // Maintain backward compatibility for now by setting the first one as primary
    value_chain: data.value_chains[0] || null, 
    value_chains: data.value_chains,
    county: data.county,
    // Still save primary contact to buyer for quick access
    contact_name: data.contact_name,
    phone: data.contact_phone
  }
  const { data: savedBuyer, error: buyerError } = await supabase
    .from('buyers')
    .upsert(buyerData, { onConflict: 'name' })
    .select()
    .single()

  if (buyerError) return { error: buyerError.message }

  // 2. Insert buyer contact if provided
  if (data.contact_name && savedBuyer) {
      const { error: contactError } = await supabase.from('buyer_contacts').insert({
          buyer_id: savedBuyer.id,
          name: data.contact_name,
          phone: data.contact_phone,
          designation: data.contact_designation
      })
      
      if (contactError) {
          console.error("Error saving contact:", contactError)
          // We don't fail the visit creation if contact fails, but we log it
      }
  }

  // 3. Insert visit
  const visitData: VisitInsert = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id: data.id as any, // Preserve offline temp ID if provided
    agent_id: user.id,
    buyer_name: data.buyer_name,
    buyer_type: data.buyer_type,
    activity_type: data.activity_type,
    scheduled_date: data.scheduled_date,
    status: 'planned',
    polygon_coords: data.polygon_coords
  }
  const { error: visitError } = await supabase.from('visits').insert(visitData)

  if (visitError) return { error: visitError.message }

  revalidatePath('/admin/buyers')
  revalidatePath('/agent/routes')
  return { success: true }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateVisitAction(visitId: string, buyerName: string, data: any, coords: {lat: number, lng: number} | null) {
  const supabase = await createClient()

  // 1. Update buyer contact info (Primary)
  const { data: savedBuyer, error: buyerError } = await supabase.from('buyers').upsert({
    name: buyerName,
    contact_name: data.contact_name,
    phone: data.phone,
    updated_at: new Date().toISOString()
  }, { onConflict: 'name' })
  .select()
  .single()

  if (buyerError) return { error: buyerError.message }

  // 2. Insert/Update buyer contact history if designation is present or just to keep track
  // Only insert if it's a NEW contact (contact_id is missing or 'new')
  if (savedBuyer && data.contact_name && (!data.contact_id || data.contact_id === 'new')) {
       // Check if this contact already exists to avoid duplicates or just insert new?
       // For simplicity/audit trail, we can insert new if it doesn't exist?
       // Or just insert. Let's insert.
       const { error: contactError } = await supabase.from('buyer_contacts').insert({
           buyer_id: savedBuyer.id,
           name: data.contact_name,
           phone: data.phone,
           designation: data.contact_designation
       })
       
       if (contactError) {
           console.error("Error saving contact history:", contactError)
       }
  }

  const { data: updatedVisit, error: visitError } = await supabase
    .from('visits')
    .update({
      status: 'completed',
      visit_details: data,
      check_in_location: coords ? `POINT(${coords.lng} ${coords.lat})` : null,
      completed_at: new Date().toISOString()
    })
    .eq('id', visitId)
    .select()

  if (visitError) return { error: visitError.message }
  if (!updatedVisit || updatedVisit.length === 0) return { error: 'Visit not found', code: 'NOT_FOUND' }

  revalidatePath('/admin/buyers')
  revalidatePath('/agent/routes')
  return { success: true }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recordCheckInAction(visitId: string, coords: {lat: number, lng: number}, polygon_coords?: any) {
  const supabase = await createClient()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    checked_in_at: new Date().toISOString(),
    check_in_location: `POINT(${coords.lng} ${coords.lat})`
  }

  if (polygon_coords) {
    updateData.polygon_coords = polygon_coords
  }

  const { data: updatedVisit, error } = await supabase
    .from('visits')
    .update(updateData)
    .eq('id', visitId)
    .select()

  if (error) return { error: error.message }
  if (!updatedVisit || updatedVisit.length === 0) return { error: 'Visit not found', code: 'NOT_FOUND' }
  
  revalidatePath('/admin/buyers')
  revalidatePath('/agent/routes')
  return { success: true }
}
export async function createBulkVisits(visits: {
  buyer_id: string
  activity_type: string
  scheduled_date: string
  visit_category?: string
}[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in' }
  }

  if (!visits || visits.length === 0) {
    return { error: 'No visits provided' }
  }

  // 1. Fetch details for all selected buyers to get location/types
  const buyerIds = visits.map(v => v.buyer_id)
  const { data: buyers, error: buyersError } = await supabase
    .from('buyers')
    .select('*')
    .in('id', buyerIds)

  if (buyersError) {
    console.error("Error fetching buyers for bulk visit:", buyersError)
    return { error: 'Failed to fetch buyer details' }
  }

  if (!buyers || buyers.length === 0) {
    return { error: 'No valid buyers found' }
  }

  // Create a map for quick access
  const buyersMap = new Map(buyers.map(b => [b.id, b]))

  // 2. Prepare visit inserts
  const visitsToInsert: VisitInsert[] = []
  
  for (const visit of visits) {
      const buyer = buyersMap.get(visit.buyer_id)
      if (!buyer) continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let polygonGeometry: any = null
      
      // Generate 100m radius polygon if buyer has location
      if (buyer.location_lat && buyer.location_lng) {
        try {
          const center = point([buyer.location_lng, buyer.location_lat])
          const circularPolygon = circle(center, 0.1, { units: 'kilometers', steps: 64 })
          polygonGeometry = circularPolygon.geometry
        } catch (e) {
          console.error(`Error generating polygon for buyer ${buyer.name}:`, e)
        }
      }

      visitsToInsert.push({
        agent_id: user.id,
        buyer_name: buyer.name,
        buyer_type: buyer.business_type || 'Unknown',
        activity_type: visit.activity_type,
        scheduled_date: visit.scheduled_date,
        status: 'planned',
        polygon_coords: polygonGeometry,
        visit_category: visit.visit_category || 'First Time'
      })
  }

  // 3. Bulk Insert
  const { error: insertError } = await supabase
    .from('visits')
    .insert(visitsToInsert)

  if (insertError) {
    console.error("Bulk insert error:", insertError)
    return { error: insertError.message }
  }

  revalidatePath('/admin/buyers')
  revalidatePath('/agent/routes')
  return { success: true, count: visitsToInsert.length }
}

export async function addBuyerToRouteAction(
  buyerId: string,
  scheduledDate: string,
  activityType: string,
  reason: string,
  visitCategory: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in' }
  }

  // 1. Fetch buyer
  const { data: buyer, error: buyerError } = await supabase
    .from('buyers')
    .select('*')
    .eq('id', buyerId)
    .single()

  if (buyerError || !buyer) {
    return { error: 'Buyer not found' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let polygonGeometry: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = buyer as any
  if (b.location_lat && b.location_lng) {
    try {
      const center = point([b.location_lng, b.location_lat])
      const circularPolygon = circle(center, 0.1, { units: 'kilometers', steps: 64 })
      polygonGeometry = circularPolygon.geometry
    } catch (e) {
      console.error(`Error generating polygon for buyer ${buyer.name}:`, e)
    }
  }

  // 2. Insert visit
  const visitData: VisitInsert = {
    agent_id: user.id,
    buyer_name: buyer.name,
    buyer_type: buyer.business_type || 'Unknown',
    activity_type: activityType,
    scheduled_date: scheduledDate,
    status: 'planned',
    polygon_coords: polygonGeometry,
    visit_category: visitCategory,
  }

  const { data: newVisit, error: visitError } = await supabase
    .from('visits')
    .insert(visitData)
    .select()
    .single()

  if (visitError) return { error: visitError.message }

  // 3. Log to route_audits
  const auditError = await supabase.from('route_audits').insert({
    agent_id: user.id,
    action: 'add_buyer',
    reason: reason,
    route_date: scheduledDate,
    details: {
      buyer_id: buyer.id,
      buyer_name: buyer.name,
      visit_id: newVisit.id
    }
  })

  if (auditError.error) console.error("Audit error:", auditError.error)

  revalidatePath('/agent/routes')
  revalidatePath('/admin/buyers')
  return { success: true }
}

export async function swapBuyerInRouteAction(
  visitId: string,
  newBuyerId: string,
  activityType: string,
  reason: string,
  visitCategory: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in' }
  }

  // 1. Fetch existing visit
  const { data: existingVisit, error: fetchVisitError } = await supabase
    .from('visits')
    .select('*')
    .eq('id', visitId)
    .single()

  if (fetchVisitError || !existingVisit) {
    return { error: 'Visit not found' }
  }

  // 2. Fetch new buyer
  const { data: newBuyer, error: buyerError } = await supabase
    .from('buyers')
    .select('*')
    .eq('id', newBuyerId)
    .single()

  if (buyerError || !newBuyer) {
    return { error: 'New buyer not found' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let polygonGeometry: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = newBuyer as any
  if (b.location_lat && b.location_lng) {
    try {
      const center = point([b.location_lng, b.location_lat])
      const circularPolygon = circle(center, 0.1, { units: 'kilometers', steps: 64 })
      polygonGeometry = circularPolygon.geometry
    } catch (e) {
      console.error(`Error generating polygon for buyer ${newBuyer.name}:`, e)
    }
  }

  // 3. Update visit
  const { error: visitError } = await supabase
    .from('visits')
    .update({
      buyer_name: newBuyer.name,
      buyer_type: newBuyer.business_type || 'Unknown',
      activity_type: activityType,
      status: 'planned',
      polygon_coords: polygonGeometry,
      visit_category: visitCategory,
      visit_details: null,
      check_in_location: null,
      checked_in_at: null,
      completed_at: null,
    })
    .eq('id', visitId)

  if (visitError) return { error: visitError.message }

  // 4. Log to route_audits
  const auditError = await supabase.from('route_audits').insert({
    agent_id: user.id,
    action: 'swap_buyer',
    reason: reason,
    route_date: existingVisit.scheduled_date,
    details: {
      previous_buyer_name: existingVisit.buyer_name,
      new_buyer_name: newBuyer.name,
      new_buyer_id: newBuyer.id,
      visit_id: visitId
    }
  })

  if (auditError.error) console.error("Audit error:", auditError.error)

  revalidatePath('/agent/routes')
  revalidatePath('/admin/buyers')
  return { success: true }
}
export async function getVisits(page: number, pageSize: number, filters: {
  query?: string,
  status?: string,
  agentId?: string,
  category?: string,
  startDate?: string,
  endDate?: string
}) {
  const supabase = await createClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let supabaseQuery = supabase
    .from('visits')
    .select(`
      *,
      agent:profiles!visits_agent_id_fkey (
        full_name,
        email
      )
    `, { count: 'exact' })

  if (filters.status && filters.status !== 'all') {
    supabaseQuery = supabaseQuery.eq('status', filters.status)
  }

  if (filters.agentId && filters.agentId !== 'all') {
    supabaseQuery = supabaseQuery.eq('agent_id', filters.agentId)
  }

  if (filters.category && filters.category !== 'all') {
    supabaseQuery = supabaseQuery.eq('visit_category', filters.category)
  }

  if (filters.startDate) {
    supabaseQuery = supabaseQuery.gte('scheduled_date', filters.startDate)
  }

  if (filters.endDate) {
    supabaseQuery = supabaseQuery.lte('scheduled_date', `${filters.endDate}T23:59:59Z`)
  }

  if (filters.query) {
    supabaseQuery = supabaseQuery.ilike('buyer_name', `%${filters.query}%`)
  }

  const { data, count, error } = await supabaseQuery
    .order('scheduled_date', { ascending: false })
    .range(from, to)

  if (error) throw error

  const visits = (data || []).map(v => {
    const agent = v.agent as unknown as { full_name: string | null, email: string } | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const details = v.visit_details as any
    return {
      ...v,
      agent_name: agent?.full_name || 'Unknown Agent',
      agent_email: agent?.email || 'Unknown Email',
      actual_date: v.checked_in_at,
      feedback: details?.buyer_feedback || null
    }
  })

  return { visits, count: count || 0 }
}
