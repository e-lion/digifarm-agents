'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createVisitAction(data: {
  buyer_name: string
  buyer_type: string
  value_chain: string
  scheduled_date: string
  polygon_coords: any
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in' }
  }

  // 1. Upsert buyer
  const { error: buyerError } = await supabase.from('buyers').upsert({
    name: data.buyer_name,
    business_type: data.buyer_type,
    value_chain: data.value_chain
  }, { onConflict: 'name' })

  if (buyerError) return { error: buyerError.message }

  // 2. Insert visit
  const { error: visitError } = await supabase.from('visits').insert({
    agent_id: user.id,
    buyer_name: data.buyer_name,
    buyer_type: data.buyer_type,
    scheduled_date: data.scheduled_date,
    status: 'planned',
    polygon_coords: data.polygon_coords
  })

  if (visitError) return { error: visitError.message }

  revalidatePath('/admin/buyers')
  revalidatePath('/agent/routes')
  return { success: true }
}

export async function updateVisitAction(visitId: string, buyerName: string, data: any, coords: {lat: number, lng: number} | null) {
  const supabase = await createClient()

  // 1. Upsert buyer
  const { error: buyerError } = await supabase.from('buyers').upsert({
    name: buyerName,
    contact_name: data.contact_name,
    phone: data.phone,
    value_chain: data.value_chain,
    business_type: data.agsi_business_type,
    county: data.county,
    updated_at: new Date().toISOString()
  }, { onConflict: 'name' })

  if (buyerError) return { error: buyerError.message }

  // 2. Update visit
  const { error: visitError } = await supabase
    .from('visits')
    .update({
      status: 'completed',
      visit_details: data,
      check_in_location: coords ? `POINT(${coords.lng} ${coords.lat})` : null,
    })
    .eq('id', visitId)

  if (visitError) return { error: visitError.message }

  revalidatePath('/admin/buyers')
  revalidatePath('/agent/routes')
  return { success: true }
}
