import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/layout/AdminLayout'
import { UsersView } from './UsersView'
import { getProfile } from '@/lib/auth/get-profile'

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string }>
}) {
  const { page = '1', query = '' } = await searchParams
  const supabase = await createClient()
  const pageSize = 10
  const currentPage = parseInt(page)
  const from = (currentPage - 1) * pageSize
  const to = from + pageSize - 1

  // Get current user and organization context
  const { profile } = await getProfile()

  if (!profile?.last_organization_id) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-gray-500">No organization selected.</div>
      </AdminLayout>
    )
  }

  // Fetch whitelisted emails with pagination, filtered by organization
  let accessQuery = supabase
    .from('profile_access')
    .select('*', { count: 'exact' })
    .eq('organization_id', profile.last_organization_id)

  if (query) {
    accessQuery = accessQuery.ilike('email', `%${query}%`)
  }

  const { data: accessList, count, error: accessError } = await accessQuery
    .order('created_at', { ascending: false })
    .range(from, to)

  if (accessError) {
    console.error('Error fetching access list:', accessError)
  }

  const accessEntries = accessList || []
  const emails = accessEntries.map(a => a.email).filter(Boolean)

  // Fetch ONLY profiles matching the emails on THIS page
  const { data: matchingProfiles } = await supabase
    .from('profiles')
    .select('*')
    .in('email', emails)

  const allProfiles = matchingProfiles || []
  
  // Create unified users list for Access Control
  const unifiedUsers = accessEntries.map(access => {
    const profile = allProfiles.find(p => p.email === access.email)
    return {
      email: access.email,
      role: access.role,
      status: access.status || 'activated',
      fullName: profile?.full_name || null,
      isRegistered: !!profile,
    }
  })

  return (
    <AdminLayout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">User Access Control</h2>
        <p className="text-gray-500">Manage user access, roles, and whitelist new users.</p>
      </div>

      <UsersView 
        unifiedUsers={unifiedUsers} 
        totalCount={count || 0}
        currentPage={currentPage}
        currentQuery={query}
      />
    </AdminLayout>
  )
}
