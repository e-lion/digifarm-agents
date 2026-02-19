'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleAccess(email: string, currentStatus: 'activated' | 'deactivated') {
  const supabase = await createClient()
  const newStatus = currentStatus === 'activated' ? 'deactivated' : 'activated'

  // Update profile_access (always exists for any entry in our unified list)
  const { error: accessError } = await supabase
    .from('profile_access')
    .update({ status: newStatus })
    .eq('email', email)

  if (accessError) {
    console.error('Failed to update profile_access status:', accessError)
    throw new Error('Failed to update access status')
  }

  // Also update profile if it exists
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ status: newStatus })
    .eq('email', email)

  if (profileError) {
    console.error('Note: Could not update profiles table (might be a pending user):', profileError)
  }

  revalidatePath('/admin/agents')
}

export async function addAgent(formData: FormData) {
  const email = formData.get('email') as string
  const role = (formData.get('role') as string) || 'agent'
  if (!email) return

  const supabase = await createClient()
  const { error } = await supabase.from('profile_access').insert({ 
    email, 
    role,
    status: 'activated'
  })
  
  if (error) {
    console.error('Failed to add agent:', error)
    throw new Error('Failed to add agent')
  } else {
    revalidatePath('/admin/agents')
  }
}
