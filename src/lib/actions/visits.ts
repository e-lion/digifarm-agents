'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/database'

type VisitInsert = Database['public']['Tables']['visits']['Insert']
type BuyerInsert = Database['public']['Tables']['buyers']['Insert']

export async function createVisitAction(data: {
  id?: string // Allow pre-generated UUID for offline sync continuity
  buyer_name: string
  buyer_type: string
  value_chain: string
  county: string
  scheduled_date: string
  polygon_coords: any
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
    value_chain: data.value_chain,
    county: data.county
  }
  const { error: buyerError } = await supabase.from('buyers').upsert(buyerData, { onConflict: 'name' })

  if (buyerError) return { error: buyerError.message }

  // 2. Insert visit
  const visitData: VisitInsert = {
    id: data.id as any, // Preserve offline temp ID if provided
    agent_id: user.id,
    buyer_name: data.buyer_name,
    buyer_type: data.buyer_type,
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

export async function updateVisitAction(visitId: string, buyerName: string, data: any, coords: {lat: number, lng: number} | null) {
  const supabase = await createClient()

  // 1. Update buyer contact info
  const { error: buyerError } = await supabase.from('buyers').upsert({
    name: buyerName,
    contact_name: data.contact_name,
    phone: data.phone,
    updated_at: new Date().toISOString()
  }, { onConflict: 'name' })

  if (buyerError) return { error: buyerError.message }

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

export async function recordCheckInAction(visitId: string, coords: {lat: number, lng: number}, polygon_coords?: any) {
  const supabase = await createClient()

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
