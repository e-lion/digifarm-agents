'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth/get-profile'

export async function createOrganization(formData: FormData) {
  const name = formData.get('name') as string
  const slug = formData.get('slug') as string

  if (!name || !slug) {
    throw new Error('Name and slug are required')
  }

  const supabase = await createClient()
  const { user } = await getProfile()

  if (!user) throw new Error('Unauthorized')

  // 1. Create the organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      owner_id: user.id
    })
    .select()
    .single()

  if (orgError) {
    console.error('Error creating organization:', orgError)
    throw new Error(orgError.message)
  }

  // 2. Add the creator as an 'owner'
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'owner'
    })

  if (memberError) throw new Error('Failed to join organization')

  // 3. Update profile's last_organization_id
  await supabase
    .from('profiles')
    .update({ 
      last_organization_id: org.id,
      role: 'admin' // Ensure the owner has admin access in the UI for now
    })
    .eq('id', user.id)

  revalidatePath('/')
  return { success: true }
}

export async function switchOrganization(orgId: string) {
  const supabase = await createClient()
  const { user } = await getProfile()
  if (!user) throw new Error('Unauthorized')

  // Verify membership
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .single()

  if (!member) throw new Error('Not a member of this organization')

  await supabase
    .from('profiles')
    .update({ last_organization_id: orgId })
    .eq('id', user.id)

  revalidatePath('/')
  return { success: true }
}

export async function getOrganizationContext() {
  const supabase = await createClient()
  const { user, profile } = await getProfile()
  if (!user) return null

  // 1. Get all organization memberships
  // (Membership sync is handled by database triggers on signup and profile_access update)
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id, organizations(id, name, slug)')
    .eq('user_id', user.id)

  const allOrgs = (memberships || []).map(m => m.organizations as any).filter(Boolean)
  const currentOrg = allOrgs.find(o => o.id === profile?.last_organization_id) || null

  return { currentOrg, allOrgs, userRole: profile?.role || null }
}

export async function requireOrganization() {
  const { user, profile } = await getProfile()
  if (!user) redirect('/auth/login')

  if (!profile?.last_organization_id) {
    redirect('/org-setup')
  }

  return { 
    userId: user.id, 
    organizationId: profile.last_organization_id,
    role: profile.role
  }
}
