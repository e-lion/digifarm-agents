'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleAccess(email: string, currentStatus: 'activated' | 'deactivated') {
  const supabase = await createClient()

  // 0. Verify Auth & Admin Role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, last_organization_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' || !profile.last_organization_id) {
    throw new Error('Forbidden: Admins only')
  }

  const newStatus = currentStatus === 'activated' ? 'deactivated' : 'activated'

  // Update profile_access (always exists for any entry in our unified list)
  const { error: accessError } = await supabase
    .from('profile_access')
    .update({ status: newStatus })
    .eq('email', email)
    .eq('organization_id', profile.last_organization_id)

  if (accessError) {
    console.error('Failed to update profile_access status:', accessError)
    throw new Error('Failed to update access status')
  }

  // Also update profile if it exists (profiles are global but status might be handled)
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ status: newStatus })
    .eq('email', email)

  if (profileError) {
    console.error('Note: Could not update profiles table (might be a pending user):', profileError)
  }

  revalidatePath('/admin/users')
}

export async function addAgent(formData: FormData) {
  const email = formData.get('email') as string
  const role = (formData.get('role') as string) || 'agent'
  if (!email) return

  const supabase = await createClient()

  // 0. Verify Auth & Admin Role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, last_organization_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' || !profile.last_organization_id) {
    throw new Error('Forbidden: Admins only')
  }

  const { error } = await supabase.from('profile_access').insert({ 
    email, 
    role,
    status: 'activated',
    organization_id: profile.last_organization_id
  })
  
  if (error) {
    console.error('Failed to add agent:', error)
    throw new Error('Failed to add agent')
  } else {
    revalidatePath('/admin/users')
  }
}

export async function getCurrentProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}
