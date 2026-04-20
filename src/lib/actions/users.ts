'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getProfile } from '@/lib/auth/get-profile'
import { agentSchema } from '../validations/schemas'
import { z } from 'zod'

export async function toggleAccess(email: string, currentStatus: 'activated' | 'deactivated') {
  const supabase = await createClient()

  // 0. Verify Auth & Admin Role
  const { user, profile } = await getProfile()
  if (!user) {
    throw new Error('Unauthorized')
  }

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
  
  // 0. Validate Input
  const validated = agentSchema.safeParse({ email, role })
  if (!validated.success) {
    throw new Error(validated.error.issues[0].message)
  }

  const supabase = await createClient()

  // 0. Verify Auth & Admin Role
  const { user, profile } = await getProfile()
  if (!user) {
    throw new Error('Unauthorized')
  }

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
  const { profile } = await getProfile()
  return profile
}

export async function toggleAgentVisibility(agentId: string, currentHidden: boolean) {
  const supabase = await createClient()

  // 0. Verify Auth & Admin Role
  const { user, profile } = await getProfile()
  if (!user) {
    throw new Error('Unauthorized')
  }

  if (profile?.role !== 'admin' || !profile.last_organization_id) {
    throw new Error('Forbidden: Admins only')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ hidden: !Boolean(currentHidden) })
    .eq('id', agentId)

  if (error) {
    console.error('SUPABASE ERROR in toggleAgentVisibility:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    throw new Error(`Failed to update visibility: ${error.message}`)
  }

  revalidatePath('/admin/agents')
}
