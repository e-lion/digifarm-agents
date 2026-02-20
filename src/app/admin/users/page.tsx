import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/layout/AdminLayout'
import { UsersView } from './UsersView'

export default async function UsersPage() {
  const supabase = await createClient()

  // Get current user to exclude self from basic profiles if needed
  const { data: { user } } = await supabase.auth.getUser()

  const { data: allProfilesData } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', user?.id)
    .order('full_name', { ascending: true })

  const allProfiles = allProfilesData || []

  // Fetch whitelisted emails (source of truth for access)
  const { data: accessList } = await supabase
    .from('profile_access')
    .select('*')
    .order('created_at', { ascending: false })

  const accessEntries = accessList || []
  
  // Create unified users list for Access Control
  const unifiedUsers = Array.isArray(accessEntries) ? accessEntries.map(access => {
    const profile = Array.isArray(allProfiles) ? allProfiles.find(p => p.email === access?.email) : null
    return {
      email: access?.email,
      role: access?.role,
      status: access?.status || 'activated',
      fullName: profile?.full_name || null,
      isRegistered: !!profile,
    }
  }) : []

  return (
    <AdminLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">User Access Control</h2>
        <p className="text-gray-500">Manage user access, roles, and whitelist new users.</p>
      </div>

      <UsersView unifiedUsers={unifiedUsers || []} />
    </AdminLayout>
  )
}
