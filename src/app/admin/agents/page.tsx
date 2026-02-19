import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/layout/AdminLayout'
import { AgentsView } from './AgentsView'

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const supabase = await createClient()
  const params = await searchParams
  
  // Default to today if no date provided
  const today = new Date().toISOString().split('T')[0]
  const startDate = params.startDate || today
  const endDate = params.endDate || today

  // Get current user to exclude self
  const { data: { user } } = await supabase.auth.getUser()

  const { data: allProfilesData } = await supabase
    .from('profiles')
    .select('*, visits(*)')
    .neq('id', user?.id) // Exclude current user
    .order('full_name', { ascending: true })

  const allProfiles = allProfilesData || []
  // Filter for performance view (allows 'agent' AND null roles)
  const agentProfiles = allProfiles.filter(p => p.role !== 'admin')

  // Fetch whitelisted emails (source of truth for access)
  const { data: accessList } = await supabase
    .from('profile_access')
    .select('*')
    .order('created_at', { ascending: false })

  const accessEntries = accessList || []

  // Calculate metrics for the selected date range
  const agentsWithMetrics = agentProfiles.map(agent => {
    // Filter visits for the selected date range
    const visits = agent.visits || []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dailyVisits = visits.filter((v: any) => {
        if (!v.scheduled_date) return false
        try {
            const visitDate = new Date(v.scheduled_date).toISOString().split('T')[0]
            return visitDate >= startDate && visitDate <= endDate
        } catch (e) {
            console.error('Error parsing date for visit:', v.id, e)
            return false
        }
    })

    const totalVisits = dailyVisits.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completedVisits = dailyVisits.filter((v: any) => v.status === 'completed').length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const verifiedVisits = dailyVisits.filter((v: any) => v.status === 'completed' && v.check_in_location).length
    const completionRate = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0
    
    return {
      ...agent,
      totalVisits,
      completedVisits,
      verifiedVisits,
      completionRate,
      visits: dailyVisits
    }
  })

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
      <div className="mb-8 flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Agent Performance</h2>
           <p className="text-gray-500">Overview of agent planned vs actual visits</p>
        </div>
      </div>

      <AgentsView 
        agentsWithMetrics={agentsWithMetrics} 
        unifiedUsers={unifiedUsers}
        startDate={startDate}
        endDate={endDate}
      />
    </AdminLayout>
  )
}
